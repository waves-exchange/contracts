package contracts

import (
	"gopkg.in/yaml.v3"
	"io/ioutil"
	"path/filepath"
)

type Contracts []struct {
	File          string `yaml:"file"`
	Tag           string `yaml:"tag"`
	TestnetPrv    string `yaml:"testnet-prv"`
	TestnetSigner string `yaml:"testnet-signer"`
	MainnetPub    string `yaml:"mainnet-pub"`
	Compact       bool   `yaml:"compact"`
}

func GetContracts() (Contracts, error) {
	file, _ := filepath.Abs("../contracts.yaml")
	yamlFile, err := ioutil.ReadFile(file)
	if err != nil {
		return Contracts{}, err
	}

	var contracts Contracts

	err = yaml.Unmarshal(yamlFile, &contracts)
	if err != nil {
		return Contracts{}, err
	}

	return contracts, nil
}
