| name                 | pub                                          | addr                                |
| -------------------- | -------------------------------------------- | ----------------------------------- |
| _factory_v2_         | HBWgh7DKPyzCnEXKJAJ5dKQ3jmPtMhGD78tt6jRdkV61 | 3PCuHsTU58WKhCqotbcSwABvdPzqqVAbbTv |
| _manager_            | 2Cbd8ozG7A1RyRNC3nNnZgHu7Ru4K3JCfpyPkhqr9zxq | 3PLC7GbU8HsuLN6EsMLbCxScSi9m4BWdVyJ |
| waves_usdn_pool      | 7JeravxHejNM5QqFiU1URLXYHueuDGzjdGucMBFJe5nz | 3PPZWgFNRKHLvM51pwS934C8VZ7d2F4Z58g |
| btc_usdn_pool        | 8qbG6ndWYubPjXV48b8eH12vFyqazNtd8RhUNCAYDswG | 3PCBWDTA6jrFswd7gQgaE3Xk7gLM5RKofvp |
| eth_usdn_pool        | 9qgdsmC729MergDJsKAPxR8Pf2t8bTaTMqnRc7gj3r28 | 3PEMqetsaJDbYMw1XGovmE37FB8VUhGnX9A |
| usdt_usdn_pool       | DxhbzFs9BZTiN6kcnyybxmqPTV8xReD6Z5gWQ5AgRX8w | 3P8KMyAJCPWNcyedqrmymxaeWonvmkhGauz |
| usdt_usdn_pool_addon | 4fJSDfC3vAPt1nqrnuwqWYimaPYHxAPytSyZMD5Ytdf2 | 3P36szQtxxpSaefdqaFjbM9Ush8ieCjVZVw |
| wx_usdn_pool         | 24dorn126Pv4mGCgUu61v1RLxqW4VNXbuHjmCHh7tc3K | 3PCENpEKe8atwELZ7oCSmcdEfcRuKTrUx99 |
| bnb_usdn_pool        | CH1JSfWGq7HYK4igJyB7x4a4LCjWSLwkCxqPsKYrpPEM | 3P8NCvcipinDQVQZujpczBdvG7FL5EvTqLM |
| staking              | EAtbDa63mS5omrvW7Pfr7DKWEVLuReJtu72vfiBLRXsx | 3PPNhHYkkEy13gRWDCaruQyhNbX2GrjYSyV |
| slippage             | 9Ps647vMbFkxBfwxidninuYHYNazJGxBssESpf6Pya34 | 3PHmyHFaFTNh6Yh8vicJke9DnxcsUA56uWb |
| boosting             | 6PdA345SW1zresPEKuWiLPsh9Ku14mFDW6cZtpCQrp3E | 3PJL8Hn8LACaSBWLQ3UVhctA5cTQLBFwBAP |
| emission             | FoGdD9qz4AFW3pdmp1QCA5vvo9wn3fTbv4JnYrWZe3BB | 3PJyz4AHXKBgDuFx7uZdYmHCBtTmDnRgCx3 |
| gwx_reward           | 4Uv4fNGxmwhwHRipWuYvZe87BazB9H19nVEac9pguorM | 3PH83bJCZraJoEzFefz4p8UXZD9YazNnj1n |
| rest                 | 6tusy8LfPEh2eoAsxHwZZn6cw8DBMGTHAce3gqLXwQxC | 3P8MoPnsaurofk1VyhsdAFkeQ6ijpJYXCpW |

Не забывать проверять, что managerPublicKey не установлен.

### Шаги:

1. Factory V2:
   1. Перенести стейт с factory на factory_v2 через дата транзакцию, подпись factory_v2: [json](txs/01_state_to_factory_v2.json)
   1. Задеплоить с леджера factory_v2б, подпись factory_v2: [json](txs/02_factory_v2_set_script.json)
   1. Вызвать setManager на factory_v2 С ПУБЛИЧНЫМ КЛЮЧОМ, подпись factory_v2: [json](txs/03_factory_v2_set_manager.json)
   1. Вызвать confirmManager с леджера, подпись manager: [json](txs/04_factory_v2_confirm_manager.json)
   1. Вызвать constructorV4 на factory_v2 (добавляем старый factory и список старых пулов), подпись manager: [json](txs/05_factory_v2_constructor.json)
1. BNB/USDN pool:
   1. Удалить managerPublicKey, подпись old factory: [json](txs/bnb_usdn_remove_manager.json)
   1. Установить новый скрипт на lp, подпись lp: [json](txs/bnb_usdn_set_script.json)
   1. Вызвать setManager на lp С ПУБЛИЧНЫМ КЛЮЧОМ, подпись lp: [json](txs/bnb_usdn_set_manager.json)
   1. Вызвать confirmManager с леджера, подпись manager: [json](txs/bnb_usdn_confirm_manager.json)
   1. Сменить адрес factory, подпись manager: [json](txs/bnb_usdn_set_new_factory.json)
1. WAVES/USDN pool:
   1. Удалить managerPublicKey, подпись old factory: [json](txs/06_waves_usdn_remove_manager.json)
   1. Установить новый скрипт на lp, подпись lp: [json](txs/06_waves_usdn_set_script.json)
   1. Вызвать setManager на lp С ПУБЛИЧНЫМ КЛЮЧОМ, подпись lp: [json](txs/07_waves_usdn_set_manager.json)
   1. Вызвать confirmManager с леджера, подпись manager: [json](txs/08_waves_usdn_confirm_manager.json)
   1. Сменить адрес factory, подпись manager: [json](txs/waves_usdn_set_new_factory.json)
1. BTC/USDN pool:
   1. Удалить managerPublicKey, подпись old factory: [json](txs/09_btc_usdn_remove_manager.json)
   1. Установить новый скрипт на lp, подпись lp: [json](txs/09_btc_usdn_set_script.json)
   1. Вызвать setManager на lp С ПУБЛИЧНЫМ КЛЮЧОМ, подпись lp: [json](txs/10_btc_usdn_set_manager.json)
   1. Вызвать confirmManager с леджера, подпись manager: [json](txs/10_btc_usdn_confirm_manager.json)
   1. Сменить адрес factory, подпись manager: [json](txs/btc_usdn_set_new_factory.json)
1. ETH/USDN pool:
   1. Удалить managerPublicKey, подпись old factory: [json](txs/eth_usdn_remove_manager.json)
   1. Установить новый скрипт на lp, подпись lp: [json](txs/eth_usdn_set_script.json)
   1. Вызвать setManager на lp С ПУБЛИЧНЫМ КЛЮЧОМ, подпись lp: [json](txs/eth_usdn_set_manager.json)
   1. Вызвать confirmManager с леджера, подпись manager: [json](txs/eth_usdn_confirm_manager.json)
   1. Сменить адрес factory, подпись manager: [json](txs/eth_usdn_set_new_factory.json)
1. WX/USDN pool:
   1. Удалить managerPublicKey, подпись old factory: [json](txs/wx_usdn_remove_manager.json)
   1. Установить новый скрипт на lp, подпись lp: [json](txs/wx_usdn_set_script.json)
   1. Вызвать setManager на lp С ПУБЛИЧНЫМ КЛЮЧОМ, подпись lp: [json](txs/wx_usdn_set_manager.json)
   1. Вызвать confirmManager с леджера, подпись manager: [json](txs/wx_usdn_confirm_manager.json)
   1. Сменить адрес factory, подпись manager: [json](txs/wx_usdn_set_new_factory.json)
1. USDT/USDN pool:
   1. lp_stable:
      1. Удалить managerPublicKey, подпись old factory: [json](txs/usdt_usdn_remove_manager.json)
      1. Установить новый скрипт на lp_stable, подпись lp: [json](txs/usdt_usdn_set_script.json)
      1. Вызвать setManager на lp_stable С ПУБЛИЧНЫМ КЛЮЧОМ, подпись lp: [json](txs/usdt_usdn_set_manager.json)
      1. Вызвать confirmManager с леджера, подпись manager: [json](txs/usdt_usdn_confirm_manager.json)
      1. Сменить адрес factory, подпись manager: [json](txs/usdt_usdn_set_new_factory.json)
   1. lp_stable_addon:
      1. Установить новый скрипт на lp_stable_addon от имени lp_stable_addon: [json](txs/usdt_usdn_addon_set_script.json)
      1. Вызвать setManager на lp_stable_addon С ПУБЛИЧНЫМ КЛЮЧОМ от имени lp_stable_addon: [json](txs/usdt_usdn_addon_set_manager.json)
      1. Вызвать confirmManager с леджера, подпись manager: [json](txs/usdt_usdn_addon_confirm_manager.json)
1. Staking:
   1. Установить новый скрипт на staking, подпись staking: [json](txs/staking_set_script.json)
   1. Вызвать setManager на staking, подпись staking: [json](txs/staking_set_manager.json)
   1. Вызвать confirmManager с леджера, подпись manager: [json](txs/staking_confirm_manager.json)
   1. Сменить адрес factory, подпись manager: [json](txs/staking_set_new_factory.json)
1. Slippage:
   1. Сменить адрес factory, подпись this: [json](txs/slippage_set_new_factory.json)
1. Boosting:
   1. Сменить адрес factory, подпись this: [json](txs/boosting_set_new_factory.json)
1. Emission:
   1. Сменить адрес factory, подпись this: [json](txs/emission_set_new_factory.json)
1. gWX reward:
   1. Сменить адрес factory, подпись this: [json](txs/gwx_set_new_factory.json)
1. REST:
   1. Сменить адрес factory, подпись this: [json](txs/rest_set_new_factory.json)
