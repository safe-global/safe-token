// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

interface ModuleManager {
    /// @notice Allows a module to execute a Safe transaction.
    /// @dev The implementation of the interface might require that the module is enabled (e.g. for the Safe contracts via enableModule) and could revert otherwise
    /// @param to Destination address of module transaction.
    /// @param value Ether value of module transaction.
    /// @param data Data payload of module transaction.
    /// @param operation Operation type of module transaction.
    /// @param success Indicates if the Safe transaction was executed successfully or not
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation
    ) external returns (bool success);
}
