# Safe Token

## Details

* Name: `Safe Token`
* Symbol: `SAFE`
* Decimals: `18`
* Total Supply: `1_000_000_000`

## Purpose

TODO: add link

## Specifications

### Ownership

The Safe token is ownable and the initial token supply will be minted to the specified owner. Ownership can be transferred and revoked at any point.

### Transferability

The Safe token is initially not transferable. The only exception to this is the owner of the token contract.

To make the token transferable the owner of the token has to call the `unpause` method of the token contract. Once the token contract is unpaused (and therefore the token is transferable) it is not possible to pause the token contract again (e.g. once transferable forever transferable).

### Supply

The total initial supply of 1 billion Safe token is minted to the token owner. These tokens then can be further by the token owner (e.g. according to [GIP-29](TODO: link to GIP-29)). The token contract does not support any inflation or minting logic. It is also not possible to burn the token. Therefore the total supply is fixed at 1 billion Safe tokens.

### ERC20 token recovery

To recover ERC20 tokens that have been sent to the token contract it is possible to use [`rescueToken` of the `TokenRescuer` contract](../contracts/TokenRescuer.sol) to transfer tokens to another address.

