# This script fetches for a list of coins the market cap from Coingecko on a specific date

from pycoingecko import CoinGeckoAPI
from datetime import datetime
from time import sleep
from requests.exceptions import HTTPError
import csv

INPUT_FILENAME = '../csv/ethereum_coins.csv'
OUTPUT_FILENAME = '../csv/ethereum_coins_market_caps.csv'

DATE = '09-02-2022'  # Date at which to pull market caps. Format DD-MM-YYYY

cg = CoinGeckoAPI()

# get all coins
all_coins = cg.get_coins_list()

with open(INPUT_FILENAME) as infile:
    with open(OUTPUT_FILENAME, 'a') as capfile:
        reader = csv.reader(infile, delimiter=',')
        writer = csv.writer(capfile, delimiter=',')
    
        for i,row in enumerate(reader):
            coin_id = row[0]
            contract_address = row[1]

            print("{}: {}".format(i,coin_id))

            try:
                coin_info = cg.get_coin_history_by_id(coin_id, DATE)
            except HTTPError as e:
                # Hacky way to get around the rate limit
                if e.response.status_code == 429:
                    print("wait")
                    sleep(120)
                    coin_info = cg.get_coin_history_by_id(coin_id, DATE)

            if not 'market_data' in coin_info:
                # some don't have usable market data, those are irrelevant
                print('skipping')
                continue
            
            market_cap =  coin_info['market_data']['market_cap']['usd']

            # write output
            writer.writerow([coin_id, contract_address, market_cap])
            capfile.flush()
