# Helper scripts for Safe user airdrop

## fetch_rewards.py

- Fetches block and uncle rewards from Etherscan for a given list of addresses.
- Ouputs data as CSV and SQL to be put into a query on Dune.

## fetch_sanctioned.py

- For a list of addresses (Safes), checks whether they appear in the Chainalysis on-chain list of sanctioned addresses.

## Scripts and queries 

1. Install requirements via `pip install -r requirements.txt`
2. Run `python fetch_rewards.py`. Output will be in `rewards.sql` and `rewards.csv`
3. Run `python get_sanctioned.py`. Output will be in `sanctioned_safes.csv`
