# This script fetches block rewards 

from datetime import datetime
import csv
from time import sleep
from requests.exceptions import HTTPError

from etherscan.accounts import Account
from etherscan.client import EmptyResponse


ETHERSCAN_API_KEY = ''
BLOCK_TYPES = ['blocks', 'uncles']

MINER_SAFES = ['0xf20b338752976878754518183873602902360704']  # Use https://dune.com/queries/638270 to get this list.
OUTPUT_FILENAME = '../csv/rewards.csv'
page_size = 10000  # Etherscan page size

with open(OUTPUT_FILENAME, 'w') as outfile:
    writer = csv.writer(outfile, delimiter=',')

    for address in MINER_SAFES:
        etherscan_api = Account(address=address, api_key=ETHERSCAN_API_KEY)

        for block_type in BLOCK_TYPES:
            page = 1
            while True:
                print('Safe: {}, block type: {}, page: {}'.format(address, block_type, page))
                try:
                    rewards = etherscan_api.get_blocks_mined_page(  
                        blocktype=block_type, 
                        page=page,
                        offset=page_size)
                except EmptyResponse:
                    break
                
                if len(rewards) == 0:
                    break
                    
                for reward in rewards:
                    block_number = int(reward['blockNumber'])

                    if block_number < 6775227 or block_number > 14168325:
                        continue

                    
                    day = datetime.fromtimestamp(int(reward['timeStamp']))
                    balance_change = reward['blockReward']
                    writer.writerow(['\\{}'.format(address[1:]), str(day), balance_change])

                page += 1