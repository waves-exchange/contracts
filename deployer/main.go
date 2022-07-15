package main

import (
	"context"
	"fmt"
	"github.com/waves-exchange/contracts/deployer/pkg/config"
	"github.com/waves-exchange/contracts/deployer/pkg/logger"
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

	sc, err := syncer.NewSyncer(
		logg.ZL,
		cfg.Mode,
		cfg.TestnetNode,
		cfg.MainnetNode,
		cfg.ContractsList,
	)
	if err != nil {
		panic(fmt.Errorf("syncer.NewSyncer: %w", err))
	}

	err = sc.ApplyChanges(ctx)
	if err != nil {
		panic(fmt.Errorf("sc.ApplyChanges: %w", err))
	}
}
