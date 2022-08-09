import csv
import sys

from multiprocessing import Pool
from dotenv import dotenv_values
from web3 import Web3

NUM_WORKERS = 10

INPUT_FILENAME = './safes.csv'
OUTPUT_FILENAME = './sanctioned_safes.csv'

CONFIG = dotenv_values('.env')

w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/' + CONFIG['INFURA_KEY']))

CHAINALYSIS_SANCTIONED_ORACLE_ADDRESS = '0x40C57923924B5c5c5455c48D93317139ADDaC8fb'
CHAINALYSIS_SANCTIONED_ORACLE_ABI = """
[
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "NonSanctionedAddress",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "SanctionedAddress",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address[]",
                "name": "addrs",
                "type": "address[]"
            }
        ],
        "name": "SanctionedAddressesAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address[]",
                "name": "addrs",
                "type": "address[]"
            }
        ],
        "name": "SanctionedAddressesRemoved",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "newSanctions",
                "type": "address[]"
            }
        ],
        "name": "addToSanctionsList",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "isSanctioned",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "isSanctionedVerbose",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "pure",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "removeSanctions",
                "type": "address[]"
            }
        ],
        "name": "removeFromSanctionsList",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]"""

def call_is_sanctioned(address):
    c = w3.eth.contract(address=CHAINALYSIS_SANCTIONED_ORACLE_ADDRESS, abi=CHAINALYSIS_SANCTIONED_ORACLE_ABI)

    is_sanctioned = c.functions.isSanctioned(address).call()
    print('{}: {}'.format(address, is_sanctioned))
    sys.stdout.flush()
    return address, is_sanctioned

if __name__ == "__main__":

    addresses = []

    with open(INPUT_FILENAME) as infile:
            
        reader = csv.reader(infile, delimiter=',')

        for row in reader:
            if row[0] == 'safe_address':
                continue
            
            address = Web3.toChecksumAddress(row[0])
            addresses.append(address)

    pool = Pool(NUM_WORKERS)
    results = pool.map_async(call_is_sanctioned, addresses)
    results.wait()

    with open(OUTPUT_FILENAME, 'wb') as outfile:    
        writer = csv.writer(outfile, delimiter=',')

        sanctioned_counter = 0

        for address, is_sanctioned in results.get():
            if is_sanctioned:
                writer.writerow([address])
                outfile.flush()
                sanctioned_counter += 1
                
        print('{} sanctioned'.format(sanctioned_counter))

    pool.close()