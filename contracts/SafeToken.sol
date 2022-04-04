// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

import "./vendor/@openzeppelin/contracts/access/Ownable.sol";
import "./vendor/@openzeppelin/contracts/security/Pausable.sol";
import "./vendor/@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Safe Token contract
/// @author Richard Meissner - @rmeissner
contract SafeToken is ERC20, Pausable, Ownable {
    constructor(address owner) ERC20("Safe Token", "SAFE") {
        // Owner of the token should be the Safe DAO
        _transferOwnership(owner);
        // "ether" is used here to get the 18 decimals
        _mint(owner, 1_000_000_000 ether);
        // Contract is paused by default
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - the caller must be the owner
     */
    function unpause() public virtual onlyOwner {
        _unpause();
    }
    
    /**
     * @dev See {ERC20-_beforeTokenTransfer}.
     *
     * Requirements:
     *
     * - the contract must not be paused.
     */
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
