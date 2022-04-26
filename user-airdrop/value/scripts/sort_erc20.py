# This is a helper script to sort the ERC20 transfers csv.

import csv
from operator import delitem
import random

data = {}

with open("../csv/transfers_erc20.csv", 'r') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    
    next(reader)
    for row in reader:
        safe_address = row[0]
        erc20_address = row[1]
        date = row[2]

        hash = random.getrandbits(128)
        key = "{},{},{},{}".format(safe_address, erc20_address, date, hash)
        data[key] = row



with open('transfers_erc20_new.csv', 'w') as csvfile:
    writer = csv.writer(csvfile, delimiter=',')

    writer.writerow('address,contract_address,day,decimals,symbol,balance_change')
    for key in sorted(data.keys()):
        writer.writerow(data[key])