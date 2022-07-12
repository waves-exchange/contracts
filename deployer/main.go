package main

import (
	"context"
	"fmt"

	"gitlab.waves.exchange/wx-defi/contracts-v2/deployer/pkg/config"
	"gitlab.waves.exchange/wx-defi/contracts-v2/deployer/pkg/logger"
	"gitlab.waves.exchange/wx-defi/contracts-v2/deployer/pkg/syncer"
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
