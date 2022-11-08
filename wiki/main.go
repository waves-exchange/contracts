package main

import (
	"context"
	"fmt"
	"github.com/waves-exchange/contracts/wiki/pkg/config"
	"github.com/waves-exchange/contracts/wiki/pkg/contract"
	"github.com/waves-exchange/contracts/wiki/pkg/logger"
	"github.com/waves-exchange/contracts/wiki/pkg/mongo"
	"github.com/waves-exchange/contracts/wiki/pkg/syncer"
)

func main() {
	ctx := context.Background()

	cfg, err := config.NewConfig()
	if err != nil {
		panic(fmt.Errorf("config.NewConfig: %w", err))
	}

	logg, err := logger.NewLogger("debug")
	if err != nil {
		panic(fmt.Errorf("logger.NewLogger: %w", err))
	}

	db, err := mongo.NewConn(ctx, cfg.MongoDatabaseName, cfg.MongoURI)
	if err != nil {
		panic(fmt.Errorf("mongo.NewConn: %w", err))
	}

	sc := syncer.NewSyncer(
		logg.ZL,
		cfg.Network,
		contract.NewModel(db.Collection(cfg.MongoCollectionContracts)),
		cfg.WikiPage,
	)
	if err != nil {
		panic(fmt.Errorf("syncer.NewSyncer: %w", err))
	}

	err = sc.ApplyChanges(ctx)
	if err != nil {
		panic(fmt.Errorf("sc.ApplyChanges: %w", err))
	}
}
