package cmd

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/manifoldco/promptui"
	"github.com/spf13/cobra"
	"github.com/waves-exchange/contracts/deployer/pkg/branch"
	"github.com/waves-exchange/contracts/deployer/pkg/mongo"
	"go.mongodb.org/mongo-driver/bson"
)

var dropStageCmd = &cobra.Command{
	Use:   "drop-stage",
	Short: "Drop stage records in mongodb",
	Run: func(cmd *cobra.Command, args []string) {
		ctx := context.Background()

		const (
			defiConfig = "defi_config"
			branches   = "branches"
			contracts  = "contracts"
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
			Label:     fmt.Sprintf("Drop stage %d, are you sure?", stageInt),
			IsConfirm: true,
		}
		opt, err := confirmP.Run()
		if err != nil {
			printAndExit(err)
		}
		fmt.Println(opt)

		stageFilter := bson.D{{Key: "stage", Value: stageInt}}
		delBranch, err := db.Collection(branches).DeleteMany(ctx, stageFilter)
		if err != nil {
			fmt.Println(err)
		}
		fmt.Println(delBranch)

		delContracts, err := db.Collection(contracts).DeleteMany(ctx, stageFilter)
		if err != nil {
			fmt.Println(err)
		}
		fmt.Println(delContracts)
	},
}

func init() {
	rootCmd.AddCommand(dropStageCmd)
}
