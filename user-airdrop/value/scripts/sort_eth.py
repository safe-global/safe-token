# This is a helper script to sort the eth transfers csv.

import csv
import random

data = {}

with open("../csv/transfers_eth.csv", 'r') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    next(reader)
    for row in reader:
        address = row[0]
        date = row[1]
        
        balance_change = row[2]
        hash = random.getrandbits(128)
        key = "{},{},{},{}".format(address, date, balance_change, hash)
        data[key] = [address, date, balance_change]

print("address,day,balance_change")
for address in sorted(data.keys()):
    print("{},{},{}".format(data[address][0], data[address][1],data[address][2]))

