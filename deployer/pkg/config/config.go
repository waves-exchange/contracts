package config

import (
	"fmt"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Network                      Network `required:"true"`
	Branch                       string  `required:"true"`
	Node                         string  `required:"true"`
	MongoURI                     string  `required:"true"`
	MongoDatabaseName            string  `required:"true"`
	MongoCollectionBranches      string  `required:"true"`
	MongoCollectionContracts     string  `required:"true"`
	CompareLpScriptAddress       string  `required:"true"`
	CompareLpStableScriptAddress string  `required:"true"`
	FeeSeed                      string  `required:"true"`

	// Testnet only
	TestnetNode     string
	MainnetNode     string
	TestnetMongoURI string
	MainnetMongoURI string
}

type Network string

const (
	Testnet Network = "testnet"
	Mainnet Network = "mainnet"
)

func NewConfig() (Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return Config{}, fmt.Errorf("envconfig.Process: %w", err)
	}

	return cfg, nil
}
