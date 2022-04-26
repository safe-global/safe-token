# This script fetches usd prices for a given list of erc20s during a given timeframe from Coingecko

from pycoingecko import CoinGeckoAPI
from datetime import datetime
import csv
from time import sleep
from requests.exceptions import HTTPError

cg = CoinGeckoAPI()

# params
FROM_TIMESTAMP = int(datetime(2018,11,25,0,0).timestamp())
TO_TIMESTAMP = int(datetime(2022,2,9,0,0).timestamp())
OUTPUT_FILENAME = '../csv/prices_erc20.csv'
INPUT_FILENAME = '../csv/erc20_top100.csv'

with open(INPUT_FILENAME, 'r') as infile:
    with open(OUTPUT_FILENAME, 'w') as outfile:
        writer = csv.writer(outfile, delimiter=',')
        reader = csv.reader(infile, delimiter=',')

        for i,row in enumerate(reader):
            coin_id = row[0]
            address = row[1]
            print("{}: {}".format(i,coin_id))

            try:
                market_data = cg.get_coin_market_chart_range_by_id(id=coin_id, vs_currency='usd', from_timestamp=FROM_TIMESTAMP, to_timestamp=TO_TIMESTAMP)
                
            except HTTPError as e:
                # Hacky way to get around the rate limit
                if e.response.status_code == 429:
                    print("wait")
                    sleep(120)
                    market_data = cg.get_coin_market_chart_range_by_id(id=coin_id, vs_currency='usd', from_timestamp=FROM_TIMESTAMP, to_timestamp=TO_TIMESTAMP)

            for price in market_data['prices']:
                day = datetime.fromtimestamp(price[0]/1000).date()
                writer.writerow([str(day), address, price[1]])