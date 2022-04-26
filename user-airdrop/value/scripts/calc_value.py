# This script calculates the total value stored for Safes over time considering:
# USD value of ETH
# USD value of the top 100 ERC20s by market cap from Coingecko
# Number of NFTs (ERC721 and ERC1155 held)
#
# Holding 1 USD for 1 day gives 1 USD TVL point.
# Holding 1 NFT for 1 day gives 1 NFT TVL point.

import csv
from datetime import datetime, timedelta

OUT_FILENAME = '../csv/tvl.csv'

PRICES_ETH_FILENAME = '../csv/prices_eth.csv'
PRICES_ERC20_FILENAME = '../csv/prices_erc20.csv'

# all files containing Safe addresses need to be sorted by safe address asc
SAFES_FILENAME = '../csv/safes.csv'
ERC20_FILENAME = '../csv/erc20_top100.csv'
TRANSFERS_ETH_FILENAME = '../csv/transfers_eth.csv'
TRANSFERS_NFTS_FILENAME = '../csv/transfers_nfts.csv'
TRANSFERS_ERC20_FILENAME = '../csv/transfers_erc20.csv'

def convert_address(address):
    # converts a hex address from leading \ to leading 0
    address = address[1:]  # cut of the leading "\"
    address = '0' + address  # add a leading 0
    return address

def main():
    file_out = open(OUT_FILENAME, 'w')
    file_prices_eth = open(PRICES_ETH_FILENAME, 'r')
    file_prices_erc20 = open(PRICES_ERC20_FILENAME, 'r')
    file_safes = open(SAFES_FILENAME, 'r')
    file_erc20 = open(ERC20_FILENAME, 'r')
    file_transfers_eth = open(TRANSFERS_ETH_FILENAME, 'r')
    file_transfers_nfts = open(TRANSFERS_NFTS_FILENAME, 'r')
    file_transfers_erc20 = open(TRANSFERS_ERC20_FILENAME, 'r')

    writer_out = csv.writer(file_out, delimiter=',')
    reader_prices_eth = csv.reader(file_prices_eth, delimiter=',')
    reader_prices_erc20 = csv.reader(file_prices_erc20, delimiter=',')
    reader_safes = csv.reader(file_safes, delimiter=',')
    reader_erc20 = csv.reader(file_erc20, delimiter=',')
    reader_transfers_eth = csv.reader(file_transfers_eth, delimiter=',')
    reader_transfers_nfts = csv.reader(file_transfers_nfts, delimiter=',')
    reader_transfers_erc20 = csv.reader(file_transfers_erc20, delimiter=',')

    # load prices into a dict
    prices = {}

    # eth prices
    prices['eth'] = {}

    for row_price in reader_prices_eth:
        date = row_price[0]
        price = float(row_price[1])
        prices['eth'][date] = price
    
    # erc20 prices. The key is the contract address.
    for row_price in reader_prices_erc20:
        date = row_price[0]
        address = row_price[1]
        price = float(row_price[2])
        if address not in prices:
            prices[address] = {}
        prices[address][date] = price
    
    erc20 = {}  # maps addresses to coin_ids
    # load erc20s
    for row_erc20 in reader_erc20:
        coin_id = row_erc20[0]
        address = row_erc20[1]
        erc20[address] = coin_id

    print("start eth")
    tvl_eth = calc_tvl(reader_transfers_eth, decimals=18, asset_prices=prices['eth'])
    print("start nfts")
    tvl_nfts = calc_tvl(reader_transfers_nfts)
    print("start erc20")
    tvl_erc20 = calc_tvl(reader_transfers_erc20, asset_prices=prices, is_erc20=True)

    print("output")
    # write header
    header = ['safe_address','tvl_eth','tvl_nfts']
    for address in erc20:
        header.append("tvl_{}".format(erc20[address]))
    header.append('tvl_total')
    writer_out.writerow(header)

    # go through all Safes, calculate eth tvl, nft tvl and tvl for all erc20s in the top100 list.    

    # skip header row of safes file
    next(reader_safes)

    last_safe_address = ''
    for row_safe in reader_safes:
        safe_address = convert_address(row_safe[0])

        if last_safe_address != '' and last_safe_address >= safe_address:
            raise Exception('safe addresses in {FILENAME_SAFES} aren\'t sorted ({safe_address} found after {last_safe_address}.')
        
        eth = tvl_eth.get(safe_address, 0)
        nfts = tvl_nfts.get(safe_address, 0)
        out = [safe_address, eth, nfts]
        total = eth

        for address in erc20:
            usd = tvl_erc20.get(address, {}).get(safe_address, 0)
            total += usd
            out.append(usd)
        out.append(total)
        # only output when there is value > 0
        if nfts > 0 or total > 0:
            writer_out.writerow(out)

    
    # close files
    file_prices_eth.close()
    file_safes.close()
    file_transfers_eth.close()
    file_transfers_nfts.close()

def calc_tvl_between_dates(base_units, date_from, date_to, decimals=0, asset_prices=None, asset_address=''):

    tvl = 0
    for i in range((date_to - date_from).days):
        current_date = date_from + timedelta(i)
        units = base_units / (10**decimals)

        # If not prices, just use the units directly.
        if asset_prices is not None:
            if asset_address == '':
                price = asset_prices[str(current_date)]
            else:
                price = asset_prices[asset_address].get(str(current_date),0)  # means no price on coingecko
            value = units * price
        else:
            value = units
    
        year = current_date.year

        if year == 2018:
            value *= 5
        elif year == 2019:
            value *= 4
        elif year == 2020:
            value *= 3
        elif year == 2021:
            value *= 2
        # else 2022

        tvl += value

    return tvl

def calc_tvl(reader, decimals=0, asset_prices=None, is_erc20=False):
    result = {}
    
    last_safe_address = ''
    last_date = None
    last_wei = 0
    total_tvl = 0

    last_erc20_address = ''
    
    # skip header row
    next(reader)

    for row in reader:
        # get the date
        if not is_erc20:
            current_date = datetime.strptime(row[1][:10], '%Y-%m-%d').date()
        else:
            current_date = datetime.strptime(row[2][:10], '%Y-%m-%d').date()

        # get the safe address
        current_safe_address = convert_address(row[0])

        current_erc20_address = convert_address(row[1]) if is_erc20 else ''

        # safes have to be in the file in ascending order
        if last_safe_address != '' and last_safe_address > current_safe_address:
            raise Exception('safe addresses aren\'t sorted ({} found after {}.'.format(current_safe_address, last_safe_address))

        # erc20s have to be in the file in ascending order
        if is_erc20 and last_safe_address == current_safe_address and last_erc20_address != '' and last_erc20_address > current_erc20_address:
            raise Exception('erc20 addresses aren\'t sorted ({} found after {} for safe {}.'.format(current_erc20_address, last_erc20_address, current_safe_address))

        # check if a new safe has been found
        if (last_safe_address != '' and last_safe_address != current_safe_address) or \
            is_erc20 and last_erc20_address != '' and last_erc20_address != current_erc20_address:
            # that Safe held the last_tvl until the cut off date
            
            if is_erc20:
                decimals = int(row[3])

            last_wei = sanitize_wei(last_safe_address, last_wei, last_erc20_address, last_date, asset_prices)
            total_tvl += calc_tvl_between_dates(last_wei, last_date, datetime(2022, 2, 9).date(), decimals, asset_prices, last_erc20_address)

            if not is_erc20:
                result[last_safe_address] = total_tvl
            else:
                if last_erc20_address not in result:
                    result[last_erc20_address] = {}
                result[last_erc20_address][last_safe_address] = total_tvl
            
            # reset counters
            total_tvl = 0
            last_wei = 0
            last_date = None

        # if date has changed but safe address remained, update tvl
        if last_date is not None and last_date != current_date:
            if last_date > current_date:
                raise Exception('Dates per Safe need to be sorted ascending')

            if is_erc20:
                decimals = int(row[3])

            last_wei = sanitize_wei(current_safe_address, last_wei, current_erc20_address, last_date, asset_prices)
            total_tvl += calc_tvl_between_dates(last_wei, last_date, current_date, decimals, asset_prices, last_erc20_address)

        last_wei += int(row[-1])

        last_date = current_date
        last_safe_address = current_safe_address
        
        if is_erc20:
            last_erc20_address = current_erc20_address

    return result

def sanitize_wei(safe_address, wei, asset_address, date, asset_prices):
    # check if balance is negative
    if wei < 0:
        
        if asset_address.lower() in [
            '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', # stETH. stETH balance grows without Transfer events. We discard that.
            '0x674c6ad92fd080e4004b2312b45f796a192d27a0'  # USDN. USDN also has some built in value accrual for staking. We discard that.
            ]:
            return 0
        elif asset_address != '':
            raise Exception('Safe {} has negative balance of {} on {} for ERC 20 {}.'.format(safe_address, wei, date, asset_address))
        elif asset_prices is not None:
            # eth
            raise Exception('Safe {} has negative ETH balance of {} on {} .'.format(safe_address, wei, date))
        else:
            # nfts
            return 0
    return wei

if __name__ == '__main__':
    main()