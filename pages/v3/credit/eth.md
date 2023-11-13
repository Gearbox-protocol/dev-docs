# Working with ETH

Gearbox V3 deos not support any operations with native ETH. While `CreditFacade` functions like `openCreditAccount`, `multicall`, `closeCreditAccount`, etc. are `payable`, they will simply wrap the received ETH and send it back to the caller before executing the main body of the function. This means that a WETH approval is needed to utilize that wrapped ETH in a function.