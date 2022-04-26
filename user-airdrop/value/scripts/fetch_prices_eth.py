# This script fetches the ETH prices during a given timeframe from Coingecko

from pycoingecko import CoinGeckoAPI
from datetime import datetime
import csv

cg = CoinGeckoAPI()

# check if alive
print(cg.ping())

# params
coin_id = 'ethereum'
FROM_TIMESTAMP = int(datetime(2018,11,25,0,0).timestamp())
TO_TIMESTAMP = int(datetime(2022,2,9,0,0).timestamp())
OUTPUT_FILENAME = 'prices_eth.csv'

# fetch
market_data = cg.get_coin_market_chart_range_by_id(id=coin_id, vs_currency='usd', from_timestamp=FROM_TIMESTAMP, to_timestamp=TO_TIMESTAMP)

with open(OUTPUT_FILENAME, 'w') as csvfile:
    writer = csv.writer(csvfile, delimiter=',')
    
    for price in market_data['prices']:
        day = datetime.fromtimestamp(price[0]/1000).date()
        writer.writerow([str(day), price[1]])