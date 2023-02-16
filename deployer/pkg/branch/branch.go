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
}

type Model struct {
	coll *mongo.Collection
}

func NewModel(coll *mongo.Collection) Model {
	return Model{
		coll: coll,
	}
}

func (m Model) GetTestnetBranch(ctx context.Context) (string, error) {
	var doc Branch
	err := m.coll.FindOne(ctx, bson.M{
		"network": config.Testnet,
	}).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return "", nil
		}

		return "", fmt.Errorf("m.coll.FindOne: %w", err)
	}

	return doc.Branch, err
}
