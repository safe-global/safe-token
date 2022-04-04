// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

import "./vendor/@openzeppelin/contracts/access/Ownable.sol";
import "./vendor/@openzeppelin/contracts/security/Pausable.sol";
import "./vendor/@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./TokenRescuer.sol";

/// @title Safe Token contract
/// @author Richard Meissner - @rmeissner
contract SafeToken is ERC20, Pausable, Ownable, TokenRescuer {
    /// @dev Will mint 1 billion tokens to the owner and pause the contract
    constructor(address owner) ERC20("Safe Token", "SAFE") {
        // Owner of the token should be the Safe DAO
        _transferOwnership(owner);
        // "ether" is used here to get the 18 decimals
        _mint(owner, 1_000_000_000 ether);
        // Contract is paused by default
        _pause();
    }

    /// @notice Unpauses all token transfers.
    /// @dev See {Pausable-_unpause}
    /// Requirements: caller must be the owner
    function unpause() public virtual onlyOwner {
        _unpause();
    }

    /// @dev See {ERC20-_beforeTokenTransfer}
    /// Requirements: the contract must not be paused OR transfer must be initiated by owner
    /// @param from The account that is sending the tokens
    /// @param to The account that should receive the tokens
    /// @param amount Amount of tokens that should be transfered
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        // Token transfers are only possible if the contract is not pause
        // OR if triggered by the owner of the contract
        require(!paused() || owner() == _msgSender(), "ERC20Pausable: token transfer while paused");
    }
}
