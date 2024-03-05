# L2MP Leasing

## Keys
| key                                    |      type | value                                                                                                | description                                                                                                                                |
| :------------------------------------- | --------: | :--------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `%s__{nodeAddress}`                    |  `String` | `'%d%d%d%d__{currentPeriodHeight}__{currentLeasingAmount}__{nextPeriodHeight}__{nextLeasingAmount}'` | `nodeAddress` total leasing data                                                                                                           |
| `%s%s__{nodeAddress}__{userAddress}`   |  `String` | `'%d%d%d%d__{currentPeriodHeight}__{currentLeasingAmount}__{nextPeriodHeight}__{nextLeasingAmount}'` | `userAddress` leasing data for `nodeAddress`                                                                                               |
| `%s%s__toClaim__{userAddress}`         |  `String` | `'%d%d%d%d__{currentPeriodHeight}__{unlockedAmount}__{nextPeriodHeight}__{lockedAmount}'`            | `userAddress` claim and unlock balances. `lockedAmount` is locked until `nextPeriodHeight`. `unlockedAmount` currently available for claim |
| `%s%s__userTotalLocked__{userAddress}` | `Integer` | `1012345678`                                                                                         | `userAddress` total leased                                                                                                                 |
| `%s__assetId`                          |  `String` | `'ABCD...'`                                                                                          | Leasing `AssetId`                                                                                                                          |
| `%s__periodLength`                     | `Integer` | `10000`                                                                                              | Period length in blocks (Default: 10000)                                                                                                   |
| `%s__offsetHeight`                     | `Integer` | `1234567`                                                                                            | First period height                                                                                                                        |
| `%s__adminAddressList`                 |  `String` | `'{address1}__{address2}__...'`                                                                      | List of Admin Addresses                                                                                                                    |
| `%s__forceStop`                        | `Boolean` | `false`                                                                                              | Force stop contract flag                                                                                                                   |

# Functions

## User Claim Data READONLY
```
# User data
# Return tuple:
# _1 = current period start height
# _2 = current period available to claim
# _3 = next period start height
# _4 = next period available to claim
# _5 = total leased amount
# _6 = current height
@Callable(i)
func getUserDataREADONLY(userAddress: String)
```


## Node Leasing Data READONLY
```
# Node leasing data
# Return tuple:
# _1 = current period start height
# _2 = current period leased amount
# _3 = next period start height
# _4 = next period leased amount
# _5 = current height
@Callable(i)
func getNodeDataREADONLY(nodeAddress: String)
```

## User Leasing to Node Data READONLY
```
# Node leasing data
# Return tuple:
# _1 = current period start height
# _2 = current period leased amount
# _3 = next period start height
# _4 = next period leased amount
# _5 = current height
@Callable(i)
func getUserLeasingDataREADONLY(nodeAddress: String, userAddress: String)
```

## Lease
- Require 1 payment in `assetId`
```
@Callable(i)
func lease(nodeAddress: String)
```


## Lease by Address
- Require 1 payment in `assetId`
```
@Callable(i)
func leaseByAddress(nodeAddress: String, userAddress: String)
```


## Lease from locked
- `amount` should be less or equal (`unlockedAmount` + `lockedAmount` + `paymentAmount`)
```
@Callable(i)
func leaseFromLocked(nodeAddress: String, amount: Int)
```


## Cancel lease
```
@Callable(i)
func cancelLease(nodeAddress: String, amount: Int)
```


## Claim unlocked
```
@Callable(i)
func claimAll()
```


## Claim from unlocked amount
```
@Callable(i)
func claim(amount: Int)
```
