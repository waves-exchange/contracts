package contract

import (
	"context"
	"errors"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"time"
)

type Contract struct {
	File      string `bson:"file,omitempty"`
	Stage     uint32 `bson:"stage,omitempty"`
	Compact   bool   `bson:"compact,omitempty"`
	Tag       string `bson:"tag,omitempty"`
	BasePub   string `bson:"base_pub,omitempty"`
	BasePrv   string `bson:"base_prv,omitempty"`
	SignerPrv string `bson:"signer_prv,omitempty"`
}

func (c Contract) validate() error {
	if c.File == "" {
		return errors.New("Contract.File required")
	}
	if c.Tag == "" {
		return errors.New("Contract.Tag required")
	}
	if c.BasePub == "" {
		return errors.New("Contract.BasePub required")
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

func (m Model) GetAll(c context.Context) ([]Contract, error) {
	ctx, cancel := context.WithTimeout(c, 10*time.Second)
	defer cancel()

	cur, err := m.coll.Find(ctx, bson.M{})
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

func (m Model) IsCompact(c context.Context, fileName string) (bool, error) {
	ctx, cancel := context.WithTimeout(c, 10*time.Second)
	defer cancel()

	cur, err := m.coll.Find(ctx, bson.M{"file": fileName})
	if err != nil {
		return false, fmt.Errorf("m.coll.FindOne: %w", err)
	}

	var docs []Contract
	err = cur.All(ctx, &docs)
	if err != nil {
		return false, fmt.Errorf("cur.All: %w", err)
	}

	if len(docs) == 0 {
		return false, errors.New("no contract found")
	}

	var compact bool
	for i, doc := range docs {
		if i == 0 {
			compact = doc.Compact
		} else {
			if compact != doc.Compact {
				return false, fmt.Errorf("different 'compact' values for file: %s", fileName)
			}
		}
	}

	return compact, nil
}
