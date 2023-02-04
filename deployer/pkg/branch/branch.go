package branch

import (
	"context"
	"errors"
	"fmt"
	"github.com/waves-exchange/contracts/deployer/pkg/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type Branch struct {
	Branch  string         `bson:"branch,omitempty"`
	Network config.Network `bson:"network,omitempty"`
	Stage   uint32         `bson:"stage,omitempty"`
}

type Model struct {
	coll *mongo.Collection
}

func NewModel(coll *mongo.Collection) Model {
	return Model{
		coll: coll,
	}
}

func (m Model) GetTestnetBranches(ctx context.Context) ([]Branch, error) {
	cur, err := m.coll.Find(ctx, bson.M{
		"network": config.Testnet,
	})
	if err != nil {
		return nil, fmt.Errorf("m.coll.Find: %w", err)
	}

	var docs []Branch
	err = cur.All(ctx, &docs)
	if err != nil {
		return nil, fmt.Errorf("cur.All: %w", err)
	}

	return docs, err
}

func (m Model) StageExists(ctx context.Context, stage uint32) (bool, error) {
	err := m.coll.FindOne(ctx, bson.M{
		"stage": stage,
	}).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}
		return false, fmt.Errorf("m.coll.FindOne: %w", err)
	}
	return true, nil
}

func (m Model) Create(ctx context.Context, branch string, network config.Network, stage uint32) error {
	_, err := m.coll.InsertOne(ctx, Branch{
		Branch:  branch,
		Network: network,
		Stage:   stage,
	})
	if err != nil {
		return fmt.Errorf("m.coll.InsertOne: %w", err)
	}
	return nil
}
