# Safe user airdrop based on value stored.

## ETH + ERC20

- Consider ETH + top 100 ERC20s by market cap on Snapshot date based on Coingecko
- Check Safe balances in USD at midnight UTC everyday
- Use USD price on that day based on Coingecko
- Sum up per Safe how much value was locked over time
    - Example: If a Safe got 100 USD, after 10 days 60 USD was transferred out and after 5 more days the remaining 40 USD were transferred out, it would get a value of 100*10 + 40*5 = 1200.
- Only consider Safes with a minimum value locked over time.
    - Could e.g. be achieved by holding 1,000 USD for 10 days or 100 USD for 100 days
- Reward early adopters:
    - Value stored in 2018 gets a multiplier of 5
    - Value stored in 2019 gets a multiplier of 4
    - Value stored in 2020 gets a multiplier of 3
    - Value locked in 2021 gets a multiplier of 2
    - Value locked in 2022 gets a multiplier of 1
- Use a decay function to ensure a more even distribution. e.g. via square root or something similar/
    - Tbd if sqrt(x) is the best option of if we prefer something like x^(1/3)

## NFTs
- NFTs are even more volatile than crypto in general.
- It’s hard to put a price tag on NFTs. Floor prices could be used, but then that’s hard for illiquid assets.
- Hence just consider how many and how long NFTs (ERC721 and ERC1155) were stored per Safe.
- Example: If a Safe got 3 NFTs, after 10 days, 1 NFT was transferred out and after 5 more days the remaining 2 were sent out, it would get an NFT number of 3 * 10 + 2 * 5 = 40.
- Only consider Safes with a minimum number locked over time.

## Scripts and queries 

1. Install requirements via `pip install -r scripts/requirements.txt`
2. Fetch all Ethereum tokens from coingecko via [coingecko_fetch_eth_coins.py](scripts/coingecko_fetch_eth_coins.py). Output will be in [ethereum_coins.csv](csv/ethereum_coins.csv)
3. Fetch marketcaps via [coingecko_fetch_market_caps.py](scripts/coingecko_fetch_market_caps.py). Output will be in [ethereum_coins_market_caps.csv](csv/ethereum_coins_market_caps.csv)
4. Filter for top 100 via [erc20_top100.py](scripts/erc20_top100.py). Output will be in [erc20_top100.csv](csv/erc20_top100.csv)
5. Fetch ERC20 tokens prices via [fetch_prices_erc20.py](scripts/fetch_prices_erc20.py). Output will be in [prices_erc20.csv](csv/prices_erc20.csv)
6. Fetch ETH prices via [fetch_prices_eth.py](scripts/fetch_prices_eth.py). Output will be in [prices_eth.csv](csv/prices_eth.csv)
7. Fetch ETH & WETH transfers of Safes via [Dune](https://dune.com/queries/579104). Output should be stored in [transfers_eth.csv](csv/transfers_eth.csv)
8. Fetch ERC20 token transfers of Safes via [Dune](https://dune.com/queries/600087). Output should be stored in [transfers_erc20.csv](csv/transfers_erc20.csv)
9. Fetch block rewards for Safes used for mining via [fetch_rewards.py](scripts/fetch_rewards.py). Output will be in [rewards.csv](csv/rewards.csv). Needs to be added to [transfers_eth.csv](csv/transfers_eth.csv).
10. Fetch NFT transfers of Safes via [Dune](https://dune.com/queries/583080). Output should be stored in [transfers_nfts.csv](csv/transfers_nfts.csv)
11. Calculate the stored values via [calc_tvl.py](scripts/calc_tvl.py). Output will be in [tvl.csv](csv/tvl.csv)