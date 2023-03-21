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

			wxAssetId   = "EMAMLxDnv3xiz8RXg8Btj33jcEw3wLczL3JKYYmuubpc"
			xtnAssetId  = "25FEqEjRkqK6yCkiT7Lz6SAYz7gUFCtxfCChnrVFD5AT"
			usdtAssetId = "5Sh9KghfkZyhjwuodovDhB6PghDUGBHiAPZ4MkrPgKtX"
			usdcAssetId = "A7Ksh7fXyqm1KhKAiK3bAB2aiPSitQQF6v1pyu9SS3FR"

			factoryV2PriceDecimals = 100000000

			emissionratePerBlockMax = 19025875190
			emissionratePerBlock    = 3805175038
			emissionStartBlock      = 1806750
			emissionDuration        = 5256000
			emissionStartTimestamp  = 1637580329884

			userPoolspriceAssetsMinAmount = "7000000"
			userPoolsAmountAssetMinAmount = 100000
			userPoolsFeeAmount            = 1000

			votingVerifiedFeeAmountPrm             = 10000000
			votingVerifiedVotingThresholdPrm       = 10000000
			votingVerifiedVotingDurationPrm        = 10
			votingVerifiedVoteBeforeEliminationPrm = 3
			votingVerifiedMaxDepthPrm              = 10

			votingEmissionCandidateFeeAmountPrm      = 100000000
			votingEmissionCandidateVotingDurationPrm = 10
			votingEmissionCandidateFinalizeRewardPrm = 10
			votingEmissionCandidateThreshold         = 100000000

			boostingMinLockAmount = 500000000
			boostingMinDuration   = 2
			boostingMaxDuration   = 2628000

			votingEmissionEpochLength = 10

			otcMultiassetWithdrawDelay     = 2
			otcMultiassetDepositFee        = 20
			otcMultiassetWithdrawFee       = 2
			otcMultiassetMinAmountDeposit  = 1000000
			otcMultiassetMinAmountWithdraw = 1000000
			otcMultiassetPairStatus        = 0
		)

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

		currentHeight, _, err := cl.Blocks.Height(ctx)
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

		assetStoreAcc, err := genAccData(seed, stage, 3)
		if err != nil {
			printAndExit(err)
		}

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

		boostingAcc, err := genAccData(seed, stage, 7)
		if err != nil {
			printAndExit(err)
		}

		votingEmissionAcc, err := genAccData(seed, stage, 8)
		if err != nil {
			printAndExit(err)
		}

		gwxRewardAcc, err := genAccData(seed, stage, 9) //AKA Math Contract
		if err != nil {
			printAndExit(err)
		}

		stakingAcc, err := genAccData(seed, stage, 10)
		if err != nil {
			printAndExit(err)
		}

		proposalAcc, err := genAccData(seed, stage, 11)
		if err != nil {
			printAndExit(err)
		}

		otcMultiassetAcc, err := genAccData(seed, stage, 12)
		if err != nil {
			printAndExit(err)
		}

		vestingMultiassetAcc, err := genAccData(seed, stage, 13)
		if err != nil {
			printAndExit(err)
		}

		referralAcc, err := genAccData(seed, stage, 14)
		if err != nil {
			printAndExit(err)
		}

		marketingAcc, err := genAccData(seed, stage, 15)
		if err != nil {
			printAndExit(err)
		}

		restAcc, err := genAccData(seed, stage, 16)
		if err != nil {
			printAndExit(err)
		}

		lpStakingV2Acc, err := genAccData(seed, stage, 17)
		if err != nil {
			printAndExit(err)
		}

		// TODO: Harcoded public key in verifier
		//
		// lpStakingAcc, err := genAccData(seed, stage, 17)
		// if err != nil {
		// 	printAndExit(err)
		// }

		vestingAcc, err := genAccData(seed, stage, 18)
		if err != nil {
			printAndExit(err)
		}

		lpPoolStakingStableAcc, err := genAccData(seed, stage, 19)
		if err != nil {
			printAndExit(err)
		}

		slippageAcc, err := genAccData(seed, stage, 20)
		if err != nil {
			printAndExit(err)
		}

		// TODO: Harcoded caller address in constructor
		idoAcc, err := genAccData(seed, stage, 21)
		if err != nil {
			printAndExit(err)
		}

		teamAcc, err := genAccData(seed, stage, 21)
		if err != nil {
			printAndExit(err)
		}

		matcherAcc, err := genAccData(seed, stage, 22)
		if err != nil {
			printAndExit(err)
		}

		daoAcc, err := genAccData(seed, stage, 23)
		if err != nil {
			printAndExit(err)
		}

		earlybirdsAcc, err := genAccData(seed, stage, 24)
		if err != nil {
			printAndExit(err)
		}

		factory, err := genAccData(seed, stage, 25)
		if err != nil {
			printAndExit(err)
		}

		lpPoolNonStableAcc, err := genAccData(seed, stage, 26)
		if err != nil {
			printAndExit(err)
		}

		swapAcc, err := genAccData(seed, stage, 27)
		if err != nil {
			printAndExit(err)
		}

		lpStakingPoolsAcc, err := genAccData(seed, stage, 28)
		if err != nil {
			printAndExit(err)
		}

		// New XTN, USDT, BTC asset issue txs
		newXtnTx := proto.NewUnsignedIssueWithProofs(
			2,
			proto.TestNetScheme,
			managerAcc.publicKey,
			fmt.Sprintf("XTN_%d", stageInt),
			fmt.Sprintf("XTN Token. Stage %d, Timestamp: %d", stageInt, tools.Timestamp()),
			100000000000000,
			6,
			true,
			nil,
			tools.Timestamp(),
			100000000,
		)

		err = newXtnTx.GenerateID(proto.TestNetScheme)
		if err != nil {
			printAndExit(err)
		}

		newUsdtTx := proto.NewUnsignedIssueWithProofs(
			2,
			proto.TestNetScheme,
			managerAcc.publicKey,
			fmt.Sprintf("USDT_%d", stageInt),
			fmt.Sprintf("USDT Token. Stage %d. Timestamp: %d", stageInt, tools.Timestamp()),
			100000000000000,
			6,
			true,
			nil,
			tools.Timestamp(),
			100000000,
		)

		err = newUsdtTx.GenerateID(proto.TestNetScheme)
		if err != nil {
			printAndExit(err)
		}

		newBtcTx := proto.NewUnsignedIssueWithProofs(
			2,
			proto.TestNetScheme,
			managerAcc.publicKey,
			fmt.Sprintf("BTC_%d", stageInt),
			fmt.Sprintf("BTC Token. Stage %d. Timestamp: %d", stageInt, tools.Timestamp()),
			100000000000000,
			8,
			true,
			nil,
			tools.Timestamp(),
			100000000,
		)

		err = newBtcTx.GenerateID(proto.TestNetScheme)
		if err != nil {
			printAndExit(err)
		}

		// Send Waves to manager for constructor invokes
		err = tools.SignBroadcastWait(
			ctx,
			proto.TestNetScheme,
			cl,
			proto.NewUnsignedTransferWithProofs(
				3,
				crypto.GeneratePublicKey(gazPrv),
				proto.NewOptionalAssetWaves(),
				proto.NewOptionalAssetWaves(),
				tools.Timestamp(),
				1000000000,
				100000,
				managerAcc.recipient,
				nil,
			),
			gazPrv,
		)
		if err != nil {
			printAndExit(err)
		}

		// Broadcast token issue txs
		err = tools.SignBroadcastWait(
			ctx,
			proto.TestNetScheme,
			cl,
			newXtnTx,
			managerAcc.privateKey,
		)
		if err != nil {
			printAndExit(err)
		}
		err = tools.SignBroadcastWait(
			ctx,
			proto.TestNetScheme,
			cl,
			newUsdtTx,
			managerAcc.privateKey,
		)
		if err != nil {
			printAndExit(err)
		}
		err = tools.SignBroadcastWait(
			ctx,
			proto.TestNetScheme,
			cl,
			newBtcTx,
			managerAcc.privateKey,
		)
		if err != nil {
			printAndExit(err)
		}

		// Deploy contracts
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
				&proto.StringDataEntry{
					Key:   "%s__adminPubKeys",
					Value: managerAcc.publicKey.String() + "__" + factoryV2Acc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__allowedLpScriptHash",
					Value: "VOo/GiKEfK3TXqhWxB5yL+0bK9BsAj9576Wx2OqjrTw=",
				},
				&proto.StringDataEntry{
					Key:   "%s__allowedLpStableScriptHash",
					Value: "OguhYf9kEOukc3nE/D0DNlhhumCfofRtMuEH1fC43f8=",
				},
				&proto.DeleteDataEntry{
					Key: "%s%s%s__" + lpPoolStakingStableAcc.address.String() + "__mappings__poolContract2PoolAssets",
				},
				&proto.DeleteDataEntry{
					Key: "%s%s%s__" + lpPoolNonStableAcc.address.String() + "__mappings__poolContract2PoolAssets",
				},
				&proto.StringDataEntry{
					Key:   "%s__swapContract",
					Value: swapAcc.address.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(stakingAcc.address.String()),
							proto.NewStringArgument(boostingAcc.address.String()),
							proto.NewStringArgument(idoAcc.address.String()),
							proto.NewStringArgument(teamAcc.address.String()),
							proto.NewStringArgument(emissionAcc.address.String()),
							proto.NewStringArgument(restAcc.address.String()),
							proto.NewStringArgument(slippageAcc.address.String()),
							proto.NewIntegerArgument(factoryV2PriceDecimals),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "constructorV2",
						Arguments: proto.Arguments{
							proto.NewStringArgument(matcherAcc.publicKey.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "constructorV3",
						Arguments: proto.Arguments{
							proto.NewStringArgument(daoAcc.address.String()),
							proto.NewStringArgument(marketingAcc.address.String()),
							proto.NewStringArgument(gwxRewardAcc.address.String()),
							proto.NewStringArgument(earlybirdsAcc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "constructorV4",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factory.address.String()),
							proto.ListArgument{Items: proto.Arguments{}},
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "constructorV5",
						Arguments: proto.Arguments{
							proto.NewStringArgument(assetStoreAcc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "constructorV6",
						Arguments: proto.Arguments{
							proto.NewStringArgument(emissionAcc.address.String()),
							proto.ListArgument{Items: proto.Arguments{
								proto.NewStringArgument("WAVES"),
								proto.NewStringArgument(newUsdtTx.ID.String()),
							}},
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = factoryV2.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("factoryV2.Deploy: %w", err))
		}

		slippage := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			slippageAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"slippage",
			"slippage.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__factoryContract",
					Value: slippageAcc.address.String(),
				},
			},
			nil,
		)

		err = slippage.Deploy(ctx)
		if err != nil {
			printAndExit(err)
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
							proto.NewIntegerArgument(emissionratePerBlockMax),
							proto.NewIntegerArgument(emissionratePerBlock),
							proto.NewIntegerArgument(emissionStartBlock),
							proto.NewIntegerArgument(emissionDuration),
							proto.NewIntegerArgument(emissionStartTimestamp),
							proto.NewStringArgument(wxAssetId),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					emissionAcc.recipient,
					proto.FunctionCall{
						Name: "constructorV2",
						Arguments: proto.Arguments{
							proto.NewStringArgument(votingVerifiedAcc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = emission.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("emission.Deploy: %w", err))
		}

		assetsStore := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			assetStoreAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"assets_store",
			"assets_store.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__adminPubKeys",
					Value: managerAcc.publicKey.String() + "__" + factoryV2Acc.publicKey.String() + "__" + lpStakingPoolsAcc.publicKey.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					assetStoreAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(userPoolsAcc.address.String()),
							proto.ListArgument{Items: proto.Arguments{
								proto.NewStringArgument("COMMUNITY_VERIFIED"),
								proto.NewStringArgument("GATEWAY"),
								proto.NewStringArgument("STABLECOIN"),
								proto.NewStringArgument("STAKING_LP"),
								proto.NewStringArgument("3RD_PARTY"),
								proto.NewStringArgument("ALGO_LP"),
								proto.NewStringArgument("LAMBO_LP"),
								proto.NewStringArgument("POOLS_LP"),
								proto.NewStringArgument("WX"),
								proto.NewStringArgument("PEPE"),
							}},
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					assetStoreAcc.recipient,
					proto.FunctionCall{
						Name: "constructorV2",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factoryV2Acc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = assetsStore.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("assetsStore.Deploy: %w", err))
		}

		lpPoolStakingStable := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			lpPoolStakingStableAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"XTN_2/USDT_2 pool",
			"lp_stable.ride",
			stage,
			true,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__amp",
					Value: "1000",
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					lpPoolStakingStableAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factoryV2Acc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "activateNewPool",
						Arguments: proto.Arguments{
							proto.NewStringArgument(lpPoolStakingStableAcc.address.String()),
							proto.NewStringArgument(newXtnTx.ID.String()),
							proto.NewStringArgument(newUsdtTx.ID.String()),
							proto.NewStringArgument(fmt.Sprintf("XTNUSDTLP_%d", stageInt)),
							proto.NewStringArgument(fmt.Sprintf("XTN/USDT Pool. Stage %d description", stageInt)),
							proto.NewIntegerArgument(0),
							proto.NewStringArgument(""),
							proto.NewStringArgument(""),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					100500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					lpPoolStakingStableAcc.recipient,
					proto.FunctionCall{
						Name: "put",
						Arguments: proto.Arguments{
							proto.NewIntegerArgument(3),
							proto.BooleanArgument{Value: false},
						},
					},
					proto.ScriptPayments{
						proto.ScriptPayment{
							Amount: 100000000,
							Asset:  proto.NewOptionalAsset(true, *newXtnTx.ID),
						},
						proto.ScriptPayment{
							Amount: 100000000,
							Asset:  proto.NewOptionalAsset(true, *newUsdtTx.ID),
						},
					},
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = lpPoolStakingStable.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("lpPoolStakingStable.Deploy: %w", err))
		}

		lpPoolNonStable := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			lpPoolNonStableAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"BTC_2/USDT_2 pool",
			"lp.ride",
			stage,
			true,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__factoryContract",
					Value: factoryV2Acc.address.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					factoryV2Acc.recipient,
					proto.FunctionCall{
						Name: "activateNewPool",
						Arguments: proto.Arguments{
							proto.NewStringArgument(lpPoolNonStableAcc.address.String()),
							proto.NewStringArgument(newBtcTx.ID.String()),
							proto.NewStringArgument(newUsdtTx.ID.String()),
							proto.NewStringArgument(fmt.Sprintf("BTCUSDTLP_%d", stageInt)),
							proto.NewStringArgument(fmt.Sprintf("BTC/USDT Pool. Stage %d description", stageInt)),
							proto.NewIntegerArgument(0),
							proto.NewStringArgument(""),
							proto.NewStringArgument(""),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					100500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					lpPoolNonStableAcc.recipient,
					proto.FunctionCall{
						Name: "put",
						Arguments: proto.Arguments{
							proto.NewIntegerArgument(3),
							proto.BooleanArgument{Value: false},
						},
					},
					proto.ScriptPayments{
						proto.ScriptPayment{
							Amount: 100000000,
							Asset:  proto.NewOptionalAsset(true, *newBtcTx.ID),
						},
						proto.ScriptPayment{
							Amount: 1000000000,
							Asset:  proto.NewOptionalAsset(true, *newUsdtTx.ID),
						},
					},
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = lpPoolNonStable.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("lpPoolNonStable.Deploy: %w", err))
		}

		userPools := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			userPoolsAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"user_pools",
			"user_pools.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__factoryContract",
					Value: factoryV2Acc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__assetsStoreContract",
					Value: assetStoreAcc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__emissionContract",
					Value: emissionAcc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__priceAssetIds",
					Value: "WAVES",
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					userPoolsAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factoryV2Acc.address.String()),
							proto.NewStringArgument(assetStoreAcc.address.String()),
							proto.NewStringArgument(emissionAcc.address.String()),
							proto.ListArgument{Items: proto.Arguments{
								proto.NewStringArgument(userPoolspriceAssetsMinAmount),
							}},
							proto.NewIntegerArgument(userPoolsAmountAssetMinAmount),
							proto.NewStringArgument(wxAssetId),
							proto.NewIntegerArgument(userPoolsFeeAmount),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = userPools.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("userPools.Deploy: %w", err))
		}

		votingVerified := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			votingVerifiedAcc.privateKey,
			votingVerifiedAcc.privateKey,
			gazPrv,
			"voting_verified",
			"voting_verified.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					votingVerifiedAcc.publicKey,
					votingVerifiedAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(boostingAcc.address.String()),
							proto.NewStringArgument(emissionAcc.address.String()),
							proto.NewStringArgument(assetStoreAcc.address.String()),
							proto.NewIntegerArgument(votingVerifiedFeeAmountPrm),
							proto.NewStringArgument(wxAssetId),
							proto.NewIntegerArgument(votingVerifiedVotingThresholdPrm),
							proto.NewIntegerArgument(votingVerifiedVotingDurationPrm),
							proto.NewIntegerArgument(votingVerifiedVoteBeforeEliminationPrm),
							proto.NewIntegerArgument(int64(currentHeight.Height)),
							proto.NewIntegerArgument(votingVerifiedMaxDepthPrm),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					900000,
					tools.Timestamp(),
				),
			},
		)

		err = votingVerified.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("votingVerified.Deploy: %w", err))
		}

		votingEmissionCandidate := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			votingEmissionCandidateAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"voting_emission_candidate",
			"voting_emission_candidate.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					votingEmissionCandidateAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(assetStoreAcc.address.String()),
							proto.NewStringArgument(boostingAcc.address.String()),
							proto.NewStringArgument(emissionAcc.address.String()),
							proto.NewStringArgument(factoryV2Acc.address.String()),
							proto.NewStringArgument(userPoolsAcc.address.String()),
							proto.NewStringArgument(votingEmissionAcc.address.String()),
							proto.NewIntegerArgument(votingEmissionCandidateFeeAmountPrm),
							proto.NewStringArgument(wxAssetId),
							proto.NewIntegerArgument(votingEmissionCandidateVotingDurationPrm),
							proto.NewStringArgument(xtnAssetId),
							proto.NewIntegerArgument(votingEmissionCandidateFinalizeRewardPrm),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					votingEmissionCandidateAcc.recipient,
					proto.FunctionCall{
						Name: "constructorV2",
						Arguments: proto.Arguments{
							proto.NewIntegerArgument(votingEmissionCandidateThreshold),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = votingEmissionCandidate.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("votingEmissionCandidate.Deploy: %w", err))
		}

		boosting := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			boostingAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"boosting",
			"boosting.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__lpStakingPoolsContract",
					Value: lpStakingPoolsAcc.address.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					boostingAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factoryV2Acc.address.String()),
							proto.NewStringArgument(wxAssetId),
							proto.NewIntegerArgument(boostingMinLockAmount),
							proto.NewIntegerArgument(boostingMinDuration),
							proto.NewIntegerArgument(boostingMaxDuration),
							proto.NewStringArgument(gwxRewardAcc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = boosting.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("boosting.Deploy: %w", err))
		}

		votingEmission := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			votingEmissionAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"voting_emission",
			"voting_emission.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					votingEmissionAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factoryV2Acc.address.String()),
							proto.NewStringArgument(votingEmissionCandidateAcc.address.String()),
							proto.NewStringArgument(boostingAcc.address.String()),
							proto.NewStringArgument(stakingAcc.address.String()),
							proto.NewIntegerArgument(votingEmissionEpochLength),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = votingEmission.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("votingEmission.Deploy: %w", err))
		}

		staking := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			stakingAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"staking",
			"staking.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__lpStakingPoolsContract",
					Value: lpStakingPoolsAcc.address.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					stakingAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factoryV2Acc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					stakingAcc.recipient,
					proto.FunctionCall{
						Name: "constructorV2",
						Arguments: proto.Arguments{
							proto.NewStringArgument(votingEmissionAcc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = staking.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("staking.Deploy: %w", err))
		}

		proposal := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			proposalAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"proposal",
			"proposal.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					// Known typo
					Key:   "%s__managerPublicpKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			nil,
		)

		err = proposal.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("proposal.Deploy: %w", err))
		}

		otcMultiasset := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			otcMultiassetAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"otc_multiasset",
			"otc_multiasset.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					otcMultiassetAcc.recipient,
					proto.FunctionCall{
						Name: "registerAsset",
						Arguments: proto.Arguments{
							proto.NewStringArgument(usdtAssetId),
							proto.NewStringArgument(xtnAssetId),
							proto.NewIntegerArgument(otcMultiassetWithdrawDelay),
							proto.NewIntegerArgument(otcMultiassetDepositFee),
							proto.NewIntegerArgument(otcMultiassetWithdrawFee),
							proto.NewIntegerArgument(otcMultiassetMinAmountDeposit),
							proto.NewIntegerArgument(otcMultiassetMinAmountWithdraw),
							proto.NewIntegerArgument(otcMultiassetPairStatus),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = otcMultiasset.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("otcMultiasset.Deploy: %w", err))
		}

		gwxReward := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			gwxRewardAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"gwx_reward",
			"gwx_reward.ride",
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

		err = gwxReward.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("gwxReward.Deploy: %w", err))
		}

		vestingMultiasset := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			vestingMultiassetAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"vesting_multiasset",
			"vesting_multiasset.ride",
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

		err = vestingMultiasset.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("vestingMultiasset.Deploy: %w", err))
		}

		referral := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			referralAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"referral",
			"referral.ride",
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

		err = referral.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("referral.Deploy: %w", err))
		}

		marketing := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			marketingAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"marketing",
			"marketing.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			nil, // Hardcoded caller in constructor
		)

		err = marketing.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("marketing.Deploy: %w", err))
		}

		rest := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			restAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"rest",
			"rest.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					restAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(factoryV2Acc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = rest.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("rest.Deploy: %w", err))
		}

		lpStakingV2 := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			lpStakingV2Acc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"lp_staking_v2",
			"lp_staking_v2.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__lpStakingPoolsContract",
					Value: lpStakingPoolsAcc.address.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					lpStakingV2Acc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
							proto.NewStringArgument(assetStoreAcc.address.String()),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					500000,
					tools.Timestamp(),
				),
			},
		)

		err = lpStakingV2.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("lpStakingV2.Deploy: %w", err))
		}

		// TODO: Harcoded public key in verifier
		//
		// lpStaking := cli_contract.New(
		// 	proto.TestNetScheme,
		// 	cl,
		// 	contractModel,
		// 	lpStakingAcc.privateKey,
		// 	managerAcc.privateKey,
		// 	gazPrv,
		// 	"lp_staking",
		// 	"lp_staking.ride",
		// 	stage,
		// 	false,
		// 	[]proto.DataEntry{
		// 		&proto.StringDataEntry{
		// 			Key:   "%s__managerPublicKey",
		// 			Value: managerAcc.publicKey.String(),
		// 		},
		// 	},
		// 	nil,
		// )

		// err = lpStaking.Deploy(ctx)
		// if err != nil {
		// 	printAndExit(fmt.Errorf("lpStaking.Deploy: %w", err))
		// }

		vesting := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			vestingAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"vesting",
			"vesting.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					vestingAcc.recipient,
					proto.FunctionCall{
						Name: "constructor",
						Arguments: proto.Arguments{
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

		err = vesting.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("vesting.Deploy: %w", err))
		}

		swap := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			lpStakingPoolsAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"swap",
			"swap.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__factoryContract",
					Value: factoryV2Acc.address.String(),
				},
				&proto.IntegerDataEntry{
					Key:   "%s__protocolFee",
					Value: 100000,
				},
				&proto.IntegerDataEntry{
					Key:   "%s__poolFee",
					Value: 200000,
				},
			},
			nil,
		)

		err = swap.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("swap.Deploy: %w", err))
		}

		lpStakingPools := cli_contract.New(
			proto.TestNetScheme,
			cl,
			contractModel,
			lpStakingPoolsAcc.privateKey,
			managerAcc.privateKey,
			gazPrv,
			"lp_staking_pools",
			"lp_staking_pools.ride",
			stage,
			false,
			[]proto.DataEntry{
				&proto.StringDataEntry{
					Key:   "%s__managerPublicKey",
					Value: managerAcc.publicKey.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__factoryContract",
					Value: factoryV2Acc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__assetsStoreContract",
					Value: assetStoreAcc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__lpStakingContract",
					Value: lpStakingV2Acc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__stakingContract",
					Value: stakingAcc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__boostingContract",
					Value: boostingAcc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__swapContract",
					Value: swapAcc.address.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__usdtAssetId",
					Value: newUsdtTx.ID.String(),
				},
				&proto.StringDataEntry{
					Key:   "%s__wxAssetId",
					Value: wxAssetId,
				},
				&proto.IntegerDataEntry{
					Key:   "%s__minDelay",
					Value: 60,
				},
				&proto.IntegerDataEntry{
					Key:   "%s__lockFraction",
					Value: 100000000,
				},
			},
			[]*proto.InvokeScriptWithProofs{
				proto.NewUnsignedInvokeScriptWithProofs(
					1,
					proto.TestNetScheme,
					managerAcc.publicKey,
					lpStakingPoolsAcc.recipient,
					proto.FunctionCall{
						Name: "create",
						Arguments: proto.Arguments{
							proto.NewStringArgument(newBtcTx.ID.String()),
							proto.NewStringArgument(""),
							proto.NewStringArgument("newBTC"),
							proto.NewStringArgument("newBTCToken"),
							proto.NewStringArgument(""),
						},
					},
					nil,
					proto.NewOptionalAssetWaves(),
					110500000,
					tools.Timestamp(),
				),
			},
		)

		err = lpStakingPools.Deploy(ctx)
		if err != nil {
			printAndExit(fmt.Errorf("lp_staking_pools.Deploy: %w", err))
		}

		// Save contracts to mongo
		sess, err := db.Client().StartSession()
		if err != nil {
			printAndExit(err)
		}
		_, err = sess.WithTransaction(ctx, func(sc m.SessionContext) (interface{}, error) {
			e := branchModel.Create(sc, defaultBranch, config.Testnet, stage)
			if e != nil {
				return nil, fmt.Errorf("branchModel.Create: %w", e)
			}

			e = factoryV2.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("factoryV2.Save: %w", e)
			}

			e = slippage.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("slippage.Save: %w", e)
			}

			e = emission.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("emission.Save: %w", e)
			}

			e = assetsStore.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("assetsStore.Save: %w", e)
			}

			e = lpPoolStakingStable.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("lpPoolStakingStable.Save: %w", e)
			}

			e = userPools.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("userPools.Save: %w", e)
			}

			e = votingVerified.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("votingVerified.Save: %w", e)
			}

			e = votingEmissionCandidate.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("votingEmissionCandidate.Save: %w", e)
			}

			e = boosting.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("boosting.Save: %w", e)
			}

			e = votingEmission.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("votingEmission.Save: %w", e)
			}

			e = staking.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("staking.Save: %w", e)
			}

			e = proposal.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("proposal.Save: %w", e)
			}

			e = otcMultiasset.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("otcMultiasset.Save: %w", e)
			}

			e = gwxReward.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("gwxReward.Save: %w", e)
			}

			e = vestingMultiasset.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("vestingMultiasset.Save: %w", e)
			}

			e = referral.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("referral.Save: %w", e)
			}

			e = marketing.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("marketing.Save: %w", e)
			}

			e = rest.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("rest.Save: %w", e)
			}

			e = lpStakingV2.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("lpStakingV2.Save: %w", e)
			}

			// TODO: Harcoded public key in verifier
			//
			// e = lpStaking.Save(sc)
			// if e != nil {
			// 	return nil, fmt.Errorf("lpStaking.Save: %w", e)
			// }

			e = vesting.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("vesting.Save: %w", e)
			}

			e = swap.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("swap.Save: %w", e)
			}

			e = lpStakingPools.Save(sc)
			if e != nil {
				return nil, fmt.Errorf("lp_staking_pools.Save: %w", e)
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
