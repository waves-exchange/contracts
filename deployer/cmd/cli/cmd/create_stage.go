/*
Copyright © 2023 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
	"fmt"
	"github.com/manifoldco/promptui"
	"github.com/spf13/cobra"
	"os"
)

// createStageCmd represents the createStage command
var createStageCmd = &cobra.Command{
	Use:   "create-stage",
	Short: "Creates new testnet stage",
	Run: func(cmd *cobra.Command, args []string) {
		nameP := promptui.Prompt{
			Label: "Name of the new stage ?",
		}
		name, err := nameP.Run()
		if err != nil {
			printAndExit(err)
		}

		seedP := promptui.Prompt{
			Label:       "Base seed ?",
			HideEntered: true,
		}
		seed, err := seedP.Run()
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
