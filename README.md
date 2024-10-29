Safe Token Contracts
=====================

### Contract behaviour
- [Deployment](./docs/deployment.md)
- [Token](./docs/token.md)
- [Vesting Pool](./docs/vesting.md)
- [Airdrop](./docs/airdrop.md)

### Audits
- [G0 Group Audit of the Token contract](./docs/g0_audit_token_contract.pdf)
- [G0 Group Audit of the VestingPool contract](./docs/g0_audit_vesting_contract.pdf)
- [Ackee Blockchain Audit of the VestingPool contract](./docs/ackee_audit_vesting_contract.pdf)
- [Ackee Blockchain Audit of the Airdrop contract](./docs/ackee_audit_airdrop_contract.pdf)

Usage
-----
### Install requirements with yarn:

```bash
yarn
```

### Run all tests:

```bash
yarn build
yarn test
```

### Deploy

> :warning: **Make sure to use the correct commit when deploying the contracts.** Any change (even comments) within the contract files will result in different addresses. The tagged versions can be found in the [releases](https://github.com/safe-global/safe-token/releases).

This will deploy the contracts deterministically and verify the contracts on etherscan using [Solidity 0.7.6](https://github.com/ethereum/solidity/releases/tag/v0.7.6) by default.

Preparation:
- Set `MNEMONIC` in `.env`
- Set `INFURA_KEY` in `.env`

```bash
yarn deploy-all <network>
```

This will perform the following steps

```bash
yarn build
yarn hardhat --network <network> deploy
yarn hardhat --network <network> etherscan-verify
yarn hardhat --network <network> local-verify
```

#### Custom Networks

It is possible to use the `NODE_URL` env var to connect to any EVM based network via an RPC endpoint. This connection then can be used with the `custom` network.

E.g. to deploy the Safe contract suite on that network you would run `yarn deploy-all custom`. 

The resulting addresses should be on all networks the same.

Note: Address will vary if contract code is changed or a different Solidity version is used.

#### Disable Replay protection (EIP-155)

By default the deployment process uses the [Safe singleton factory](https://github.com/gnosis/safe-singleton-factory) for deployment. If 
Some networks require replay protection. If replay protection is not required it is possible to use a presigned transaction without replay protection to deploy the comunity factory (see https://github.com/Arachnid/deterministic-deployment-proxy). To enable this the `USE_COMMUNITY_FACTORY` env var has to be set to `true` (see `.env.sample`).

Note: This will result in different addresses compared to the default deployment process.

### Verify contract

This command will use the deployment artifacts to compile the contracts and compare them to the onchain code
```bash
yarn hardhat --network <network> local-verify
```

This command will upload the contract source to Etherescan
```bash
yarn hardhat --network <network> etherscan-verify
```

Security and Liability
----------------------
All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

License
-------
All smart contracts are released under LGPL-3.0
