# Safe user airdrop based on activity

- Consider transactions made by Safes (including module txs.)
- Only consider Safes that made a minimum number of transactions. (e.g. 3)
- Just take the number of transactions made.
    - Alternative: Also factor in gas consumed by tx in order to reward expensive txs.
- Boost early adopter:
    - Transactions made in 2018 get a multiplier of 5
    - Transactions made in 2019 get a multiplier of 4
    - Transactions made in 2020 get a multiplier of 3
    - Transactions made in 2021 get a multiplier of 2
    - Transactions made in 2022 get a multiplier of 1
- Final token amount is proportional to the number of transactions made.

[Dune query implementing the above.](https://dune.com/queries/603700)