package main

import (
	"context"
	"fmt"
	"github.com/waves-exchange/contracts/deployer/pkg/branch"
	"github.com/waves-exchange/contracts/deployer/pkg/config"
	"github.com/waves-exchange/contracts/deployer/pkg/contract"
	"github.com/waves-exchange/contracts/deployer/pkg/logger"
	"github.com/waves-exchange/contracts/deployer/pkg/mongo"
	"github.com/waves-exchange/contracts/deployer/pkg/syncer"
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

	branchModel, err := branch.NewModel(db.Collection(cfg.MongoCollectionBranches))
	if err != nil {
		panic(fmt.Errorf("branch.NewModel: %w", err))
	}

	sc, err := syncer.NewSyncer(
		logg.ZL,
		cfg.Network,
		cfg.Node,
		cfg.Branch,
		contract.NewModel(db.Collection(cfg.MongoCollectionContracts)),
		branchModel,
		cfg.CompareLpScriptAddress,
		cfg.CompareLpStableScriptAddress,
		cfg.CompareLpStableAddonScriptAddress,
		cfg.FeeSeed,
	)
	if err != nil {
		panic(fmt.Errorf("syncer.NewSyncer: %w", err))
	}

	err = sc.ApplyChanges(ctx)
	if err != nil {
		panic(fmt.Errorf("sc.ApplyChanges: %w", err))
	}
}
