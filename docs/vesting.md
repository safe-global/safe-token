# Vesting Pool

## Purpose

The Vesting Pool is used to distribute tokens over time to different accounts. The pool can be used to dedicate a specific amount of tokens to a common set of addresses (e.g. investors or team members) and reuse vestings that have been cancelled.

## Specification

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

### Management

Each vesting pool has a manager. Management can be transferred or revoked. The manager of a Vesting pool can create new vestings and can pause, unpause or cancel managed vestings.

#### Pausing

When a vesting is paused then during that time no additional tokens should be vested. This is done by offsetting the starting date of vesting when unpausing it.

#### Canceling

When a vesting is cancelled it will also be marked as paused, but it will not be possible to unpause the vesting. The unvested tokens will be made available for new vestings again.
