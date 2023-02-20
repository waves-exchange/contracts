package cmd

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

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
)

type Account struct {
	privateKey crypto.SecretKey
	publicKey  crypto.PublicKey
	address    proto.Address
	recipient  proto.Recipient
}

const wxAssetId = "EMAMLxDnv3xiz8RXg8Btj33jcEw3wLczL3JKYYmuubpc"
const xtnAssetId = "25FEqEjRkqK6yCkiT7Lz6SAYz7gUFCtxfCChnrVFD5AT"

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
					return errors.New("stage with same index already exists")
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

			managerAcc, err := genAccData(seed, stage, 0)
			if err != nil {
				printAndExit(err)
			}

			factoryV2Acc, err := genAccData(seed, stage, 1)
			if err != nil {
				printAndExit(err)
			}

			emissionAcc, err := genAccData(seed, stage, 2)
			if err != nil {
				printAndExit(err)
			}

			// assetStoreAcc, err := genAccData(seed, stage, 3)
			// if err != nil {
			// 	printAndExit(err)
			// }

			userPoolsAcc, err := genAccData(seed, stage, 4)
			if err != nil {
				printAndExit(err)
			}

			votingVerifiedAcc, err := genAccData(seed, stage, 5)
			if err != nil {
				printAndExit(err)
			}

			votingEmissionCandidateAcc, err := genAccData(seed, stage, 6)
			if err != nil {
				printAndExit(err)
			}

			// boostingAcc, err := genAccData(seed, stage, 7)
			// if err != nil {
			// 	printAndExit(err)
			// }

			// votingEmissionAcc, err := genAccData(seed, stage, 8)
			// if err != nil {
			// 	printAndExit(err)
			// }

			err = tools.SignBroadcastWait(
				sc,
				proto.TestNetScheme,
				cl,
				proto.NewUnsignedTransferWithProofs(
					3,
					crypto.GeneratePublicKey(gazPrv),
					proto.NewOptionalAssetWaves(),
					proto.NewOptionalAssetWaves(),
					tools.Timestamp(),
					500000000,
					100000,
					managerAcc.recipient,
					nil,
				),
				gazPrv,
			)
			if err != nil {
				printAndExit(err)
			}

			factoryV2 := cli_contract.New(
				proto.TestNetScheme,
				cl,
				contractModel,
				factoryV2Acc.privateKey,
				managerAcc.privateKey,
				gazPrv,
				"factory_v2",
				"factory_v2.ride",
				stage,
				false,
				[]proto.DataEntry{
					&proto.StringDataEntry{
						Key:   "%s__managerPublicKey",
						Value: managerAcc.publicKey.String(),
					},
				},
				nil,
			)
			e = factoryV2.DeployAndSave(sc)
			if e != nil {
				return nil, fmt.Errorf("factoryV2.DeployAndSave: %w", e)
			}

			emission := cli_contract.New(
				proto.TestNetScheme,
				cl,
				contractModel,
				emissionAcc.privateKey,
				managerAcc.privateKey,
				gazPrv,
				"emission",
				"emission.ride",
				stage,
				false,
				[]proto.DataEntry{
					&proto.StringDataEntry{
						Key:   "%s__managerPublicKey",
						Value: managerAcc.publicKey.String(),
					},
					&proto.StringDataEntry{
						Key:   "%s%s__config__factoryAddress",
						Value: factoryV2Acc.address.String(),
					},
					&proto.StringDataEntry{
						Key:   "%s%s__config__votingVerifiedContract",
						Value: votingVerifiedAcc.address.String(),
					},
					&proto.StringDataEntry{
						Key:   "%s%s__config__votingEmissionCandidateContract",
						Value: votingEmissionCandidateAcc.address.String(),
					},
					&proto.StringDataEntry{
						Key:   "%s%s__config__userPoolsContract",
						Value: userPoolsAcc.address.String(),
					},
				},
				[]*proto.InvokeScriptWithProofs{
					proto.NewUnsignedInvokeScriptWithProofs(
						1,
						proto.TestNetScheme,
						managerAcc.publicKey,
						emissionAcc.recipient,
						proto.FunctionCall{
							Name: "constructor",
							Arguments: proto.Arguments{
								proto.NewStringArgument(factoryV2Acc.address.String()),
								proto.NewIntegerArgument(19025875190),
								proto.NewIntegerArgument(3805175038),
								proto.NewIntegerArgument(1806750),
								proto.NewIntegerArgument(5256000),
								proto.NewIntegerArgument(1637580329884),
								proto.NewStringArgument(wxAssetId),
							},
						},
						nil,
						proto.NewOptionalAssetWaves(),
						500000,
						tools.Timestamp(),
					),
				},
			)
			err = emission.DeployAndSave(sc)
			if err != nil {
				return nil, fmt.Errorf("emission.DeployAndSave: %w", err)
			}

			// assetsStore := cli_contract.New(
			// 	proto.TestNetScheme,
			// 	cl,
			// 	contractModel,
			// 	assetStoreAcc.privateKey,
			// 	managerAcc.privateKey,
			// 	gazPrv,
			// 	"assets_store",
			// 	"assets_store.ride",
			// 	stage,
			// 	false,
			// 	[]proto.DataEntry{
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__managerPublicKey",
			// 			Value: managerAcc.publicKey.String(),
			// 		},
			// 	},
			// 	[]*proto.InvokeScriptWithProofs{
			// 		proto.NewUnsignedInvokeScriptWithProofs(
			// 			1,
			// 			proto.TestNetScheme,
			// 			managerAcc.publicKey,
			// 			assetStoreAcc.recipient,
			// 			proto.FunctionCall{
			// 				Name: "constructor",
			// 				Arguments: proto.Arguments{
			// 					proto.NewStringArgument(userPoolsAcc.address.String()),
			// 					// proto.ListArgument{},
			// 				},
			// 			},
			// 			nil,
			// 			proto.NewOptionalAssetWaves(),
			// 			500000,
			// 			tools.Timestamp(),
			// 		),
			// 	},
			// )
			// err = assetsStore.DeployAndSave(sc)
			// if err != nil {
			// 	return nil, fmt.Errorf("assetsStore.DeployAndSave: %w", err)
			// }

			// userPools := cli_contract.New(
			// 	proto.TestNetScheme,
			// 	cl,
			// 	contractModel,
			// 	userPoolsAcc.privateKey,
			// 	managerAcc.privateKey,
			// 	gazPrv,
			// 	"user_pools",
			// 	"user_pools.ride",
			// 	stage,
			// 	false,
			// 	[]proto.DataEntry{
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__managerPublicKey",
			// 			Value: managerAcc.publicKey.String(),
			// 		},
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__factoryContract",
			// 			Value: factoryV2Acc.address.String(),
			// 		},
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__assetsStoreContract",
			// 			Value: assetStoreAcc.address.String(),
			// 		},
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__emissionContract",
			// 			Value: emissionAcc.address.String(),
			// 		},
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__priceAssetIds",
			// 			Value: "WAVES",
			// 		},
			// 	},
			// 	[]*proto.InvokeScriptWithProofs{
			// 		proto.NewUnsignedInvokeScriptWithProofs(
			// 			1,
			// 			proto.TestNetScheme,
			// 			managerAcc.publicKey,
			// 			userPoolsAcc.recipient,
			// 			proto.FunctionCall{
			// 				Name: "constructor",
			// 				Arguments: proto.Arguments{
			// 					proto.NewStringArgument(factoryV2Acc.address.String()),
			// 					proto.NewStringArgument(assetStoreAcc.address.String()),
			// 					proto.NewStringArgument(emissionAcc.address.String()),
			// 					proto.ListArgument{Items: proto.Arguments{
			// 						proto.NewStringArgument("7000000"),
			// 					}},
			// 					proto.NewIntegerArgument(100000),
			// 					proto.NewStringArgument(wxAssetId),
			// 					proto.NewIntegerArgument(1000),
			// 				},
			// 			},
			// 			nil,
			// 			proto.NewOptionalAssetWaves(),
			// 			500000,
			// 			tools.Timestamp(),
			// 		),
			// 	},
			// )
			// err = userPools.DeployAndSave(sc)
			// if err != nil {
			// 	return nil, fmt.Errorf("userPools.DeployAndSave: %w", err)
			// }

			// votingVerified := cli_contract.New(
			// 	proto.TestNetScheme,
			// 	cl,
			// 	contractModel,
			// 	votingVerifiedAcc.privateKey,
			// 	managerAcc.privateKey,
			// 	gazPrv,
			// 	"voting_verified",
			// 	"voting_verified.ride",
			// 	stage,
			// 	false,
			// 	[]proto.DataEntry{
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__managerPublicKey",
			// 			Value: managerAcc.publicKey.String(),
			// 		},
			// 	},
			// 	[]*proto.InvokeScriptWithProofs{
			// 		proto.NewUnsignedInvokeScriptWithProofs(
			// 			1,
			// 			proto.TestNetScheme,
			// 			managerAcc.publicKey,
			// 			votingVerifiedAcc.recipient,
			// 			proto.FunctionCall{
			// 				Name: "constructor",
			// 				Arguments: proto.Arguments{
			// 					proto.NewStringArgument(boostingAcc.address.String()),
			// 					proto.NewStringArgument(emissionAcc.address.String()),
			// 					proto.NewStringArgument(assetStoreAcc.address.String()),
			// 					proto.NewIntegerArgument(10000000),
			// 					proto.NewStringArgument(wxAssetId),
			// 					proto.NewIntegerArgument(10000000),
			// 					proto.NewIntegerArgument(10),
			// 					proto.NewIntegerArgument(3),
			// 					proto.NewIntegerArgument(3000),
			// 					proto.NewIntegerArgument(10),
			// 				},
			// 			},
			// 			nil,
			// 			proto.NewOptionalAssetWaves(),
			// 			500000,
			// 			tools.Timestamp(),
			// 		),
			// 	},
			// )
			// err = votingVerified.DeployAndSave(sc)
			// if err != nil {
			// 	return nil, fmt.Errorf("votingVerified.DeployAndSave: %w", err)
			// }

			// votingEmissionCandidate := cli_contract.New(
			// 	proto.TestNetScheme,
			// 	cl,
			// 	contractModel,
			// 	votingEmissionCandidateAcc.privateKey,
			// 	managerAcc.privateKey,
			// 	gazPrv,
			// 	"voting_emission_candidate",
			// 	"voting_emission_candidate.ride",
			// 	stage,
			// 	false,
			// 	[]proto.DataEntry{
			// 		&proto.StringDataEntry{
			// 			Key:   "%s__managerPublicKey",
			// 			Value: managerAcc.publicKey.String(),
			// 		},
			// 	},
			// 	[]*proto.InvokeScriptWithProofs{
			// 		proto.NewUnsignedInvokeScriptWithProofs(
			// 			1,
			// 			proto.TestNetScheme,
			// 			managerAcc.publicKey,
			// 			votingEmissionAcc.recipient,
			// 			proto.FunctionCall{
			// 				Name: "constructor",
			// 				Arguments: proto.Arguments{
			// 					proto.NewStringArgument(assetStoreAcc.address.String()),
			// 					proto.NewStringArgument(boostingAcc.address.String()),
			// 					proto.NewStringArgument(emissionAcc.address.String()),
			// 					proto.NewStringArgument(factoryV2Acc.address.String()),
			// 					proto.NewStringArgument(userPoolsAcc.address.String()),
			// 					proto.NewStringArgument(votingEmissionAcc.address.String()),
			// 					proto.NewIntegerArgument(100000000),
			// 					proto.NewStringArgument(wxAssetId),
			// 					proto.NewIntegerArgument(10),
			// 					proto.NewStringArgument(xtnAssetId),
			// 					proto.NewIntegerArgument(10),
			// 				},
			// 			},
			// 			nil,
			// 			proto.NewOptionalAssetWaves(),
			// 			500000,
			// 			tools.Timestamp(),
			// 		),
			// 		proto.NewUnsignedInvokeScriptWithProofs(
			// 			1,
			// 			proto.TestNetScheme,
			// 			managerAcc.publicKey,
			// 			votingEmissionAcc.recipient,
			// 			proto.FunctionCall{
			// 				Name: "constructorV2",
			// 				Arguments: proto.Arguments{
			// 					proto.NewIntegerArgument(100000000),
			// 				},
			// 			},
			// 			nil,
			// 			proto.NewOptionalAssetWaves(),
			// 			500000,
			// 			tools.Timestamp(),
			// 		),
			// 	},
			// )
			// err = votingEmissionCandidate.DeployAndSave(sc)
			// if err != nil {
			// 	return nil, fmt.Errorf("votingEmissionCandidate.DeployAndSave: %w", err)
			// }

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

func genAccData(seed string, stage, index uint32) (Account, error) {
	prv, pub, err := makeKeyPair(seed, stage, index)
	if err != nil {
		return Account{}, err
	}
	adr, err := proto.NewAddressFromPublicKey(proto.TestNetScheme, pub)
	if err != nil {
		return Account{}, err
	}
	rec := proto.NewRecipientFromAddress(adr)
	return Account{privateKey: prv, publicKey: pub, address: adr, recipient: rec}, nil
}
