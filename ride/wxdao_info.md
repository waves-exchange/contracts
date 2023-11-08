WXDAO factory init example tx:

```jsonc
{
  "type": 12,
  "fee": 500000,
  "feeAssetId": null,
  "version": 2,
  "senderPublicKey": "", // WXDAO factory public key
  "data": [
    {
      "key": "%s__calculatorAddress",
      "type": "string",
      "value": ""
    },
    {
      "key": "%s__powerConfigAddress",
      "type": "string",
      "value": ""
    },
    {
      "key": "%s__powerContractAddress",
      "type": "string",
      "value": ""
    },
    {
      "key": "%s__currentPeriod",
      "type": "integer",
      "value": 0
    },
    {
      "key": "%s%d__startHeight__0",
      "type": "integer",
      "value": 0
    },
    {
      "key": "%s__periodLength",
      "type": "integer",
      "value": 0
    },
    {
      "key": "%s__treasuryValue",
      "type": "integer",
      "value": 0
    },
    {
      "key": "%s%d__treasuryValue__0",
      "type": "integer",
      "value": 0
    },
  ]
}
```
