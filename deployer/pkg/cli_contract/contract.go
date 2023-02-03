package cli_contract

import (
	"context"
	"github.com/rs/zerolog"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
	"os"
)

type Contract struct {
	logger      zerolog.Logger
	client      *client.Client
	prv         crypto.SecretKey
	tag         string
	filename    string
	compact     bool
	data        []proto.DataEntry
	constructor proto.InvokeScriptWithProofs
}

func New(
	client *client.Client,
	prv crypto.SecretKey,
	tag string,
	filename string,
	data []proto.DataEntry,
) Contract {
	return Contract{
		logger: zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).Level(zerolog.DebugLevel).With().Timestamp().
			Caller().Logger(),
		client:   client,
		prv:      prv,
		tag:      tag,
		filename: filename,
		data:     data,
	}
}

func (c Contract) Deploy(ctx context.Context) error {
	dataTx := proto.newunsigneddata
}
