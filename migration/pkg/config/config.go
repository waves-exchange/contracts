package config

import (
	"fmt"
	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Network                  string `required:"true"`
	MongoURI                 string `required:"true"`
	MongoDatabaseName        string `required:"true"`
	MongoCollectionContracts string `required:"true"`
}

func NewConfig() (Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)

	if err != nil {
		return Config{}, fmt.Errorf("envconfig.Process: %w", err)
	}

	return cfg, nil
}
