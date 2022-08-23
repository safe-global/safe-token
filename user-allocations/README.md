# Safe user allocations

This is a collection of scripts and csv files to determine eligibility for the Safe user allocations.

## fetch_rewards.py

- Fetches block and uncle rewards from Etherscan for a given list of addresses.
- Outputs data as CSV and SQL to be put into a query on Dune.

## fetch_sanctioned.py

- For a list of addresses (Safes), checks whether they appear in the Chainalysis on-chain list of sanctioned addresses.

## Scripts and queries 

(Use a virtualenv if possible.)

1. Create virtual env: `python -m venv venv`
2. Activate virtual env `source venv/bin/activate`
3. Install requirements via `pip install -r requirements.txt`
4. Copy file with env variables: `cp ../.env.sample ../.env`
5. Add you API keys to `../.env`
6. Run `python fetch_rewards.py`. Output will be in `rewards.sql` and `rewards.csv`
7. Run `python get_sanctioned.py`. Output will be in `sanctioned_safes.csv`
