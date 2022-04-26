# This script fetches all Ethereum coins from Coingecko

from pycoingecko import CoinGeckoAPI
from datetime import datetime
from time import sleep
from requests.exceptions import HTTPError
import csv

OUTPUT_FILENAME = "../csv/ethereum_coins.csv"

cg = CoinGeckoAPI()

# Get all coins from Coingecko
all_coins = cg.get_coins_list()


with open(OUTPUT_FILENAME, 'w') as csvfile:
    writer = csv.writer(csvfile, delimiter=',')
    
    for i,coin in enumerate(all_coins):
        print("{}/{}: {}".format(i, len(all_coins),coin['id']))
        
        coin_id = coin['id']

        # some coins can be ignored to save requests
        if '-long-' in coin_id or '-short-' in coin_id:
            continue
        if '-tokenized-stock-' in coin_id:
            continue
        if '-fan-token-' in coin_id:
            continue
         
        try:
            coin_info = cg.get_coin_by_id(coin_id)

        except HTTPError as e:
            # Hacky way to get around the rate limit
            if e.response.status_code == 429:
                print("wait")
                sleep(120)
                coin_info = cg.get_coin_by_id(coin_id)

        # Check if it's an Ethereum coin and if there is a contract address
        if coin_info['asset_platform_id'] != 'ethereum' or not coin_info['platforms']['ethereum']:
            continue
        
        # Write
        writer.writerow([coin_id, coin_info['platforms']['ethereum']])
        csvfile.flush()
