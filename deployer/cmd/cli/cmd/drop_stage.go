package cmd

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/manifoldco/promptui"
	"github.com/rs/zerolog"
	"github.com/spf13/cobra"
	"github.com/waves-exchange/contracts/deployer/pkg/branch"
	"github.com/waves-exchange/contracts/deployer/pkg/contract"
	"github.com/waves-exchange/contracts/deployer/pkg/mongo"
	"github.com/waves-exchange/contracts/deployer/pkg/tools"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
	"go.mongodb.org/mongo-driver/bson"
)

var log zerolog.Logger

var dropStageCmd = &cobra.Command{
	Use:   "drop-stage",
	Short: "Drop stage records in mongodb",
	Run: func(cmd *cobra.Command, args []string) {
		ctx := context.Background()

		const (
			defiConfig = "defi_config"
			branches   = "branches"
			contracts  = "contracts"
			node       = "https://nodes-testnet.wx.network"
		)

		log = zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).Level(zerolog.InfoLevel).With().Timestamp().Caller().Logger()

		mongouriP := promptui.Prompt{
			Label:       "Mongo uri ?",
			HideEntered: true,
		}
		mongouri, err := mongouriP.Run()
		if err != nil {
			printAndExit(err)
		}

		db, err := mongo.NewConn(ctx, defiConfig, mongouri)
		if err != nil {
			printAndExit(err)
		}
		branchModel := branch.NewModel(db.Collection(branches))

		stageP := promptui.Prompt{
			Label: "Index of the stage ?",
			Validate: func(s string) error {
				stg, err := strconv.Atoi(s)
				if err != nil {
					return fmt.Errorf("strconv.Atoi: %w", err)
				}

				exists, err := branchModel.StageExists(ctx, uint32(stg))
				if err != nil {
					return fmt.Errorf("branchModel.StageExists: %w", err)
				}

				if !exists {
					return errors.New("stage doesn't exist")
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
		confirmP := promptui.Prompt{
			Label:     fmt.Sprintf("Drop stage %d, are you sure", stageInt),
			IsConfirm: true,
		}
		_, err = confirmP.Run()
		if err != nil {
			printAndExit(err)
		}

		cl, err := client.NewClient(client.Options{
			BaseUrl: node,
			Client:  &http.Client{Timeout: time.Minute},
			ChainID: proto.TestNetScheme,
		})
		if err != nil {
			printAndExit(err)
		}

		stageFilter := bson.D{{Key: "stage", Value: stageInt}}
		contractCursor, err := db.Collection(contracts).Find(ctx, stageFilter)
		if err != nil {
			printAndExit(err)
		}
		for contractCursor.Next(ctx) {
			var res contract.Contract
			e := contractCursor.Decode(&res)
			if e != nil {
				printAndExit(e)
			}

			e = dropContract(res.SignerPrv, res.BasePub, ctx, cl)
			if e != nil {
				printAndExit(fmt.Errorf("dropContract: %s", e))
			}
			e = dropDataState(res.BasePrv, res.BasePub, ctx, cl)
			if e != nil {
				printAndExit(fmt.Errorf("dropDataState: %s", e))
			}
		}

		_, err = db.Collection(branches).DeleteMany(ctx, stageFilter)
		if err != nil {
			printAndExit(fmt.Errorf("branches.DeleteMany: %s", err))
		}

		_, err = db.Collection(contracts).DeleteMany(ctx, stageFilter)
		if err != nil {
			printAndExit(fmt.Errorf("contracts.DeleteMany: %s", err))
		}
		log.Info().Str("stage", stageStr).Msg("Stage dropped")
	},
}

func init() {
	rootCmd.AddCommand(dropStageCmd)
}

func getKeysFromBase58String(privateKeyBase58 string, publicKeyBase58 string) (crypto.SecretKey, crypto.PublicKey, proto.WavesAddress, error) {
	secretKey, err := crypto.NewSecretKeyFromBase58(privateKeyBase58)
	if err != nil {
		return crypto.SecretKey{}, crypto.PublicKey{}, proto.WavesAddress{}, fmt.Errorf("crypto.NewSecretKeyFromBase58: %s", err)
	}
	publicKey, err := crypto.NewPublicKeyFromBase58(publicKeyBase58)
	if err != nil {
		return crypto.SecretKey{}, crypto.PublicKey{}, proto.WavesAddress{}, fmt.Errorf("crypto.NewPublicKeyFromBase58: %s", err)
	}
	address, err := proto.NewAddressFromPublicKey(proto.TestNetScheme, publicKey)
	if err != nil {
		return crypto.SecretKey{}, crypto.PublicKey{}, proto.WavesAddress{}, fmt.Errorf("proto.NewAddressFromPublicKey: %s", err)
	}

	return secretKey, publicKey, address, nil
}

func dropContract(privateKeyBase58 string, publicKeyBase58 string, ctx context.Context, cl *client.Client) error {
	secretKey, publicKey, address, err := getKeysFromBase58String(privateKeyBase58, publicKeyBase58)
	if err != nil {
		return fmt.Errorf("getKeysFromBase58String: %s", err)
	}

	script, _, err := cl.Addresses.ScriptInfo(ctx, address)
	if err != nil {
		return fmt.Errorf("cl.Addresses.ScriptInfo: %s", err)
	}
	if script.Script == "" {
		log.Info().Str("address", address.String()).Msg("Empty script")
		return nil
	}

	dropScriptTx := proto.NewUnsignedSetScriptWithProofs(
		2,
		publicKey,
		nil,
		500000,
		tools.Timestamp(),
	)

	err = tools.SignBroadcastWait(ctx, proto.TestNetScheme, cl, dropScriptTx, secretKey)
	if err != nil {
		return fmt.Errorf("tools.SignBroadcastWait: %s", err)
	}

	log.Info().Str("address", address.String()).Msg("Script removed")
	return nil
}

func dropDataState(privateKeyBase58 string, publicKeyBase58 string, ctx context.Context, cl *client.Client) error {
	secretKey, publicKey, address, err := getKeysFromBase58String(privateKeyBase58, publicKeyBase58)
	if err != nil {
		return fmt.Errorf("getKeysFromBase58String: %s", err)
	}
	dState, _, err := cl.Addresses.AddressesData(ctx, address)
	if err != nil {
		return fmt.Errorf("cl.Addresses.AddressesData: %s", err)
	}
	if len(dState) == 0 {
		log.Info().Str("address", address.String()).Msg("Data state is empty")
		return nil
	}

	dividedState := []proto.DataEntries{}
	chunkSize := 100
	for i := 0; i < len(dState); i += chunkSize {
		end := i + chunkSize
		if end > len(dState) {
			end = len(dState)
		}
		dividedState = append(dividedState, dState[i:end])
	}
	for _, chunk := range dividedState {
		dataTx := proto.NewUnsignedDataWithProofs(
			2,
			publicKey,
			500000,
			tools.Timestamp(),
		)
		for _, row := range chunk {
			dataTx.AppendEntry(
				&proto.DeleteDataEntry{
					Key: row.GetKey(),
				},
			)
		}
		e := tools.SignBroadcastWait(ctx, proto.TestNetScheme, cl, dataTx, secretKey)
		if e != nil {
			return fmt.Errorf("tools.SignBroadcastWait: %s", e)
		}
	}
	log.Info().Str("address", address.String()).Msg("Data state cleared")
	return nil
}
