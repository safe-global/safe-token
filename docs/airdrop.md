# Airdrop

## Purpose

The Airdrop contract will be used to distribute tokens to the users and contributors of the Safe project (TODO: add link to more info).

## Specification


### Redeeming and Claiming

The Airdrop contract is an extension of the [VestingPool](./vesting.md) that uses a Merkle proof to create the vestings. The process of creating the vestings is called "redeem". Once an vesting has been redeemed with a Merkle proof it is possible to claim the tokens for the created vesting. Only the target account of an airdrop will be able to claim the tokens.

### Expiry

It is possible to specify that the Airdrop will expire, this means that it will not be possible anymore to redeem any airdrop, therefore no new vestings will be created. Once this happened it is possible to claim all tokens that are not locked in vestings to the manager of the contract.

### Management

Management of the Airdrop contract is disabled (compared to the [VestingPool](./vesting.md)). It is not possible to create new vestings on the Airdrop contract as a manager.

