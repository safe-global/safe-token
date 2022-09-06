import pandas as pd
import numpy as np

# Total number of tokens to distribute.
TOTAL_TOKENS = 50000000

# Minimum number of tokens per address receiving > 0 tokens.
MIN_TOKENS = 100

# Load list of Safes created
safes = pd.read_csv('safes.csv', index_col=0)

# Load transaction information
txs_20181920 = pd.read_csv('txs_20181920.csv', index_col=0)
txs_2021 = pd.read_csv('txs_2021.csv', index_col=0)
txs_2022 = pd.read_csv('txs_2022.csv', index_col=0)

# Join txs into Safes
safes = safes.join(pd.concat([txs_20181920, txs_2021, txs_2022]), how='left')
safes = safes.fillna(0)

# Do calculations on txs data
safes['tx_fee_eth_smoothed'] = safes['tx_fee_eth'] ** (1/2)
safes['tx_fee_eth_tokens'] = safes['tx_fee_eth_smoothed'] / safes.sum()['tx_fee_eth_smoothed'] * (TOTAL_TOKENS / 2)

# Load info on value stored
value_eth = pd.read_csv('value_eth.csv', index_col=0)
value_eth.rename(columns={'value': 'value_eth'}, inplace=True)
value_stablecoins = pd.read_csv('value_stablecoins.csv', index_col=0)
value_stablecoins.rename(columns={'value': 'value_stablecoins'}, inplace=True)

safes = safes.join(value_eth[['value_eth']], how='left')
safes = safes.join(value_stablecoins[['value_stablecoins']], how='left')
safes['value'] = safes['value_eth'] + safes['value_stablecoins']

# Do calculations on value
safes['value_smoothed'] = safes['value'] ** (1/3)
safes['value_tokens'] = safes['value_smoothed'] / safes.sum()['value_smoothed'] * (TOTAL_TOKENS / 2)

safes['tokens'] = safes['value_tokens'] + safes['tx_fee_eth_tokens']

# Filter out Safes that don't receive tokens.
safes = safes[safes['tokens'] > 0]

# How many tokens are remaining after each Safes got allocated MIN_TOKENS?
tokens_remaining = TOTAL_TOKENS - (len(safes) * MIN_TOKENS)  

# Adjust final token numbers.
safes['tokens'] = (tokens_remaining / TOTAL_TOKENS * safes['tokens']) + MIN_TOKENS

print('Tokens distributed: {}'.format(safes.sum()['tokens']))

print('mean: {}'.format(safes.mean()['tokens']))
print('max: {}'.format(safes.max()['tokens']))
print('min: {}'.format(safes.min()['tokens']))

for i in range(1,10):
    print('.{} quantile: {}'.format(i, safes.quantile(i/10)['tokens']))

# Calculate gini coefficient
tokens = safes['tokens'].to_numpy()
total = 0
for i, xi in enumerate(tokens[:-1], 1):
    total += np.sum(np.abs(xi - tokens[i:]))
print('gini: {}'.format(total / (len(tokens)**2 * np.mean(tokens))))

# Output
safes.to_csv('safes_tokens_all.csv', sep=',')
safes[['tokens']].to_csv('safes_tokens.csv', sep=',')

