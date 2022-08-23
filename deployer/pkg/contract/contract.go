package contract

import (
	"context"
	"errors"
	"fmt"
	"go.mongodb.org/mongo-driver/mongo"
)

type Contract struct {
	File          string `bson:"file,omitempty"`
	Compact       bool   `bson:"compact,omitempty"`
	Tag           string `bson:"tag,omitempty"`
	TestnetPrv    string `bson:"testnet_prv,omitempty"`
	TestnetSigner string `bson:"testnet_signer,omitempty"`
	MainnetPub    string `bson:"mainnet_pub,omitempty"`
}

func (c Contract) validate() error {
	if c.File == "" {
		return errors.New("Contract.File required")
	}
	if c.Tag == "" {
		return errors.New("Contract.Tag required")
	}
	if c.MainnetPub == "" {
		return errors.New("Contract.MainnetPub required")
	}

	return nil
}

type Model struct {
	coll *mongo.Collection
}

func NewModel(coll *mongo.Collection) Model {
	return Model{
		coll: coll,
	}
}

func (m Model) GetAll(ctx context.Context) ([]Contract, error) {
	cur, err := m.coll.Find(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("m.coll.Find: %w", err)
	}

	var res []Contract
	err = cur.All(ctx, &res)
	if err != nil {
		return nil, fmt.Errorf("cur.All: %w", err)
	}

	for _, r := range res {
		e := r.validate()
		if e != nil {
			return nil, fmt.Errorf("r.validate: file: %s tag: %s: %w", r.File, r.Tag, e)
		}
	}

	return res, nil
}
