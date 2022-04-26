# This script outputs the top 100 ERC20s by market cap from an input file.

import csv

with open('../csv/ethereum_coins_market_caps.csv') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
    
        caps = {}

        for row in reader:
 
            coin_id = row[0]   
            address = row[1]
            cap = float(row[2])

            if cap in caps:
                Exception("cap already in caps")
            caps[cap] = [coin_id, address, cap]

for i,key in enumerate(sorted(caps.keys(), reverse=True)):
    if i >= 100:
        continue

    print("{},{},{}".format(caps[key][0], caps[key][1], caps[key][2]))

    # Helper output for Dune queries
    # print("'\{}'::bytea,  --{}".format(caps[key][1][1:], caps[key][0]))  