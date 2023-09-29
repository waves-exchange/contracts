### Participants

- factory
  - service address in storage can be changed by the voting
- owner
  - can call the account callable functions
- account
  - allow orders signed by bot
  - pass functions to service
  - script can't be updated
- bot
  - can use account for trading
- service
  - script can't be updated
  - functions for account

### Storage

#### Factory

| key                                                 | type         | description                           |
| --------------------------------------------------- | ------------ | ------------------------------------- |
| `%s__servicePublicKey`                              | `ByteVector` | Service public key                    |
| `%s__botPublicKey`                                  | `ByteVector` | Bot public key                        |
| `%s__accountScript`                                 | `ByteVector` | Allowed account script                |
| `%s__rewardAmount`                                  | `Int`        | Reward amount                         |
| `%s%s__<accountId>__status`                         | `Integer`    | Account status (0 - empty, 1 - ready) |
| `%s%s__<accountId>__ownerPublicKey`                 | `ByteVector` | Account owner                         |
| `%s%s__<accountId>__creatorPublicKey`               | `ByteVector` | Account creator                       |
| `%s%s__<accountId>__amountAssetId`                  | `ByteVector` | Account amount asset id               |
| `%s%s__<accountId>__priceAssetId`                   | `ByteVector` | Account price asset id                |
| `%s%s__<accountId>__accountIdToAccountPublicKey`    | `ByteVector` | Account id → account public key       |
| `%s%s__<accountAddress>__accountAddressToAccountId` | `String`     | Account address → account id          |

#### Account

| key                    | type         | description         |
| ---------------------- | ------------ | ------------------- |
| `%s__factoryPublicKey` | `ByteVector` | Factory public key  |

### Account creation

```mermaid
sequenceDiagram
  User ->> Factory: request(amount asset id, price asset id)
  activate Factory
  Note over User, Factory: payment = reward amount
  Note over Factory: account id = sha256(owner + amount asset id + price asset id)
  Note over Factory: status = 0, save owner, save assets ids
  Factory -->> Creator: new request
  deactivate Factory
  activate Creator
  Creator -->> Account: set script
  deactivate Creator
  Account ->> Account: init(requestId, factoryPublicKey, creatorPublicKey)
  activate Account
  Account ->> Factory: complete request with account
  activate Factory
  Note over Factory: check account script, status
  Note over Factory: save creator, status = 1
  Factory -->> Account: ok
  Note over Account: save factory in state thus lock script
  deactivate Account
  Factory ->> Creator: transfer reward to creator
  deactivate Factory
```

### Withdraw

```mermaid
sequenceDiagram
  User ->> Account: call(withdraw, recipient, amount)
  Account ->> Service: withdraw(recipient, amount)
  Service ->> Account: transfer(recipient, amount)
  Account ->> User: transfer specified amount
```
