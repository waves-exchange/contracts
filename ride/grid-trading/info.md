### Participants:
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

### Account creation:
```mermaid
sequenceDiagram
  User ->> Factory: request account
  Note over Factory: save owner, reward id
  Creator ->> Account: set script, init
  Note over Account: save creator, owner
  Creator ->>+ Factory: complete request with account
  Note over Factory: check account script, owner, factory
  Factory ->> Account: approve
  Factory ->>- Creator: transfer reward to creator
```

### Withdraw:
```mermaid
sequenceDiagram
  User ->> Account: call(withdraw, recipient, amount)
  Account ->> Service: withdraw(recipient, amount)
  Service ->> Account: transfer(recipient, amount)
  Account ->> User: transfer specified amount
```
