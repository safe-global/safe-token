// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

// TODO vendor
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Safe Token contract
/// @author Richard Meissner - @rmeissner
contract SafeToken is ERC20, ERC20Pausable, Ownable {
    constructor(address safeDao) ERC20("Safe Token", "SAFE") {
        // Owner of the token should be the Safe DAO
        _transferOwnership(safeDao);
    }

    /**
     * @dev Mint initial token supply. This is done to avoid that the token address depends on the initial token holders.
     *
     * Requirements:
     *
     * - the caller must be the owner
     */
    function initialize(address[] memory initialTokenHolders, uint256[] memory initialTokenAmounts) public onlyOwner {
        require(totalSupply() == 0, "Token already intialized");
        uint256 initialTokenHolderCount = initialTokenHolders.length;
        // Make sure that the provide number of holders corresponds to the provided number of amounts
        require(initialTokenHolderCount == initialTokenAmounts.length, "Invalid parameters supplied");
        // Mint the initial tokens
        for (uint256 i = 0; i < initialTokenHolderCount; i++) {
            _mint(initialTokenHolders[i], initialTokenAmounts[i]);
        }
        // "ether" is used here to get the 18 decimals
        require(totalSupply() == 1_000_000_000 ether, "Unexpected total supply");
        // Contract is paused by default
        _pause();
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC20Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - the caller must be the owner
     */
    function pause() public virtual onlyOwner {
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

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        // ERC20Pausable implements the pausing logic via this method
        super._beforeTokenTransfer(from, to, amount);
    }
}
