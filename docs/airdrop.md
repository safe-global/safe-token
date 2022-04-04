# Airdrop

## Purpose

The Airdrop contract will be used to distribute tokens to the users and contributors of the Safe project (TODO: add link to more info).

## Specification

### Claiming

The Airdrop contract is an extension of the [VestingPool](./vesting.md) that uses a Merkle proof the create the vestings. Only the target account of an airdrop will be able to claim the tokens.

### Expiry

Is is possible to specify that the Airdrop will expire. Once this happened it is possible to claim all remaining Safe tokens to the manager of the contract.

### Management

Management of the Airdrop contract is disabled (compared to the [VestingPool](./vesting.md)). It is not possible to create new vestings or manage existing vestings on the Airdrop contract as a manager. Only purpose is to claim remaining tokens once the Airdrop expired.

The management can be transfered and revoked.

