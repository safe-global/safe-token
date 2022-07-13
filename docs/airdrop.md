# Airdrop

## Purpose

The Airdrop contract will be used to distribute tokens to the users and contributors of the Safe project (TODO: add link to more info).

## Specification

### Glossary

- Token - An [ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible token that will be vested
- Target account - The account which is the owner of the vesting that is created by the airdrop
- Beneficiary - The account that will receive the tokens when performing the claiming

### Redeeming and Claiming

The Airdrop contract is an extension of the [VestingPool](./vesting.md) that uses a Merkle proof to create the vestings. The process of creating the vestings is called "redeem". Once a vesting has been redeemed with a Merkle proof it is possible to claim the tokens for the created vesting. Only the target account of an airdrop will be able to claim the tokens.

The Airdrop contract has two different flows for claiming:

1. Using the `transfer` method of the Token contract to send the tokens to the beneficiary
2. Using a combination of `approve` and a Module transaction to send the tokens to the beneficiary

#### Transfer flow

If the token is freely transferable the easiest method to claim the tokens after they have been redeemed and vested is to call `claimVestedTokens`. This method has been inherited from the [VestingPool](./vesting.md#claiming).

#### Module flow

In cases where a token is not freely transferable, but can be transferred by the owner of the token, it is possible to use the module flow. In this flow it is assumed that the owner of the token implements the [`ModuleManager` interface](../contracts/interfaces/ModuleManager.sol) (e.g. a [Safe](https://www.github.com/safe-global/safe-contracts) is used as the owner). In this case the `claimVestedTokensViaModule` can be called. The method will call `approve` on the token contract, to set an allowance for the registered manager (e.g. the `poolManager` of the `VestingPool`) to transfer the required amount of tokens. As a second step a the `execTransactionFromModule` of the `ModuleManager`  interface is called to trigger a call from the pool manager to the token contract that triggers the `transferFrom` method. With this call the claimed tokens will be transferred from the airdrop contract to the beneficiary.

Note: The Airdrop contract will check that the balances of itself and the beneficiary have been adjusted as expected to ensure that the pool manager actually transferred the tokens.

### Expiry

It is possible to specify that the Airdrop will expire, this means that it will not be possible anymore to redeem any airdrop, therefore no new vestings will be created. Once this happened it is possible to claim all tokens that are not locked in vestings to the manager of the contract.

### Setup

The setup of the Airdrop contract is done in two steps:
1. Deployment
2. Intitialization

During the deployment it is necessary to define a manager (inherited from the [VestingPool](./vesting.md)). This manager can in a second step initialized the Airdrop by setting the Merkle root via `initializeRoot`.

### Management

Management of the Airdrop contract is disabled (compared to the [VestingPool](./vesting.md)). It is not possible to create new vestings on the Airdrop contract as a manager.

