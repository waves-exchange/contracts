# WavesDAO -> WXDAO Funding

## Keys
| key                                 |      type | value                                                        |
| :---------------------------------- | --------: | :----------------------------------------------------------- |
| `%s__mainTreasuryAddress`           |  `String` | `'3PEwRcYNAUtoFvKpBhKoiwajnZfdoDR6h4h'`                      |
| `%s__WavesUSDTPoolAddress`          |  `String` | `'3PKfrupEydU2nZAghVjZAfvCwMBkzuR1F52'`                      |
| `%s__WXDAOcontractAddress`          |  `String` | `'3PEhMFF2mfSWVxWqbW8guXVYcNeoW77ga7T'`                      |
| `%s__WXDAOassetId`                  |  `String` | `'BE4VVq1VsrwGyUWpUkNjVFR5j9vzioiRhrUT52p8RW2m'`             |
| `%s__USDTassetId`                   |  `String` | `'G5WWWzzVsWRyzGf32xojbnfp7gXbWrgqJT8RcVWEfLmC'`             |
| `%s__minClaimAmount`                | `Integer` | `30000000000`                                                |
| `%s__processFeeAmount`              | `Integer` | `500000`                                                     |
| `%s__WXDAOpriceCoeff`               | `Integer` | `110000000` (SCALE8)                                         |
| `%s%s%s__history__<action>__<txId>` |  `String` | `'%d%d%d__<wavesAmount>__<WXDAOamount>__<processFeeAmount>'` |


# Functions


## Process
- Waves amount claimed from WavesDAO should be exceed `minClaimAmount` (*default: 300.0*)
- `processFee` (*default: 0.005*) Waves amount is sent back to caller
```
@Callable(i)
func process()
```
