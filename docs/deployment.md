# Deployment

## Dependencies

All contracts use deterministic deployment per default. Therefore the addresses of the contracts primarily depend on the `factory`, the `bytecode` (which is generated from the source and includes meta information such as import paths), the `constructor parameters` and a `salt`.

### Factory

The factory used for the deterministic deployment is https://github.com/Arachnid/deterministic-deployment-proxy

### Contract parameter

The different contracts have different constructor parameters that will impact the address

- Token contract: Address of the initial owner
- Vesting Pool/ Airdrop: Token address, address of the initial manager


## Order of deployment

If the `owner` of the token contract is known then it is possible to deterministically calculate the address of the token contract. As this is the only inter-contract dependency this makes it possible to deploy the contracts in any order once this information is known.

