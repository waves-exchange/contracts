package cli_contract

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"os"
	"path"
	"strings"

	"github.com/rs/zerolog"
	"github.com/waves-exchange/contracts/deployer/pkg/contract"
	"github.com/waves-exchange/contracts/deployer/pkg/tools"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
)

type Contract struct {
	logger      zerolog.Logger
	client      *client.Client
	model       contract.Model
	basePrv     crypto.SecretKey
	signerPrv   crypto.SecretKey
	signers     []crypto.SecretKey
	gazPrv      crypto.SecretKey
	networkByte proto.Scheme
	tag         string
	filename    string
	stage       uint32
	compact     bool
	data        []proto.DataEntry
	constructor []*proto.InvokeScriptWithProofs
}

func New(
	networkByte proto.Scheme,
	client *client.Client,
	model contract.Model,
	basePrv crypto.SecretKey,
	signerPrv crypto.SecretKey,
	gazPrv crypto.SecretKey,
	tag string,
	filename string,
	stage uint32,
	compact bool,
	data []proto.DataEntry,
	constructor []*proto.InvokeScriptWithProofs,
) Contract {
	return Contract{
		logger: zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).Level(zerolog.DebugLevel).With().Timestamp().
			Caller().Logger(),
		networkByte: networkByte,
		client:      client,
		model:       model,
		basePrv:     basePrv,
		signerPrv:   signerPrv,
		signers:     []crypto.SecretKey{basePrv, signerPrv},
		gazPrv:      gazPrv,
		tag:         tag,
		filename:    filename,
		stage:       stage,
		compact:     compact,
		data:        data,
		constructor: constructor,
	}
}

func (c Contract) DeployAndSave(ctx context.Context) error {
	err := c.Deploy(ctx)
	if err != nil {
		return fmt.Errorf("c.Deploy: %w", err)
	}

	err = c.Save(ctx)
	if err != nil {
		return fmt.Errorf("c.Save: %w", err)
	}

	return nil
}

func (c Contract) Deploy(ctx context.Context) error {
	addr, err := proto.NewAddressFromPublicKey(c.networkByte, crypto.GeneratePublicKey(c.basePrv))
	if err != nil {
		return fmt.Errorf("proto.NewAddressFromPublicKey: %w", err)
	}

	l := func() *zerolog.Event {
		return c.logger.Info().
			Str("tag", c.tag).
			Str("filename", c.filename).
			Bool("compact", c.compact).
			Str("address", addr.String())
	}

	err = c.selfTransferFee(ctx)
	if err != nil {
		return fmt.Errorf("c.selfTransferFee: %w", err)
	}
	l().Msg("WAVES for fee transferred")

	if len(c.data) != 0 {
		e := c.setData(ctx)
		if e != nil {
			return fmt.Errorf("c.setData: %w", e)
		}
		l().Msg("dataTx done")
	} else {
		l().Msg("dataTx not needed")
	}

	err = c.setScript(ctx)
	if err != nil {
		return fmt.Errorf("c.setScript: %w", err)
	}
	l().Msg("setScript done")

	if len(c.constructor) != 0 {
		e := c.callConstructor(ctx)
		if e != nil {
			return fmt.Errorf("c.callConstructor: %w", e)
		}
		l().Msg("constructor functions called")
	} else {
		l().Msg("constructor functions not needed")
	}

	return nil
}

func (c Contract) selfTransferFee(ctx context.Context) error {
	addr, err := proto.NewAddressFromPublicKey(c.networkByte, crypto.GeneratePublicKey(c.basePrv))
	if err != nil {
		return fmt.Errorf("proto.NewAddressFromPublicKey: %w", err)
	}

	err = tools.SignBroadcastWait(
		ctx,
		c.networkByte,
		c.client,
		proto.NewUnsignedTransferWithProofs(
			3,
			crypto.GeneratePublicKey(c.gazPrv),
			proto.NewOptionalAssetWaves(),
			proto.NewOptionalAssetWaves(),
			tools.Timestamp(),
			100000000,
			100000,
			proto.NewRecipientFromAddress(addr),
			nil,
		),
		c.gazPrv,
	)
	if err != nil {
		return fmt.Errorf("tools.SignBroadcastWait: %w", err)
	}
	return nil
}

func (c Contract) setData(ctx context.Context) error {
	tx := proto.NewUnsignedDataWithProofs(
		2,
		crypto.GeneratePublicKey(c.basePrv),
		500000,
		tools.Timestamp(),
	)
	for _, data := range c.data {
		err := tx.AppendEntry(data)
		if err != nil {
			return fmt.Errorf("tx.AppendEntry: %w", err)
		}
	}

	err := tools.TrySignBroadcastWait(ctx, c.networkByte, c.client, tx, c.signers)
	if err != nil {
		return fmt.Errorf("tools.SignBroadcastWait: %w", err)
	}

	return nil
}

func (c Contract) callConstructor(ctx context.Context) error {
	for _, tx := range c.constructor {
		err := tools.TrySignBroadcastWait(ctx, c.networkByte, c.client, tx, c.signers)
		if err != nil {
			return fmt.Errorf("tools.SignBroadcastWait: %w", err)
		}
	}
	return nil
}

func (c Contract) setScript(ctx context.Context) error {
	f, err := os.Open(path.Join("..", "ride", c.filename))
	if err != nil {
		return fmt.Errorf("os.Open: %w", err)
	}

	var script string
	if c.compact {
		sc, e := tools.CompactScript(ctx, c.client, f)
		if e != nil {
			return fmt.Errorf("tools.CompactScript: %w", e)
		}
		script = sc
	} else {
		body, e := io.ReadAll(f)
		if e != nil {
			return fmt.Errorf("io.ReadAll: %w", e)
		}

		sc, _, e := c.client.Utils.ScriptCompile(ctx, string(body))
		if e != nil {
			return fmt.Errorf("c.client.Utils.ScriptCompile: %w", e)
		}
		script = sc.Script
	}

	scriptBytes, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(script, "base64:"))
	if err != nil {
		return fmt.Errorf("base64.StdEncoding.DecodeString: %w", err)
	}
	setScriptFee := tools.CalcSetScriptFee(scriptBytes)

	err = tools.TrySignBroadcastWait(
		ctx,
		c.networkByte,
		c.client,
		proto.NewUnsignedSetScriptWithProofs(
			2,
			crypto.GeneratePublicKey(c.basePrv),
			scriptBytes,
			setScriptFee,
			tools.Timestamp(),
		),
		c.signers,
	)
	if err != nil {
		return fmt.Errorf("tools.SignBroadcastWait: %w", err)
	}
	return nil
}

func (c Contract) Save(ctx context.Context) error {
	err := c.model.Create(
		ctx,
		c.filename,
		c.stage,
		c.compact,
		c.tag,
		crypto.GeneratePublicKey(c.basePrv).String(),
		c.basePrv.String(),
		c.signerPrv.String(),
	)
	if err != nil {
		return fmt.Errorf("c.model.Create: %w", err)
	}
	return nil
}
