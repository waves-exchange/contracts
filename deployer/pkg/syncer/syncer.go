package syncer

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/waves-exchange/contracts/deployer/pkg/branch"
	"github.com/waves-exchange/contracts/deployer/pkg/config"
	"github.com/waves-exchange/contracts/deployer/pkg/contract"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
	"golang.org/x/crypto/blake2b"
	"golang.org/x/sync/errgroup"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"io"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type compileCacheMap = map[string]func() (
	base64Script string, scriptBytes []byte, setScriptFee uint64, err error,
)

type Syncer struct {
	logger                            zerolog.Logger
	network                           config.Network
	networkByte                       proto.Scheme
	rawClient                         *client.Client
	clientMutex                       *sync.Mutex
	contractsFolder                   string
	contractModel                     contract.Model
	branch                            string
	branchModel                       branch.Model
	compareLpScriptAddress            proto.WavesAddress
	compareLpStableScriptAddress      proto.WavesAddress
	compareLpStableAddonScriptAddress proto.WavesAddress
	compileCache                      compileCacheMap
	mined                             *errgroup.Group
	feePrv                            crypto.SecretKey
	feePub                            crypto.PublicKey
}

const (
	lpRide            = "lp.ride"
	lpStableRide      = "lp_stable.ride"
	lpStableAddonRide = "lp_stable_addon.ride"
)

func NewSyncer(
	logger zerolog.Logger,
	network config.Network,
	node string,
	branch string,
	contractModel contract.Model,
	branchModel branch.Model,
	compareLpScriptAddress, compareLpStableScriptAddress, compareLpStableAddonScriptAddress string,
	feeSeed string,
) (*Syncer, error) {
	cl, err := client.NewClient(
		client.Options{BaseUrl: node, Client: &http.Client{Timeout: time.Minute}},
	)
	if err != nil {
		return nil, fmt.Errorf("client.NewClient: %w", err)
	}

	compareLpScriptAddr, err := proto.NewAddressFromString(compareLpScriptAddress)
	if err != nil {
		return nil, fmt.Errorf("proto.NewAddressFromString: %w", err)
	}
	compareLpStableScriptAddr, err := proto.NewAddressFromString(compareLpStableScriptAddress)
	if err != nil {
		return nil, fmt.Errorf("proto.NewAddressFromString: %w", err)
	}
	compareLpStableAddonScriptAddr, err := proto.NewAddressFromString(compareLpStableAddonScriptAddress)
	if err != nil {
		return nil, fmt.Errorf("proto.NewAddressFromString: %w", err)
	}

	feePrv, feePub, err := getPrivateAndPublicKey([]byte(feeSeed))
	if err != nil {
		return nil, fmt.Errorf("crypto.GenerateKeyPair: %w", err)
	}

	var networkByte proto.Scheme
	switch network {
	case config.Testnet:
		networkByte = proto.TestNetScheme
	case config.Mainnet:
		networkByte = proto.MainNetScheme
	default:
		return nil, fmt.Errorf("unknown network: %s", network)
	}

	return &Syncer{
		logger:                            logger,
		network:                           network,
		networkByte:                       networkByte,
		rawClient:                         cl,
		clientMutex:                       &sync.Mutex{},
		contractsFolder:                   path.Join("..", "ride"),
		contractModel:                     contractModel,
		branch:                            branch,
		branchModel:                       branchModel,
		compareLpScriptAddress:            compareLpScriptAddr,
		compareLpStableScriptAddress:      compareLpStableScriptAddr,
		compareLpStableAddonScriptAddress: compareLpStableAddonScriptAddr,
		compileCache:                      make(compileCacheMap),
		mined:                             &errgroup.Group{},
		feePrv:                            feePrv,
		feePub:                            feePub,
	}, nil
}

func (s *Syncer) ApplyChanges(c context.Context) error {
	ctx, cancel := context.WithTimeout(c, 8*time.Hour)
	defer cancel()

	branchTestnet, err := s.branchModel.GetTestnetBranch(ctx)
	if err != nil {
		return fmt.Errorf("s.branchModel.GetTestnetBranch: %w", err)
	}

	contracts, err := s.contractModel.GetAll(ctx)
	if err != nil {
		return fmt.Errorf("s.contractModel.GetAll: %w", err)
	}

	factory, err := findFactory(contracts)
	if err != nil {
		return fmt.Errorf("findFactory: %w", err)
	}

	factoryPub, err := crypto.NewPublicKeyFromBase58(factory.BasePub)
	if err != nil {
		return fmt.Errorf("crypto.NewPublicKeyFromBase58: %w", err)
	}

	factoryAddr, err := proto.NewAddressFromPublicKey(s.networkByte, factoryPub)
	if err != nil {
		return fmt.Errorf("proto.NewAddressFromPublicKey: %w", err)
	}

	err = s.saveToDocs(ctx, factoryAddr, contracts, branchTestnet)
	if err != nil {
		return fmt.Errorf("s.saveToDocs: %w", err)
	}

	if s.network == config.Testnet {
		if branchTestnet != s.branch {
			s.logger.Info().Msgf(
				"nothing to do: branch for '%s' network is '%s', but current branch is '%s'",
				config.Testnet,
				branchTestnet,
				s.branch,
			)
			return nil
		}

		s.logger.Info().Msgf(
			"syncer start: branch for '%s' network is '%s' and current branch is '%s'",
			config.Testnet,
			branchTestnet,
			s.branch,
		)
	} else if s.network == config.Mainnet {
		s.logger.Info().Msgf(
			"syncer start: branch for '%s' network is '%s' and current branch is '%s'",
			config.Mainnet,
			"main",
			s.branch,
		)
	} else {
		return errors.New("unknown network=" + string(s.network))
	}

	files, err := os.ReadDir(s.contractsFolder)
	if err != nil {
		return fmt.Errorf("os.ReadDir: %w", err)
	}

	const (
		keyAllowedLpScriptHash            = "%s__allowedLpScriptHash"
		keyAllowedLpStableScriptHash      = "%s__allowedLpStableScriptHash"
		keyAllowedLpStableAddonScriptHash = "%s__allowedLpStableAddonScriptHash"
	)

	mainnetLpHashEmpty, err := s.doHash(
		ctx,
		factory,
		lpRide,
		keyAllowedLpScriptHash,
		s.compareLpScriptAddress,
	)
	if err != nil {
		return fmt.Errorf("s.doHash: %w", err)
	}
	mainnetLpStableHashEmpty, err := s.doHash(
		ctx,
		factory,
		lpStableRide,
		keyAllowedLpStableScriptHash,
		s.compareLpStableScriptAddress,
	)
	if err != nil {
		return fmt.Errorf("s.doHash: %w", err)
	}
	mainnetLpStableAddonHashEmpty, err := s.doHash(
		ctx,
		factory,
		lpStableAddonRide,
		keyAllowedLpStableAddonScriptHash,
		s.compareLpStableAddonScriptAddress,
	)
	if err != nil {
		return fmt.Errorf("s.doHash: %w", err)
	}

	for _, fl := range files {
		_, er := s.doFile(
			ctx,
			fl.Name(),
			contracts,
			mainnetLpHashEmpty,
			mainnetLpStableHashEmpty,
			mainnetLpStableAddonHashEmpty,
			true,
		)
		if er != nil {
			return fmt.Errorf("s.doFile: %w", er)
		}
	}

	s.logger.Info().Msg("waiting transactions is being mined...")
	err = s.mined.Wait()
	if err != nil {
		return fmt.Errorf("s.mined.Wait: %w", err)
	}

	s.logger.Info().Msg("changes applied")

	return nil
}

func (s *Syncer) saveToDocs(
	ctx context.Context,
	factoryAddress proto.WavesAddress,
	contracts []contract.Contract,
	branchTestnet string,
) error {
	var (
		branch string
		url    string
		suffix string
	)
	if s.network == config.Testnet {
		branch = branchTestnet
		url = "https://testnet.wx.network"
		suffix = "?network=testnet"
	} else if s.network == config.Mainnet {
		branch = "main"
		url = "https://wx.network"
	} else {
		return errors.New("unknown network=" + string(s.network))
	}

	var rowsContracts string
	assetsMap := map[string]struct{}{}
	var poolLpAssets []*client.AssetsDetail
	for _, cont := range contracts {
		if s.network == config.Testnet && cont.Stage != 1 {
			continue
		}

		pub, err := crypto.NewPublicKeyFromBase58(cont.BasePub)
		if err != nil {
			return fmt.Errorf("crypto.NewPublicKeyFromBase58: %w", err)
		}

		addr, err := proto.NewAddressFromPublicKey(s.networkByte, pub)
		if err != nil {
			return fmt.Errorf("proto.NewAddressFromPublicKey: %w", err)
		}
		rowsContracts += fmt.Sprintf(
			"%s | [`%s`](https://wavesexplorer.com/addresses/%[2]s%s) | `%s` | [%s](https://github.com/waves-exchange/contracts/blob/%s/ride/%[4]s) \n",
			cont.Tag,
			addr.String(),
			suffix,
			pub.String(),
			cont.File,
			branch,
		)

		if cont.File == "lp.ride" || cont.File == "lp_stable.ride" {
			lp, amountAsset, priceAsset, e := s.getPoolConfig(ctx, factoryAddress, addr)
			if e != nil {
				return fmt.Errorf("s.getPoolConfig: %w", e)
			}
			assetsMap[amountAsset] = struct{}{}
			assetsMap[priceAsset] = struct{}{}

			lpAsset, e := proto.NewOptionalAssetFromString(lp)
			if e != nil {
				return fmt.Errorf("proto.NewOptionalAssetFromString: %w", e)
			}
			if !lpAsset.Present {
				return errors.New("no assetId=" + lp)
			}

			lpDetails, _, e := s.client().Assets.Details(ctx, *lpAsset.ToDigest())
			if e != nil {
				return fmt.Errorf("s.client().Assets.Details: %w", e)
			}

			poolLpAssets = append(poolLpAssets, lpDetails)
		}
	}

	var assets []*client.AssetsDetail
	for a := range assetsMap {
		if a == "WAVES" {
			continue
		}

		asset, e := proto.NewOptionalAssetFromString(a)
		if e != nil {
			return fmt.Errorf("proto.NewOptionalAssetFromString: %w", e)
		}
		if !asset.Present {
			return errors.New("no assetId=" + a)
		}

		assetsDetails, _, e := s.client().Assets.Details(ctx, *asset.ToDigest())
		if e != nil {
			return fmt.Errorf("s.client().Assets.Details: %w", e)
		}

		assets = append(assets, assetsDetails)
	}

	md := fmt.Sprintf(`# %s environment
[**%s**](https://github.com/waves-exchange/contracts/tree/%[2]s) branch deployed to **%s** network at **%s** to **%s**

## Contracts
| Name | Address | Public key | Code |
|------|---------|------------|------|
%s
## Pool assets
| Name | AssetID | Description |
|------|---------|-------------|
%s
## Pool LP assets
| Name | AssetID | Description |
|------|---------|-------------|
%s`, cases.Title(language.English).String(string(s.network)),
		branch,
		s.network,
		time.Now().Format("15:04 02.01.2006"),
		url,
		rowsContracts,
		sortAndConcat(assets, suffix),
		sortAndConcat(poolLpAssets, suffix),
	)

	f, err := os.OpenFile(path.Join("..", "docs", string(s.network)+".md"), os.O_RDWR, 0)
	if err != nil {
		return fmt.Errorf("os.Open: %w", err)
	}

	_, err = f.Write([]byte(md))
	if err != nil {
		return fmt.Errorf("f.Write: %w", err)
	}

	return nil
}

func (s *Syncer) getPoolConfig(ctx context.Context, factory, poolAddress proto.WavesAddress) (string, string, string, error) {
	type eval struct {
		Expr string `json:"expr"`
	}

	b, err := json.Marshal(eval{Expr: fmt.Sprintf(`getPoolConfigREADONLY("%s")`, poolAddress)})
	if err != nil {
		return "", "", "", fmt.Errorf("json.Marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("%s/utils/script/evaluate/%s", s.rawClient.GetOptions().BaseUrl, factory),
		bytes.NewReader(b),
	)
	if err != nil {
		return "", "", "", fmt.Errorf("http.NewRequestWithContext: %w", err)
	}

	type evalRes struct {
		Result struct {
			Type  string `json:"type"`
			Value struct {
				Num1 struct {
					Type  string `json:"type"`
					Value []any  `json:"value"`
				} `json:"_1"`
				Num2 struct {
					Type  string `json:"type"`
					Value []struct {
						Type  string `json:"type"`
						Value string `json:"value"`
					} `json:"value"`
				} `json:"_2"`
			} `json:"value"`
		} `json:"result"`
		Complexity   int `json:"complexity"`
		StateChanges struct {
			Data         []any `json:"data"`
			Transfers    []any `json:"transfers"`
			Issues       []any `json:"issues"`
			Reissues     []any `json:"reissues"`
			Burns        []any `json:"burns"`
			SponsorFees  []any `json:"sponsorFees"`
			Leases       []any `json:"leases"`
			LeaseCancels []any `json:"leaseCancels"`
			Invokes      []any `json:"invokes"`
		} `json:"stateChanges"`
		Expr    string `json:"expr"`
		Address string `json:"address"`
	}
	res := evalRes{}
	_, err = s.client().Do(ctx, req, &res)
	if err != nil {
		return "", "", "", fmt.Errorf("s.client().Do: %w", err)
	}

	lp := res.Result.Value.Num2.Value[3].Value
	amountAsset := res.Result.Value.Num2.Value[4].Value
	priceAsset := res.Result.Value.Num2.Value[5].Value
	return lp, amountAsset, priceAsset, nil
}

func (s *Syncer) ensureHasFee(ctx context.Context, to proto.WavesAddress, fee uint64, fileName string) error {
	bal, _, err := s.client().Addresses.Balance(ctx, to)
	if err != nil {
		return fmt.Errorf("s.client().Addresses.Balance: %w", err)
	}

	const twoWaves = 2 * 100000000
	amountToSend := twoWaves + fee
	if bal.Balance < amountToSend {
		e := s.sendTx(
			ctx,
			proto.NewUnsignedTransferWithProofs(
				3,
				s.feePub,
				proto.NewOptionalAssetWaves(),
				proto.NewOptionalAssetWaves(),
				timestamp(),
				amountToSend,
				100000,
				proto.NewRecipientFromAddress(to),
				nil,
			),
			s.feePrv,
			false,
			false,
			fileName,
		)
		if e != nil {
			return fmt.Errorf("s.sendTx: %w", e)
		}

		s.logger.Info().
			Str("address", to.String()).
			Uint64("amount", amountToSend).
			Uint64("balanceBefore", bal.Balance).
			Uint64("balanceAfter", bal.Balance+amountToSend).
			Msg("WAVES to address was sent")
	}

	return nil
}

func (s *Syncer) doHash(
	ctx context.Context,
	factory contract.Contract,
	fileName string,
	key string,
	compareAddress proto.WavesAddress,
) (
	bool,
	error,
) {
	f, err := os.Open(path.Join(s.contractsFolder, fileName))
	if err != nil {
		return false, fmt.Errorf("os.Open: %w", err)
	}
	defer func() {
		_ = f.Close()
	}()

	bodyLpRide, err := io.ReadAll(f)
	if err != nil {
		return false, fmt.Errorf("io.ReadAll: %w", err)
	}

	compact, err := s.contractModel.IsCompact(ctx, fileName)
	if err != nil {
		return false, fmt.Errorf("s.contractModel.IsCompact: %w", err)
	}

	scriptBase64, scriptBytes, _, err := s.compile(ctx, bodyLpRide, compact)
	if err != nil {
		return false, fmt.Errorf("s.compile: %w", err)
	}

	lpRideHash := blake2b.Sum256(scriptBytes)
	if err != nil {
		return false, fmt.Errorf("blake2b.New256: %w", err)
	}

	newHashStr := base64.StdEncoding.EncodeToString(lpRideHash[:])

	dataTxValue := &proto.StringDataEntry{
		Key:   key,
		Value: newHashStr,
	}

	var hashEmpty bool

	pub, er2 := crypto.NewPublicKeyFromBase58(factory.BasePub)
	if er2 != nil {
		return false, fmt.Errorf("crypto.NewPublicKeyFromBase58: %w", er2)
	}

	switch s.network {
	case config.Testnet:
		prvSigner, er := crypto.NewSecretKeyFromBase58(factory.SignerPrv)
		if er != nil {
			return false, fmt.Errorf("crypto.NewSecretKeyFromBase58: %w", er)
		}

		dataTx := proto.NewUnsignedDataWithProofs(2, pub, 500000, timestamp())
		er = dataTx.AppendEntry(dataTxValue)
		if er != nil {
			return false, fmt.Errorf("dataTx.AppendEntry: %w", er)
		}

		addr, er := proto.NewAddressFromPublicKey(proto.TestNetScheme, pub)
		if er != nil {
			return false, fmt.Errorf("proto.NewAddressFromPublicKey: %w", er)
		}

		actualHash, er := s.getStringValue(ctx, addr, key)
		if er != nil {
			return false, fmt.Errorf("s.getStringValue: %w", er)
		}

		if actualHash != newHashStr {
			e := s.sendTx(ctx, dataTx, prvSigner, false, true, fileName)
			if e != nil {
				return false, fmt.Errorf("sendTx %s: %w", fileName, e)
			}

			s.logger.Info().
				Str("file", fileName).
				Str("actualHash", actualHash).
				Str("newHash", newHashStr).
				Msg("factory_v2 AllowedLpScriptHash data-tx done")
		} else {
			s.logger.Info().
				Str("file", fileName).
				Str("actualHash", actualHash).
				Str("newHash", newHashStr).
				Msg("factory_v2 AllowedLpScriptHash data-tx not needed")
		}

	case config.Mainnet:
		addr, er := proto.NewAddressFromPublicKey(proto.MainNetScheme, pub)
		if er != nil {
			return false, fmt.Errorf("proto.NewAddressFromPublicKey: %w", er)
		}

		actualHash, er := s.getStringValue(ctx, addr, key)
		if er != nil {
			return false, fmt.Errorf("s.getStringValue: %w", er)
		}

		hashEmpty = actualHash == ""

		const fee = 500000
		dataTx := proto.NewUnsignedDataWithProofs(2, pub, fee, timestamp())
		er = dataTx.AppendEntry(dataTxValue)
		if er != nil {
			return false, fmt.Errorf("dataTx.AppendEntry: %w", er)
		}

		log := func() *zerolog.Event {
			return s.logger.Info().
				Str("file", fileName).
				Str("actualHash", actualHash).
				Str("newHash", newHashStr).
				Str("key", key)
		}

		if actualHash != newHashStr {
			tx, e := json.Marshal(dataTx)
			if e != nil {
				return false, fmt.Errorf("json.Marshal: %w", e)
			}

			blockchainBase64, e := s.getScript(ctx, compareAddress)
			if e != nil {
				return false, fmt.Errorf("s.getScript: %w", e)
			}

			s.logger.Info().
				Str("address", compareAddress.String()).
				Str("file", fileName).
				Str("left", "blockchain").
				Str("right", "local").
				Msg("print diff")
			e = s.printDiff(ctx, fileName, blockchainBase64, scriptBase64)
			if e != nil {
				return false, fmt.Errorf("s.printDiff: %w", e)
			}

			e = s.ensureHasFee(ctx, addr, fee, fileName)
			if e != nil {
				return false, fmt.Errorf("s.ensureHasFee: %w", e)
			}

			log().RawJSON("tx", tx).
				Msg("we are about to set script as approved. " +
					"sign and broadcast data-tx to continue")

			//for {
			//	value, er3 := s.getStringValue(ctx, addr, key)
			//	if er3 != nil {
			//		return false, fmt.Errorf("s.getStringValue: %w", er3)
			//	}
			//	if value == newHashStr {
			//		const blocks = 2
			//		log().Msgf("data-tx done, wait %d blocks", blocks)
			//		er4 := s.waitNBlocks(ctx, blocks)
			//		if er4 != nil {
			//			return false, fmt.Errorf("s.waitNBlocks: %w", er4)
			//		}
			//		break
			//	}
			//
			//	time.Sleep(5 * time.Second)
			//	log().RawJSON("tx", tx).Msg("sign data-tx. polling factory state...")
			//}
		} else {
			s.logger.Info().Str("file", fileName).Str("key", key).Msg("content is the same, " +
				"no need to update allowed script hash")
		}
	}

	return hashEmpty, nil
}

func (s *Syncer) waitNBlocks(ctx context.Context, blocks uint64) error {
	currentHeight, _, err := s.client().Blocks.Height(ctx)
	if err != nil {
		return fmt.Errorf("client.Blocks.Height: %w", err)
	}
	curH := currentHeight.Height
	desiredH := curH + blocks

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			time.Sleep(5 * time.Second)

			height, _, e := s.client().Blocks.Height(ctx)
			if e != nil {
				return fmt.Errorf("client.Blocks.Height: %w", e)
			}
			h := height.Height

			if h >= desiredH {
				s.logger.Info().Uint64("actual", h).Uint64("desired", desiredH).Msg("height reached")
				return nil
			}

			s.logger.Info().Uint64("actual", h).Uint64("desired", desiredH).Msg("waiting for height...")
		}
	}
}

func (s *Syncer) getStringValue(ctx context.Context, address proto.WavesAddress, key string) (string, error) {
	data, _, err := s.client().Addresses.AddressesDataKey(ctx, address, key)
	if err != nil {
		if strings.Contains(err.Error(), "no data for this key") {
			return "", nil
		}

		return "", fmt.Errorf("s.client().Addresses.AddressesDataKey: %w", err)
	}

	const invalidType = "data is not StringDataEntry: address: %s key: %s"
	if data.GetValueType() == proto.DataString {
		res, ok := data.(*proto.StringDataEntry)
		if !ok {
			return "", fmt.Errorf(invalidType, address.String(), key)
		}
		return res.Value, nil
	}

	return "", fmt.Errorf(invalidType, address.String(), key)
}

func (s *Syncer) doFile(
	ctx context.Context,
	fileName string,
	contracts []contract.Contract,
	mainnetLpHashEmpty, mainnetLpStableHashEmpty, mainnetLpStableAddonHashEmpty bool,
	logSkip bool,
) (
	bool,
	error,
) {
	isChanged := false
	const (
		changed    = "contract changed"
		notChanged = "contract didn't changed"
		action     = "action"
		skip       = "skip"
		deployed   = "deployed"
		sign       = "sign"
		addressStr = "address"
		fileStr    = "file"
		tag        = "tag"
	)

	f, err := os.Open(path.Join(s.contractsFolder, fileName))
	if err != nil {
		return false, fmt.Errorf("os.Open: %w", err)
	}
	defer func() {
		_ = f.Close()
	}()

	body, err := io.ReadAll(f)
	if err != nil {
		return false, fmt.Errorf("io.ReadAll: %w", err)
	}

	iTx := 0
	for _, cont := range contracts {
		if fileName != cont.File {
			continue
		}

		switch s.network {
		case config.Testnet:
			l := s.logger.Info().
				Str(fileStr, fileName).
				Str(tag, cont.Tag).
				Str(action, skip)
			if cont.BasePrv == "" {
				l.Msg("no private key in config")
				continue
			}
			if cont.SignerPrv == "" {
				l.Msg("no signer private key in config")
				continue
			}

			base64Script, scriptBytes, setScriptFee, er2 := s.compile(ctx, body, cont.Compact)
			if er2 != nil {
				return false, fmt.Errorf("s.compile: %w", er2)
			}

			prv, er2 := crypto.NewSecretKeyFromBase58(cont.BasePrv)
			if er2 != nil {
				return false, fmt.Errorf("crypto.NewSecretKeyFromBase58: %w", er2)
			}

			pub := crypto.GeneratePublicKey(prv)

			prvSigner, er2 := crypto.NewSecretKeyFromBase58(cont.SignerPrv)
			if er2 != nil {
				return false, fmt.Errorf("crypto.NewSecretKeyFromBase58: %w", er2)
			}

			addr, er2 := proto.NewAddressFromPublicKey(proto.TestNetScheme, pub)
			if er2 != nil {
				return false, fmt.Errorf("proto.NewAddressFromPublicKey: %w", er2)
			}

			fromBlockchainScript, er2 := s.getScript(ctx, addr)
			if er2 != nil {
				return false, fmt.Errorf("s.getScript: %w", er2)
			}

			log := s.logger.Info().
				Str(fileStr, fileName).
				Str(addressStr, addr.String()).
				Str(tag, cont.Tag)

			if base64Script == fromBlockchainScript {
				if logSkip {
					log.Str(action, skip).Msg(notChanged)
				}
				continue
			}

			er2 = s.ensureHasFee(ctx, addr, setScriptFee, fileName)
			if er2 != nil {
				return false, fmt.Errorf("s.ensureHasFee: %w", er2)
			}

			er2 = s.sendTx(
				ctx,
				proto.NewUnsignedSetScriptWithProofs(
					2,
					proto.TestNetScheme,
					pub,
					scriptBytes,
					setScriptFee,
					timestamp(),
				),
				prvSigner,
				true,
				true,
				fileName,
			)
			if er2 != nil {
				return false, fmt.Errorf(
					"file: %s address: %s s.sendTx: %w",
					fileName,
					addr.String(),
					er2,
				)
			}

			isChanged = true
			log.Str(action, deployed).Msg(changed)
			continue

		case config.Mainnet:
			base64Script, scriptBytes, setScriptFee, er2 := s.compile(ctx, body, cont.Compact)
			if er2 != nil {
				return false, fmt.Errorf("s.compile: %w", er2)
			}

			pub, er2 := crypto.NewPublicKeyFromBase58(cont.BasePub)
			if er2 != nil {
				return false, fmt.Errorf("crypto.NewPublicKeyFromBase58: %w", er2)
			}

			addr, er2 := proto.NewAddressFromPublicKey(proto.MainNetScheme, pub)
			if er2 != nil {
				return false, fmt.Errorf("proto.NewAddressFromPublicKey: %w", er2)
			}

			fromBlockchainScript, er2 := s.getScript(ctx, addr)
			if er2 != nil {
				return false, fmt.Errorf("s.getScript: %w", er2)
			}

			log := func() *zerolog.Event {
				return s.logger.Info().
					Str(fileStr, fileName).
					Str(addressStr, addr.String()).
					Str(tag, cont.Tag)
			}

			if base64Script == fromBlockchainScript {
				if logSkip {
					log().Str(action, skip).Msg(notChanged)
				}
				continue
			}

			unsignedSetScriptTx := proto.NewUnsignedSetScriptWithProofs(
				2,
				proto.MainNetScheme,
				pub,
				scriptBytes,
				setScriptFee,
				timestamp(),
			)
			//doLpRide := cont.File == lpRide && !mainnetLpHashEmpty
			//doLpStableRide := cont.File == lpStableRide && !mainnetLpStableHashEmpty
			//doLpStableAddonRide := cont.File == lpStableAddonRide && !mainnetLpStableAddonHashEmpty
			//if doLpRide || doLpStableRide || doLpStableAddonRide {
			//	er := s.sendTx(
			//		ctx,
			//		unsignedSetScriptTx,
			//		crypto.SecretKey{},
			//		true,
			//		true,
			//		fileName,
			//	)
			//	if er != nil {
			//		return false, fmt.Errorf("s.sendTx %s: %w", cont.File, er)
			//	}
			//
			//	isChanged = true
			//	log().Str(action, deployed).Msg(changed)
			//} else {
			setScriptTx, er := json.Marshal(unsignedSetScriptTx)
			if er != nil {
				return false, fmt.Errorf("s.sendTx: %w", er)
			}

			er = s.ensureHasFee(ctx, addr, setScriptFee, fileName)
			if er != nil {
				return false, fmt.Errorf("s.ensureHasFee: %w", er)
			}

			isChanged = true
			log().Str(action, sign).RawJSON("tx", setScriptTx).Msg(changed)
			er = s.printDiff(ctx, fileName, fromBlockchainScript, base64Script)
			if er != nil {
				return false, fmt.Errorf("s.printDiff: %w", er)
			}

			iTx += 1
			file, er := os.Create(
				path.Join(
					"..",
					".github",
					"artifacts",
					"txs",
					fmt.Sprintf(
						"%s_%s.json",
						stringIndex(iTx),
						strings.ReplaceAll(strings.ReplaceAll(cont.Tag, " ", "_"), "/", "_"),
					),
				))
			if er != nil {
				return false, fmt.Errorf("os.Create: %w", er)
			}

			_, er = file.Write(setScriptTx)
			if er != nil {
				return false, fmt.Errorf("file.Write: %w", er)
			}
			//}

			continue
		}
	}
	return isChanged, nil
}

func (s *Syncer) preparePathAndScript(ctx context.Context, fileName, base64Script string) (string, error) {
	var script string
	if base64Script != "" {
		scr, err := s.apiDecompileScript(ctx, strings.NewReader(base64Script))
		if err != nil {
			return "", fmt.Errorf("s.apiDecompileScript: %w", err)
		}
		script = scr
	}

	u, err := uuid.NewRandom()
	if err != nil {
		return "", fmt.Errorf("uuid.NewRandom: %w", err)
	}

	p := path.Join("tmp", fileName+" "+u.String())

	f, err := os.Create(p)
	if err != nil {
		return "", fmt.Errorf("os.Create: %w", err)
	}

	_, err = f.Write([]byte(script))
	if err != nil {
		return "", fmt.Errorf("file1.Write: %w", err)
	}

	return p, nil
}

func (s *Syncer) printDiff(ctx context.Context, fileName, base64Str1, base64Str2 string) error {
	path1, err := s.preparePathAndScript(ctx, fileName, base64Str1)
	defer func() {
		_ = os.Remove(path1)
	}()
	if err != nil {
		return fmt.Errorf("s.preparePathAndScript: %w", err)
	}

	path2, err := s.preparePathAndScript(ctx, fileName, base64Str2)
	defer func() {
		_ = os.Remove(path2)
	}()
	if err != nil {
		return fmt.Errorf("s.preparePathAndScript: %w", err)
	}

	cmd := exec.Command(
		"git",
		"--no-pager",
		"diff",
		"--color",
		"--no-index",
		path1,
		path2,
	)
	fmt.Println(cmd.String())
	stdout, _ := cmd.Output()

	fmt.Println(string(stdout))
	return nil
}

func (s *Syncer) waitMined(ctx context.Context, txHash crypto.Digest) error {
	try := 0
	for {
		try += 1
		_, _, err := s.client().Transactions.Info(ctx, txHash)
		if err == nil {
			return nil
		}
		if try >= 100 {
			return fmt.Errorf("testnetClient.Transactions.Info: %w", err)
		}
		time.Sleep(10 * time.Second)
	}
}

func (s *Syncer) sendTx(
	ctx context.Context,
	tx proto.Transaction,
	prv crypto.SecretKey,
	async bool,
	ensureFee bool,
	fileName string,
) error {
	_, err := tx.Validate(s.networkByte)
	if err != nil {
		return fmt.Errorf("tx.Validate: %w", err)
	}

	err = tx.Sign(s.networkByte, prv)
	if err != nil {
		return fmt.Errorf("tx.Sign: %w", err)
	}

	txHashBytes, err := tx.GetID(s.networkByte)
	if err != nil {
		return fmt.Errorf("tx.GetID: %w", err)
	}

	txHash, err := crypto.NewDigestFromBytes(txHashBytes)
	if err != nil {
		return fmt.Errorf("crypto.NewDigestFromBytes: %w", err)
	}

	fn := func() error {
		sender, e := tx.GetSender(s.networkByte)
		if e != nil {
			return fmt.Errorf("tx.GetSender: %w", e)
		}

		senderAddr, e := sender.ToWavesAddress(s.networkByte)
		if e != nil {
			return fmt.Errorf("sender.ToWavesAddress: %w", e)
		}

		if ensureFee {
			e = s.ensureHasFee(ctx, senderAddr, tx.GetFee(), fileName)
			if e != nil {
				return fmt.Errorf("s.ensureHasFee: %w", e)
			}
		}

		_, e = s.client().Transactions.Broadcast(ctx, tx)
		if e != nil {
			return fmt.Errorf("s.client().Transactions.Broadcast (file: %s, sender: %s): %w", fileName, senderAddr.String(), e)
		}

		e = s.waitMined(ctx, txHash)
		if e != nil {
			return fmt.Errorf("waitMined: %w", e)
		}
		return nil
	}
	if async {
		s.mined.Go(fn)
	} else {
		err = fn()
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *Syncer) compileRaw(ctx context.Context, body []byte, compact bool) (string, error) {
	if compact {
		resp, err := s.apiCompactScript(ctx, bytes.NewReader(body))
		if err != nil {
			return "", fmt.Errorf("wavesApi.apiCompactScript: %w", err)
		}
		return resp, nil

	} else {
		sc, _, err := s.client().Utils.ScriptCompile(ctx, string(body))
		if err != nil {
			return "", fmt.Errorf("s.client().Utils.ScriptCompile: %w", err)
		}
		return sc.Script, nil
	}
}

func (s *Syncer) compile(ctx context.Context, body []byte, compact bool) (string, []byte, uint64, error) {
	key := base64.StdEncoding.EncodeToString(body) + strconv.FormatBool(compact)
	val, ok := s.compileCache[key]
	if ok {
		return val()
	}

	base64Script, err := s.compileRaw(ctx, body, compact)
	if err != nil {
		return "", nil, 0, fmt.Errorf("s.compileRaw: %w", err)
	}

	scriptBytes, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(base64Script, "base64:"))
	if err != nil {
		return "", nil, 0, fmt.Errorf("base64.StdEncoding.DecodeString: %w", err)
	}
	setScriptFee := calcSetScriptFee(scriptBytes)

	res := func() (string, []byte, uint64, error) {
		return base64Script, scriptBytes, setScriptFee, nil
	}
	s.compileCache[key] = res
	return res()
}

func (s *Syncer) getScript(ctx context.Context, addr proto.Address) (string, error) {
	type withScript struct {
		Script *string `json:"script"`
	}

	req, err := http.NewRequestWithContext(
		ctx, http.MethodGet,
		s.rawClient.GetOptions().BaseUrl+"/addresses/scriptInfo/"+addr.String(),
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("http.NewRequestWithContext: %w", err)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("http.DefaultClient.Do: %w", err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return "", fmt.Errorf("io.ReadAll: %w", err)
	}

	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("http.DefaultClient.Do status not 200, body: %s", string(body))
	}

	var info withScript
	err = json.Unmarshal(body, &info)
	if err != nil {
		return "", fmt.Errorf("json.Unmarshal: %w", err)
	}

	if info.Script == nil {
		return "", nil
	}

	return *info.Script, nil
}

func (s *Syncer) apiCompactScript(c context.Context, body io.Reader) (string, error) {
	u := fmt.Sprintf("%s/utils/script/compileCode?compact=true", s.rawClient.GetOptions().BaseUrl)

	req, err := http.NewRequestWithContext(c, http.MethodPost, u, body)
	if err != nil {
		return "", fmt.Errorf("http.NewRequestWithContext: %w", err)
	}
	req.Header.Add("Accept", "application/json")
	req.Header.Add("Content-Type", "text/plain")

	type CompileResult struct {
		Script               string
		Complexity           int
		VerifierComplexity   int
		CallableComplexities interface{}
		ExtraFee             int
	}

	var compileResult CompileResult
	_, err = s.client().Do(c, req, &compileResult)

	if err != nil {
		return "", fmt.Errorf("s.client().Do: %w", err)
	}

	return compileResult.Script, nil
}

func (s *Syncer) apiDecompileScript(c context.Context, body io.Reader) (string, error) {
	u := fmt.Sprintf("%s/utils/script/decompile", s.rawClient.GetOptions().BaseUrl)

	req, err := http.NewRequestWithContext(c, http.MethodPost, u, body)
	if err != nil {
		return "", fmt.Errorf("http.NewRequestWithContext: %w", err)
	}
	req.Header.Add("Accept", "application/json")
	req.Header.Add("Content-Type", "text/plain")

	type DecompileResult struct {
		Script string
	}

	var decompileResult DecompileResult
	_, err = s.client().Do(c, req, &decompileResult)

	if err != nil {
		return "", fmt.Errorf("s.client().Do: %w", err)
	}

	return decompileResult.Script, nil
}

func (s *Syncer) client() *client.Client {
	u := s.rawClient.GetOptions().BaseUrl
	if strings.Contains(u, "wx.network") ||
		strings.Contains(u, "waves.exchange") {
		return s.rawClient
	}

	s.clientMutex.Lock()
	defer s.clientMutex.Unlock()
	time.Sleep(2 * time.Second)
	return s.rawClient
}

func calcSetScriptFee(script []byte) uint64 {
	const min = 1300000
	base := uint64(100000)
	additional := uint64(400000)
	kb := math.Ceil(float64(len(script)) / float64(1000))
	res := uint64(kb)*base + additional
	if res < min {
		return min
	}
	return res
}

func timestamp() uint64 {
	return uint64(time.Now().UnixMilli())
}

func findFactory(conts []contract.Contract) (contract.Contract, error) {
	const (
		factoryRide = "factory_v2.ride"
		factoryTag  = "factory_v2"
	)

	for _, cont := range conts {
		if cont.File == factoryRide && cont.Tag == factoryTag {
			return cont, nil
		}
	}
	return contract.Contract{}, errors.New("factory not found")
}

func getPrivateAndPublicKey(seed []byte) (privateKey crypto.SecretKey, publicKey crypto.PublicKey, err error) {
	n := 0
	s := seed
	iv := make([]byte, 4)
	binary.BigEndian.PutUint32(iv, uint32(n))
	s = append(iv, s...)
	accSeed, err := crypto.SecureHash(s)
	if err != nil {
		return crypto.SecretKey{}, crypto.PublicKey{}, err
	}
	return crypto.GenerateKeyPair(accSeed[:])
}

func stringIndex(i int) string {
	if i < 10 {
		return "0" + strconv.Itoa(i)
	}
	return strconv.Itoa(i)
}

func dashIfEmpty(s string) string {
	if s == "" {
		return "—"
	}
	return s
}

func sortAndConcat(assets []*client.AssetsDetail, explorerSuffix string) string {
	sort.SliceStable(assets, func(i, j int) bool {
		return strings.ToLower(assets[i].Name) < strings.ToLower(assets[j].Name)
	})

	var res string
	for _, asset := range assets {
		res += fmt.Sprintf(
			"%s | [`%s`](https://wavesexplorer.com/assets/%[2]s%s) | %s \n",
			dashIfEmpty(asset.Name),
			asset.AssetId.String(),
			explorerSuffix,
			dashIfEmpty(asset.Description),
		)
	}
	return res
}
