package docs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/rs/zerolog"
	"github.com/waves-exchange/contracts/deployer/pkg/branch"
	"github.com/waves-exchange/contracts/deployer/pkg/config"
	"github.com/waves-exchange/contracts/deployer/pkg/contract"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"net/http"
	"os"
	"path"
	"sort"
	"strings"
	"time"
)

type cfg struct {
	branchModel    branch.Model
	contractsModel contract.Model
	client         *client.Client // TODO: make gowaves client with ratelimit as separate package
}

type Docs struct {
	logger  zerolog.Logger
	testnet cfg
	mainnet cfg
}

func NewDocs(
	logger zerolog.Logger,
	testnetBranch branch.Model,
	testnetContracts contract.Model,
	testnetNode string,
	mainnetBranch branch.Model,
	mainnetContracts contract.Model,
	mainnetNode string,
) (*Docs, error) {
	testnetClient, err := client.NewClient(client.Options{
		BaseUrl: testnetNode,
		Client:  &http.Client{Timeout: time.Minute},
	})
	if err != nil {
		return nil, fmt.Errorf("client.NewClient: %w", err)
	}

	mainnetClient, err := client.NewClient(client.Options{
		BaseUrl: mainnetNode,
		Client:  &http.Client{Timeout: time.Minute},
	})
	if err != nil {
		return nil, fmt.Errorf("client.NewClient: %w", err)
	}

	return &Docs{
		logger: logger.With().Str("pkg", "docs").Logger(),
		testnet: cfg{
			branchModel:    testnetBranch,
			contractsModel: testnetContracts,
			client:         testnetClient,
		},
		mainnet: cfg{
			branchModel:    mainnetBranch,
			contractsModel: mainnetContracts,
			client:         mainnetClient,
		},
	}, nil
}

func (d *Docs) Update(ctx context.Context) error {
	err := d.update(ctx, config.Testnet)
	if err != nil {
		return fmt.Errorf("d.update: %w", err)
	}

	err = d.update(ctx, config.Mainnet)
	if err != nil {
		return fmt.Errorf("d.update: %w", err)
	}

	d.logger.Info().Msg("docs updated locally, will commit only on non-main branch")
	return nil
}

func (d *Docs) getCfg(network config.Network) cfg {
	if network == config.Testnet {
		return d.testnet
	}
	return d.mainnet
}

func (d *Docs) update(
	ctx context.Context,
	network config.Network,
) error {
	var (
		factory     contract.Contract
		contracts   []contract.Contract
		brn         string
		url         string
		suffix      string
		networkByte byte
	)
	if network == config.Testnet {
		fct, err := d.testnet.contractsModel.GetFactory(ctx, nil)
		if err != nil {
			return fmt.Errorf("d.testnet.contractsModel.GetFactory: %w", err)
		}

		cnt, err := d.testnet.contractsModel.GetAll(ctx)
		if err != nil {
			return fmt.Errorf("d.testnet.contractsModel.GetAll: %w", err)
		}

		b, err := d.testnet.branchModel.GetTestnetBranch(ctx)
		if err != nil {
			return fmt.Errorf("d.testnet.branchModel.GetTestnetBranch: %w", err)
		}

		factory = fct
		contracts = cnt
		brn = b
		url = "https://testnet.wx.network"
		suffix = "?network=testnet"
		networkByte = proto.TestNetScheme
	} else if network == config.Mainnet {
		fct, err := d.mainnet.contractsModel.GetFactory(ctx, nil)
		if err != nil {
			return fmt.Errorf("d.testnet.contractsModel.GetFactory: %w", err)
		}

		cnt, err := d.mainnet.contractsModel.GetAll(ctx)
		if err != nil {
			return fmt.Errorf("d.testnet.contractsModel.GetAll: %w", err)
		}

		factory = fct
		contracts = cnt
		brn = "main"
		url = "https://wx.network"
		suffix = ""
		networkByte = proto.MainNetScheme
	} else {
		return errors.New("unknown network=" + string(network))
	}

	factoryPub, er := crypto.NewPublicKeyFromBase58(factory.BasePub)
	if er != nil {
		return fmt.Errorf("crypto.NewPublicKeyFromBase58: %w", er)
	}

	factoryAddress, er := proto.NewAddressFromPublicKey(networkByte, factoryPub)
	if er != nil {
		return fmt.Errorf("proto.NewAddressFromPublicKey: %w", er)
	}

	var rowsContracts string
	assetsMap := map[string]struct{}{}
	var poolLpAssets []*client.AssetsDetail
	for _, cont := range contracts {
		if network == config.Testnet && cont.Stage != 1 {
			continue
		}

		pub, err := crypto.NewPublicKeyFromBase58(cont.BasePub)
		if err != nil {
			return fmt.Errorf("crypto.NewPublicKeyFromBase58: %w", err)
		}

		addr, err := proto.NewAddressFromPublicKey(networkByte, pub)
		if err != nil {
			return fmt.Errorf("proto.NewAddressFromPublicKey: %w", err)
		}
		rowsContracts += fmt.Sprintf(
			"%s | [`%s`](https://wavesexplorer.com/addresses/%s%s) | `%s` | [%s](https://github.com/waves-exchange/contracts/blob/%s/ride/%s) \n",
			cont.Tag,
			addr.String(),
			addr.String(),
			suffix,
			pub.String(),
			cont.File,
			brn,
			cont.File,
		)

		if cont.File == "lp.ride" || cont.File == "lp_stable.ride" {
			lp, amountAsset, priceAsset, e := d.getPoolConfig(ctx, network, factoryAddress, addr)
			if e != nil {
				d.logger.Error().Err(fmt.Errorf("d.getPoolConfig: %w", e)).Send()
				continue
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

			lpDetails, _, e := d.getCfg(network).client.Assets.Details(ctx, *lpAsset.ToDigest())
			if e != nil {
				return fmt.Errorf("d.getCfg(network).client.Assets.Details: %w", e)
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

		assetsDetails, _, e := d.getCfg(network).client.Assets.Details(ctx, *asset.ToDigest())
		if e != nil {
			return fmt.Errorf("d.client().Assets.Details: %w", e)
		}

		assets = append(assets, assetsDetails)
	}

	loc, err := time.LoadLocation("Asia/Dubai")
	if err != nil {
		return fmt.Errorf("time.LoadLocation: %w", err)
	}

	md := fmt.Sprintf(`# %s environment
[**%s**](https://github.com/waves-exchange/contracts/tree/%[2]s) branch deployed to **%s** network to **%s**. Table updated at **%s**

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
%s`, cases.Title(language.English).String(string(network)),
		brn,
		network,
		url,
		time.Now().In(loc).Format("15:04 02.01.2006"),
		rowsContracts,
		sortAndConcat(assets, suffix),
		sortAndConcat(poolLpAssets, suffix),
	)

	filename := path.Join("..", "docs", string(network)+".md")
	err = os.Truncate(filename, 0)
	if err != nil {
		return fmt.Errorf("os.Truncate: %w", err)
	}

	f, err := os.OpenFile(filename, os.O_RDWR, 0)
	if err != nil {
		return fmt.Errorf("os.Open: %w", err)
	}

	_, err = f.Write([]byte(md))
	if err != nil {
		return fmt.Errorf("f.Write: %w", err)
	}

	return nil
}

func (d *Docs) getPoolConfig(ctx context.Context, network config.Network, factory, poolAddress proto.WavesAddress) (string, string, string, error) {
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
		fmt.Sprintf("%s/utils/script/evaluate/%s", d.getCfg(network).client.GetOptions().BaseUrl, factory),
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
	_, err = d.getCfg(network).client.Do(ctx, req, &res)
	if err != nil {
		return "", "", "", fmt.Errorf("s.client().Do: %w", err)
	}

	if len(res.Result.Value.Num2.Value) == 0 {
		return "", "", "", errors.New("empty pool config, address=" + poolAddress.String())
	}

	lp := res.Result.Value.Num2.Value[3].Value
	amountAsset := res.Result.Value.Num2.Value[4].Value
	priceAsset := res.Result.Value.Num2.Value[5].Value
	return lp, amountAsset, priceAsset, nil
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
			"%s | [`%s`](https://wavesexplorer.com/assets/%s%s) | %s \n",
			dashIfEmpty(asset.Name),
			asset.AssetId.String(),
			asset.AssetId.String(),
			explorerSuffix,
			dashIfEmpty(asset.Description),
		)
	}
	return res
}
