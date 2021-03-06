# Vesting Pool

## Purpose

The Vesting Pool is used to distribute tokens over time to different accounts. The pool can be used to dedicate a specific amount of tokens to a common set of addresses (e.g. investors or team members) and reuse vestings that have been cancelled.

## Specification

### Glossary

- Token - An [ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible token that will be vested
- Manager - The account that has special permissions related to vesting management

### Vesting

Each vesting is specified by the account which owns the vesting, the curve to calculate the vested tokens, a flag to indicate if the vesting is controlled by the manager, the duration of the vesting, the start date of the vesting and the amount that should be vested in total.

There are two vesting curves available: Linear vesting and exponential vesting.

#### Linear vesting

For linear vesting the following formula is used: `tokens_vested = tokens_total * duration_elapsed / duration_total`

Where the following needs to be considered:
- `tokens_total` is the amount of tokens that should be vested in total
- `duration_elapsed` is the time that has elapsed since the start date of the vesting
- `duration_total` is the time which is required until all tokens are vested
- `duration_elapsed` is greater or equal to `duration_total` all tokens have been vested and the formula should not be used.
- The time unit used for `duration_elapsed` and `duration_total` MUST be the same (e.g. seconds)

#### Exponential vesting

For exponential vesting the following formula is used: `tokens_vested = tokens_total * duration_elapsed^2 / duration_total^2`

Where the following needs to be considered:
- `tokens_total` is the amount of tokens that should be vested in total
- `duration_elapsed` is the time that has elapsed since the start date of the vesting
- `duration_total` is the time which is required until all tokens are vested
- `duration_elapsed` is greater or equal to `duration_total` all tokens have been vested and the formula should not be used.
- The time unit used for `duration_elapsed` and `duration_total` MUST be the same (e.g. seconds)


### Claiming

The contract has a `claimVestedTokens` which allows to claim tokens that have already been vested. When calling the method the Vesting contract will call the `transfer` method on the token contract to sent the tokens to the specified beneficiary. If it is not possible to transfer the token the claiming will revert.

### Management

Each vesting pool has a manager. The manager of a Vesting pool can create new vestings and can pause, unpause or cancel managed vestings.

When adding a new vesting it is required that enough tokens for the vesting are available for the vesting contract. Each time a new vesting is created the vesting contract will keep track of this, so that all vesting on the vesting contract are backed by the required amount of tokens. This ensured that there are enough tokens available for all vesting when they can be claimed.

#### Pausing

When a vesting is paused then during that time no additional tokens should be vested. This is done by offsetting the starting date of vesting when unpausing it.

#### Canceling

When a vesting is cancelled it will also be marked as paused, but it will not be possible to unpause the vesting. The unvested tokens will be made available for new vestings again.
