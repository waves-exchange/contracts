package main

import (
	"context"
	"fmt"
	"github.com/waves-exchange/contracts/migration/pkg/config"
	"github.com/waves-exchange/contracts/migration/pkg/contracts"
	"github.com/waves-exchange/contracts/migration/pkg/migrator"
	"github.com/waves-exchange/contracts/migration/pkg/mongo"
)

func main() {
	ctx := context.Background()

	cfg, err := config.NewConfig()
	if err != nil {
		panic(fmt.Errorf("config.NewConfig: %w", err))
	}

	if err != nil {
		panic(fmt.Errorf("logger.NewLogger: %w", err))
	}

	collect, err := mongo.NewConn(ctx, cfg.MongoDatabaseName, cfg.MongoURI, cfg.MongoCollectionContract)
	if err != nil {
		panic(fmt.Errorf("mongo.NewConn: %w", err))
	}

	cont, err := contracts.GetContracts()
	if err != nil {
		panic(fmt.Errorf("contracts.GetContracts: %w", err))
	}

	err = migrator.NewMigrator(cont, ctx, collect, cfg.Network)
	if err != nil {
		panic(fmt.Errorf("migrator.NewMigrator: %w", err))
	}
}
