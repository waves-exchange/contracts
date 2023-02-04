package cmd

import (
	"context"
	"errors"
	"fmt"
	"github.com/manifoldco/promptui"
	"github.com/spf13/cobra"
	"github.com/waves-exchange/contracts/deployer/pkg/branch"
	"github.com/waves-exchange/contracts/deployer/pkg/cli_contract"
	"github.com/waves-exchange/contracts/deployer/pkg/config"
	"github.com/waves-exchange/contracts/deployer/pkg/contract"
	"github.com/waves-exchange/contracts/deployer/pkg/mongo"
	"github.com/waves-exchange/contracts/deployer/pkg/tools"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
	m "go.mongodb.org/mongo-driver/mongo"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// createStageCmd represents the createStage command
var createStageCmd = &cobra.Command{
	Use:   "create-stage",
	Short: "Creates new testnet stage",
	Run: func(cmd *cobra.Command, args []string) {
		ctx := context.Background()

		const (
			defiConfig    = "defi_config"
			branches      = "branches"
			defaultBranch = "dev"
			contracts     = "contracts"
			node          = "https://nodes-testnet.wx.network"
		)

		mongouriP := promptui.Prompt{
			Label:       "Mongo uri ?",
			HideEntered: true,
		}
		mongouri, err := mongouriP.Run()

		db, err := mongo.NewConn(ctx, defiConfig, mongouri)
		if err != nil {
			printAndExit(err)
		}

		branchModel, err := branch.NewModel(db.Collection(branches))
		if err != nil {
			printAndExit(err)
		}

		contractModel := contract.NewModel(db.Collection(contracts))
		if err != nil {
			printAndExit(err)
		}

		cl, err := client.NewClient(client.Options{
			BaseUrl: node,
			Client:  &http.Client{Timeout: time.Minute},
		})
		if err != nil {
			printAndExit(err)
		}

		stageP := promptui.Prompt{
			Label: "Index of the new stage ?",
			Validate: func(s string) error {
				stg, err := strconv.Atoi(s)
				if err != nil {
					return fmt.Errorf("strconv.Atoi: %w", err)
				}

				exists, err := branchModel.StageExists(ctx, uint32(stg))
				if err != nil {
					return fmt.Errorf("branchModel.StageExists: %w", err)
				}

				if exists {
					return errors.New("stage with same stage already exists")
				}
				return nil
			},
		}
		stageStr, err := stageP.Run()
		if err != nil {
			printAndExit(err)
		}
		stageInt, err := strconv.Atoi(stageStr)
		if err != nil {
			printAndExit(err)
		}
		stage := uint32(stageInt)

		seedP := promptui.Prompt{
			Label:       "Base seed ?",
			HideEntered: true,
		}
		seed, err := seedP.Run()
		if err != nil {
			printAndExit(err)
		}

		seedGazP := promptui.Prompt{
			Label:       "Seed to take WAVES fee from ?",
			HideEntered: true,
		}
		seedGaz, err := seedGazP.Run()
		if err != nil {
			printAndExit(err)
		}

		gazPrv, _, err := tools.GetPrivateAndPublicKey([]byte(seedGaz))
		if err != nil {
			printAndExit(err)
		}

		// Init contracts and save to mongo
		sess, err := db.Client().StartSession()
		if err != nil {
			printAndExit(err)
		}
		_, err = sess.WithTransaction(ctx, func(sc m.SessionContext) (interface{}, error) {
			e := branchModel.Create(sc, defaultBranch, config.Testnet, stage)
			if e != nil {
				return nil, fmt.Errorf("branchModel.Create: %w", e)
			}

			managerPrv, managerPub, err := makeKeyPair(seed, stage, 0)
			if err != nil {
				printAndExit(err)
			}

			factoryV2Prv, _, err := makeKeyPair(seed, stage, 1)
			if err != nil {
				printAndExit(err)
			}
			factoryV2 := cli_contract.New(
				proto.TestNetScheme,
				cl,
				contractModel,
				factoryV2Prv,
				managerPrv,
				gazPrv,
				"factory_v2",
				"factory_v2.ride",
				stage,
				false,
				[]proto.DataEntry{
					&proto.StringDataEntry{
						Key:   "%s__managerPublicKey",
						Value: managerPub.String(),
					},
				},
				nil,
			)
			e = factoryV2.DeployAndSave(ctx)
			if e != nil {
				return nil, fmt.Errorf("factoryV2.DeployAndSave: %w", e)
			}

			return nil, nil
		})
		if err != nil {
			printAndExit(err)
		}
	},
}

func init() {
	rootCmd.AddCommand(createStageCmd)
}

func printAndExit(err error) {
	fmt.Println(err)
	os.Exit(1)
}

func makeKeyPair(seed string, stage, index uint32) (crypto.SecretKey, crypto.PublicKey, error) {
	prv, pub, err := tools.GetPrivateAndPublicKey([]byte(strings.Join([]string{
		seed,
		strconv.Itoa(int(stage)),
		strconv.Itoa(int(index)),
	}, " ")))
	if err != nil {
		return crypto.SecretKey{}, crypto.PublicKey{}, fmt.Errorf("tools.GetPrivateAndPublicKey: %w", err)
	}
	return prv, pub, nil
}
