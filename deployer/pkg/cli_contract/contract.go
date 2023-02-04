package cli_contract

import (
	"context"
	"fmt"
	"github.com/rs/zerolog"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
	"os"
)

type Contract struct {
	logger      zerolog.Logger
	client      *client.Client
	basePrv     crypto.SecretKey
	signerPrv   crypto.SecretKey
	networkByte proto.Scheme
	tag         string
	filename    string
	compact     bool
	data        []proto.DataEntry
	constructor []proto.InvokeScriptWithProofs
}

func New(
	client *client.Client,
	basePrv crypto.SecretKey,
	signerPrv crypto.SecretKey,
	tag string,
	filename string,
	compact bool,
	data []proto.DataEntry,
	constructor []proto.InvokeScriptWithProofs,
) Contract {
	return Contract{
		logger: zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).Level(zerolog.DebugLevel).With().Timestamp().
			Caller().Logger(),
		client:      client,
		basePrv:     basePrv,
		signerPrv:   signerPrv,
		tag:         tag,
		filename:    filename,
		compact:     compact,
		data:        data,
		constructor: constructor,
	}
}

func (c Contract) Deploy(ctx context.Context) error {
	err := c.setData(ctx)
	if err != nil {
		return fmt.Errorf("c.setData: %w", err)
	}

	err = c.setScript(ctx)
	if err != nil {
		return fmt.Errorf("c.setScript: %w", err)
	}

	err = c.callConstructor(ctx)
	if err != nil {
		return fmt.Errorf("c.callConstructor: %w", err)
	}
	return nil
}

func (c Contract) setData(ctx context.Context) error {

}

func (c Contract) callConstructor(ctx context.Context) error {

}

func (c Contract) setScript(ctx context.Context) error {

}
