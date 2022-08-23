package config

import (
	"fmt"
	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	MongoURI                 string `required:"true"`
	MongoDatabaseName        string `required:"true"`
	MongoCollectionContracts string `required:"true"`
	TestnetNode              string `required:"true"`
	MainnetNode              string `required:"true"`
	Mode                     Mode   `required:"true"`
}

type Mode string

const (
	DeployTestnet Mode = "deployTestnet"
	DeployMainnet Mode = "deployMainnet"
)

func NewConfig() (Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return Config{}, fmt.Errorf("envconfig.Process: %w", err)
	}

	return cfg, nil
}
