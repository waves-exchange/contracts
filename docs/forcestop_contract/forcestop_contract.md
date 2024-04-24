# Force Stop Contract


## Keys
| key                         |      type | value                    | description                                       |
| :-------------------------- | --------: | :----------------------- | :------------------------------------------------ |
| `%s%s__disabled__{address}` | `boolean` | `true`                   | Contract status                                   |
| `%s__forceStopPermission`   |  `String` | `{address1}__{address2}` | List of Addresses allowed to force stop Contracts |


## Functions
```
@Callable(i)
func forceStopContract(address: String, disable: Boolean)
```

```
@Callable(i)
func addPermission(address: String)
```

```
@Callable(i)
func removePermission(address: String)
```

# TESTNET
| Name      | Address                               | Public key                                     |
| --------- | ------------------------------------- | ---------------------------------------------- |
| forcestop | `3MqsDXvFU9WM8hEzCcrw2aVGtVimCgbNeXD` | `4dNR2Up6mpwUEcy9WQuE2wAzR7HRURa6Pk9jrFKgcHqB` |