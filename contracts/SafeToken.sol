// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

// TODO vendor
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Safe Token contract
/// @author Richard Meissner - @rmeissner
contract SafeToken is ERC20 {
    constructor() ERC20("Safe Token", "SAFE") {
        // TODO add all miniting
        _mint(msg.sender, 1_000_000_000 ether);
        require(totalSupply() == 1_000_000_000 ether, "Unexpected total supply");
    }
}
