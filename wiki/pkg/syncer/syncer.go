package syncer

import (
	"context"
	"github.com/rs/zerolog"
	"github.com/waves-exchange/contracts/wiki/pkg/config"
	"github.com/waves-exchange/contracts/wiki/pkg/contract"
	"time"
)

type Syncer struct {
	logger        zerolog.Logger
	network       config.Network
	contractModel contract.Model
	wikiPage      string
}

func NewSyncer(
	logger zerolog.Logger,
	network config.Network,
	contractModel contract.Model,
	wikiPage string,
) *Syncer {
	logger.Info().
		Str("network", string(network)).
		Msg("syncer init")

	return &Syncer{
		logger:        logger,
		network:       network,
		contractModel: contractModel,
		wikiPage:      wikiPage,
	}
}

func (s *Syncer) ApplyChanges(c context.Context) error {
	ctx, cancel := context.WithTimeout(c, 8*time.Hour)
	defer cancel()

}
