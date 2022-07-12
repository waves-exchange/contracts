package config

import (
	"errors"
	"fmt"
	"github.com/kelseyhightower/envconfig"
	"gopkg.in/yaml.v2"
	"os"
)

type Contract struct {
	File          string `yaml:"file"`
	MainnetPub    string `yaml:"mainnet-pub"`
	Compact       bool   `yaml:"compact"`
	Tag           string `yaml:"tag"`
	TestnetPrv    string `yaml:"testnet-prv"`
	TestnetSigner string `yaml:"testnet-signer"`
}

func (c Contract) validate() error {
	if c.File == "" {
		return errors.New("Contract.File required")
	}
	if c.Tag == "" {
		return errors.New(c.File + ": Contract.Tag required")
	}
	if c.MainnetPub == "" {
		return errors.New(c.File + ": Contract.MainnetPub required")
	}

	return nil
}

type Config struct {
	TestnetNode   string `required:"true"`
	MainnetNode   string `required:"true"`
	Mode          Mode   `required:"true"`
	Contracts     string `required:"true"`
	ContractsList []Contract
}

type Mode string

const (
	DeployTestnet  Mode = "deployTestnet"
	CompareMainnet Mode = "compareMainnet"
)

func NewConfig() (Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return Config{}, fmt.Errorf("envconfig.Process: %w", err)
	}

	f, err := os.Open(cfg.Contracts)
	if err != nil {
		return Config{}, fmt.Errorf("os.Open: %w", err)
	}

	err = yaml.NewDecoder(f).Decode(&cfg.ContractsList)
	if err != nil {
		return Config{}, fmt.Errorf("yaml.NewDecoder(f).Decode: %w", err)
	}

	for _, contractConfig := range cfg.ContractsList {
		e := contractConfig.validate()
		if e != nil {
			return Config{}, fmt.Errorf("contractConfig.validate: %w", e)
		}
	}

	return cfg, nil
}
