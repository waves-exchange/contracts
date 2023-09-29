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
  User ->> Factory: request account
  activate Factory
  Note over User, Factory: payment = reward amount
  Note over Factory: save owner, request id
  Factory -->> Creator: new request
  deactivate Factory
  activate Creator
  Creator ->> Account: set script, init
  Note over Account: save creator, owner
  Creator ->> Factory: complete request with account
  activate Factory
  deactivate Creator
  Note over Factory: check account script, owner, factory
  Factory ->> Account: approve
  Note over Account: lock script
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
