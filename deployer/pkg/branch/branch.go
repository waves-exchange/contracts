package branch

import (
	"context"
	"fmt"
	"github.com/waves-exchange/contracts/deployer/pkg/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Branch struct {
	Branch  string         `bson:"branch,omitempty"`
	Network config.Network `bson:"network,omitempty"`
}

type Model struct {
	coll *mongo.Collection
}

func NewModel(coll *mongo.Collection) (Model, error) {
	m := Model{
		coll: coll,
	}
	err := m.createIndex()
	if err != nil {
		return Model{}, fmt.Errorf("m.createIndex: %w", err)
	}

	return m, nil
}

func (m Model) createIndex() error {
	_, err := m.coll.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.M{
			"network": 1,
		},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return fmt.Errorf("m.coll.Indexes().CreateOne: %w", err)
	}

	return nil
}

func (m Model) GetTestnetBranch(ctx context.Context) (string, error) {
	var doc Branch
	err := m.coll.FindOne(ctx, bson.M{
		"network": config.Testnet,
	}).Decode(&doc)
	if err != nil {
		return "", fmt.Errorf("m.coll.FindOne: %w", err)
	}

	return doc.Branch, err
}
