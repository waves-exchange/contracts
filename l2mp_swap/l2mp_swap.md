# L2MP Swap

## Keys
| key                                  |      type | value                                                           |
| :----------------------------------- | --------: | :-------------------------------------------------------------- |
| `%s__stakingAddress`                 |  `String` | `'3PAbc...'`                                                    |
| `%s__assetInId`                      |  `String` | `'ABC...'`                                                      |
| `%s__assetOutId`                     |  `String` | `'ABC...'`                                                      |
| `%s__assetOutPrice`                  | `Integer` | `1000000`                                                       |
| `%s%s__stats__totalIn`               | `Integer` | `123456`                                                        |
| `%s%s__stats__totalOut`              | `Integer` | `12345678`                                                      |
| `%s%s%s__stats__totalIn__{address}`  | `Integer` | `12345`                                                         |
| `%s%s%s__stats__totalOut__{address}` | `Integer` | `1234567`                                                       |
| `%s%s%s__history__{address}__{txId}` |  `String` | `'%d%d%b%s__{AmountIn}__{amountOut}__{isStake}__{nodeAddress}'` |

# Functions

## Swap
- Should be with 1 payment in XTN
```
@Callable(i)
func swap() 
```

## Swap and Stake
- Should be with 1 payment in XTN

Arguments:
- `stakingNode` - base58 string of staking node address 

_Note: If `stakingNode` is equal to empty string (`""`) it swaps without staking_
```
@Callable(i)
func swapAndStake(stakingNode: String)
```