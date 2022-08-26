package migrator

import (
	"context"
	"errors"
	"github.com/waves-exchange/contracts/migration/pkg/contracts"
	"go.mongodb.org/mongo-driver/mongo"
)

type Mainnet struct {
	File    string
	Tag     string
	Compact bool
	BasePub string
}

type Testnet struct {
	File      string
	Tag       string
	Compact   bool
	BasePub   string
	BasePrv   string
	SignerPrv string
}

func NewMigrator(contracts contracts.Contracts, ctx context.Context, collection *mongo.Collection, network string) error {
	switch network {
	case "mainnet":
		var c [...]Mainnet
		for i, contr := range contracts {
			c[i] = Mainnet{
				File:    contr.File,
				Tag:     contr.Tag,
				Compact: true,
				BasePub: contr.MainnetPub,
			}
		}

		var tn [...]Testnet
		err := writeFiles(c, tn, ctx, collection)
		if err != nil {
			return err
		}
	case "testnet":
		var c [...]Testnet
		for i, contr := range contracts {
			c[i] = Testnet{
				File:      contr.File,
				Tag:       contr.Tag,
				Compact:   true,
				BasePub:   contr.MainnetPub,
				BasePrv:   contr.TestnetPrv,
				SignerPrv: contr.TestnetSigner,
			}
		}

		var mn [...]Mainnet
		err := writeFiles(mn, c, ctx, collection)
		if err != nil {
			return err
		}
	default:
		return nil
	}

	return nil
}

func writeFiles(mainnet [...]Mainnet, testnet [...]Testnet, ctx context.Context, collection *mongo.Collection) error {
	if len(mainnet) > 0 {
		for _, c := range mainnet {
			_, err := collection.InsertOne(ctx, c)
			if err != nil {
				return err
			}
		}
	} else if len(testnet) > 0 {
		_, err := collection.InsertOne(ctx, testnet)
		if err != nil {
			return err
		}
	} else {
		return errors.New("A non-existent network is specified")
	}

	return nil
}
