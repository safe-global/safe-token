# Safe user allocations

This is a collection of scripts and csv files to determine eligibility for the Safe user allocations.

More info on the proposal can be found on the [Safe forum](https://forum.safe.global/t/new-proposal-reworked-safe-distribution-for-users/594).

## fetch_rewards.py

- Fetches block and uncle rewards from Etherscan for a given list of addresses.
- Outputs data as CSV and SQL to be put into a query on Dune.

## fetch_sanctioned.py

- For a list of addresses (Safes), checks whether they appear in the Chainalysis on-chain list of sanctioned addresses.

## calculate_allocations.py

- Based on a number of input CSV files, calculates the number of SAFE allocated to each Safe.
- Outputs 2 CSV files and stats
    - safes_tokens.csv: Contains addresses and allocated tokens.
    - safes_tokens_all.csv: Contains addresses, allocated tokens and all data used to create them.

## Queries and CSV files

- [https://dune.com/queries/1206510](Dune) -> `safes.csv`
- [https://dune.com/queries/1203871](Dune) -> `txs20181920.csv`
- [https://dune.com/queries/1207347](Dune) -> `txs2021.csv`
- [https://dune.com/queries/1207718](Dune) -> `txs2022.csv`
- [https://dune.com/queries/1203869](Dune) -> `value_eth.csv`
- [https://dune.com/queries/1207565](Dune) -> `value_stablecoins.csv`
- Get [valid reports](https://github.com/safe-global/safe-user-allocation-reports/blob/main/review/valid_reports.csv) -> `valid_reports.csv`

## Scripts

(Use a virtualenv if possible.)

1. Create virtual env: `python -m venv venv`
2. Activate virtual env `source venv/bin/activate`
3. Install requirements via `pip install -r requirements.txt`
4. Copy file with env variables: `cp ../.env.sample ../.env`
5. Add you API keys to `../.env`
6. Download result data from the Dune queries above and put them in the respective CSV files
7. Run `python fetch_rewards.py`. Output will be in `rewards.sql` and `rewards.csv`
8. Run `python get_sanctioned.py`. Output will be in `sanctioned_safes.csv`
9. Run `python calculate_allocations.py`. Output will be in `safes_tokens.csv` and `safes_tokens_all.csv`
