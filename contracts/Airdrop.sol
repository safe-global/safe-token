// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

// TODO vendor
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Airdrop contract
/// @author Richard Meissner - @rmeissner
contract Airdrop {
    address public immutable token;
    bytes32 public immutable root;
    mapping(address => uint256) public claimed;

    constructor(address _token, bytes32 _root) {
        root = _root;
        token = _token;
    }

    function redeem(
        address account,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        require(claimed[account] == 0, "Already claimed");
        claimed[account] = amount;
        require(_verify(_leaf(account, amount), proof), "Invalid merkle proof");
        require(IERC20(token).transfer(account, amount), "Could not transfer token");
    }

    function _leaf(address account, uint256 amount) internal pure returns (bytes32) {
        // Account will be packed together, therefore we do it last
        return keccak256(abi.encode(amount, account));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof) internal view returns (bool) {
        return MerkleProof.verify(proof, root, leaf);
    }
}
