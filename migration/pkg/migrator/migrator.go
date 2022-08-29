package migrator

import (
	"context"
	"errors"
	"fmt"
	"github.com/waves-exchange/contracts/migration/pkg/contracts"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type Mainnet struct {
	File    string `bson:"file,omitempty"`
	Tag     string `bson:"tag,omitempty"`
	Compact bool   `bson:"compact,omitempty"`
	BasePub string `bson:"base_pub,omitempty"`
}

type Testnet struct {
	File      string `bson:"file,omitempty"`
	Tag       string `bson:"tag,omitempty"`
	Compact   bool   `bson:"compact,omitempty"`
	BasePub   string `bson:"base_pub,omitempty"`
	BasePrv   string `bson:"base_prv,omitempty"`
	SignerPrv string `bson:"signer_prv,omitempty"`
}

func NewMigrator(contracts contracts.Contracts, ctx context.Context, collection *mongo.Collection, network string) error {
	switch network {
	case "mainnet":
		var c []Mainnet
		for _, contr := range contracts {
			c = append(c, Mainnet{
				File:    contr.File,
				Tag:     contr.Tag,
				BasePub: contr.MainnetPub,
			})
		}

		var tn []Testnet
		err := writeFiles(c, tn, ctx, collection)
		if err != nil {
			return err
		}
	case "testnet":
		var c []Testnet
		for _, contr := range contracts {
			prv, err := crypto.NewSecretKeyFromBase58(contr.TestnetPrv)
			if err != nil {
				fmt.Println(contr)
				return fmt.Errorf("crypto.NewSecretKeyFromBase58: %w", err)
			}
			pubKey := crypto.GeneratePublicKey(prv)
			c = append(c, Testnet{
				File:      contr.File,
				Tag:       contr.Tag,
				BasePub:   pubKey.String(),
				BasePrv:   contr.TestnetPrv,
				SignerPrv: contr.TestnetSigner,
			})
		}

		var mn []Mainnet
		err := writeFiles(mn, c, ctx, collection)
		if err != nil {
			return err
		}
	default:
		return nil
	}

	return nil
}

func writeFiles(mainnet []Mainnet, testnet []Testnet, ctx context.Context, collection *mongo.Collection) error {
	if len(mainnet) > 0 {
		for _, c := range mainnet {
			m, err := bson.Marshal(&c)
			_, err = collection.InsertOne(ctx, m)
			if err != nil {
				return err
			}
		}
	} else if len(testnet) > 0 {
		for _, c := range testnet {
			t, err := bson.Marshal(&c)
			_, err = collection.InsertOne(ctx, t)
			if err != nil {
				return err
			}
		}
	} else {
		return errors.New("A non-existent network is specified")
	}

	return nil
}
