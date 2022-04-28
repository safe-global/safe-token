# Safe user airdrop

This is a collection of scripts and csv files to determine eligibility for the Safe user airdrop.

### Goals

- Reward early users more than later users.
- Find a distribution that doesn't produce just a small number of big players.
- Find a good balance between rewarding usage and value of stored assets.
- Distribute tokens to users that are interested in the long term success of the Safe (as opposed to dump the token right away)
- Distribute tokens to users that are willing to particpate in Safe governance.

### Overview of distribution

5% of token supply is distrubted -> 50,000,000 SAFE
- 2.5% airdrop -> 25,000,000 SAFE
- 2.5% vested -> 25,000,000 SAFE

### Proposal

- 50% basdd on [activity: Number of transactions made](./activity/README.md)
- 50% based on [value stored: ETH, ERC20 tokens and NFTs](./value/README.md)
- Only consider Safes created via our official factories.
- The vesting part is done linearly over 4 years without any cliff.
