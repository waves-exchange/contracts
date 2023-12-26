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

	// 'context' may be testnet or mainnet
	contextDB, err := mongo.NewConn(ctx, cfg.MongoDatabaseName, cfg.MongoURI)
	if err != nil {
		panic(fmt.Errorf("mongo.NewConn: %w", err))
	}

	// testnetDB, err := mongo.NewConn(ctx, cfg.MongoDatabaseName, cfg.TestnetMongoURI)
	// if err != nil {
	// 	panic(fmt.Errorf("mongo.NewConn: %w", err))
	// }

	// mainnetDB, err := mongo.NewConn(ctx, cfg.MongoDatabaseName, cfg.MainnetMongoURI)
	// if err != nil {
	// 	panic(fmt.Errorf("mongo.NewConn: %w", err))
	// }

	// dc, err := docs.NewDocs(
	// 	logg.ZL,
	// 	branch.NewModel(testnetDB.Collection(cfg.MongoCollectionBranches)),
	// 	contract.NewModel(testnetDB.Collection(cfg.MongoCollectionContracts)),
	// 	cfg.TestnetNode,
	// 	branch.NewModel(mainnetDB.Collection(cfg.MongoCollectionBranches)),
	// 	contract.NewModel(mainnetDB.Collection(cfg.MongoCollectionContracts)),
	// 	cfg.MainnetNode,
	// )
	// if err != nil {
	// 	panic(fmt.Errorf("docs.NewDocs: %w", err))
	// }

	// err = dc.Update(ctx)
	// if err != nil {
	// 	panic(fmt.Errorf("dc.Update: %w", err))
	// }

	sc, err := syncer.NewSyncer(
		logg.ZL,
		cfg.Network,
		cfg.Node,
		cfg.Branch,
		contract.NewModel(contextDB.Collection(cfg.MongoCollectionContracts)),
		branch.NewModel(contextDB.Collection(cfg.MongoCollectionBranches)),
		cfg.CompareLpScriptAddress,
		cfg.CompareLpStableScriptAddress,
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
