// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Vesting contract for multiple accounts
/// @author Richard Meissner - @rmeissner
contract VestingPool {
    address public token;
    address public poolManager;

    modifier onlyPoolManager() {
        require(msg.sender == poolManager, "Can only be called by pool manager");
        _;
    }

    // TODO: calculate max amounts
    // Sane limits based on: https://eips.ethereum.org/EIPS/eip-1985
    struct Vesting {
        // First storage slot
        address account; // 20 bytes
        // TODO: enum?
        uint8 curveType; // 1 byte
        bool managed; // 1 byte
        uint16 durationWeeks; // 2 bytes
        uint64 startDate; // 8 bytes
        // Second storage slot
        uint128 amount; // 16 bytes
        uint128 amountClaimed; // 16 bytes
        // Third storage slot
        // TODO: separate mapping?
        uint64 pausingDate; // 8 bytes
        bool cancelled; // 1 byte
    }

    uint256 public totalTokensInVesting;
    mapping(bytes32 => Vesting) public vestings;

    event AddedVesting(bytes32 indexed id, address indexed account);
    event PausedVesting(bytes32 indexed id);
    event UnpausedVesting(bytes32 indexed id);
    event CanceledVesting(bytes32 indexed id);

    constructor(address _token, address _poolManager) {
        token = _token;
        poolManager = _poolManager;
    }

    function addVesting(
        address target,
        uint8 curveType,
        bool managed,
        uint16 durationWeeks,
        uint64 startDate,
        uint128 amount
    ) public onlyPoolManager {
        require(curveType < 2, "Invalid vesting curve");
        bytes32 vestingId = vestingHash(target, curveType, managed, durationWeeks, startDate, amount);
        require(vestings[vestingId].account == address(0), "Vesting id already used");
        // Check that enough tokens are available for the new vesting
        uint256 availableTokens = IERC20(token).balanceOf(address(this)) - totalTokensInVesting;
        require(availableTokens >= amount, "Not enough tokens available");
        // Mark tokens for this vesting in use
        totalTokensInVesting += amount;
        vestings[vestingId] = Vesting({
            account: target,
            curveType: curveType,
            managed: managed,
            durationWeeks: durationWeeks,
            startDate: startDate,
            amount: amount,
            amountClaimed: 0,
            pausingDate: 0,
            cancelled: false
        });
        emit AddedVesting(vestingId, target);
    }

    function claimAvailableVesting(
        bytes32 vestingId,
        address beneficor,
        uint128 tokensToClaim
    ) public {
        require(beneficor != address(0), "Cannot claim to 0-address");
        Vesting memory vesting = vestings[vestingId];
        require(vesting.account == msg.sender, "Can only be claimed by vesting owner");
        // Calculate how many tokens can be claimed
        uint128 availableClaim = calculateVestedAmount(vestingId) - vesting.amountClaimed;
        uint128 claimAmount = tokensToClaim == type(uint128).max ? availableClaim : tokensToClaim;
        require(claimAmount <= availableClaim, "Trying to claim too many tokens");
        // Adjust how many tokens are locked in vesting
        totalTokensInVesting -= claimAmount;
        vesting.amountClaimed += claimAmount;
        vestings[vestingId] = vesting;
        require(IERC20(token).transferFrom(address(this), beneficor, claimAmount), "Token transfer failed");
        // TODO: emit event
    }

    function cancelVesting(bytes32 vestingId) public onlyPoolManager {
        Vesting memory vesting = vestings[vestingId];
        require(vesting.account != address(0), "Vesting not found");
        require(vesting.managed, "Only managed vestings can be cancelled");
        require(!vesting.cancelled, "Vesting already cancelled");
        // If vesting is not already paused it will be paused
        // TODO: refactor
        if (vesting.pausingDate == 0) {
            // pausingDate should always be larger or equal to startDate
            if (block.timestamp >= vesting.startDate) {
                vesting.pausingDate = uint64(block.timestamp);
            } else {
                vesting.pausingDate = vesting.startDate;
            }
        }
        // Vesting is cancelled, therefore tokens that are not vested yet, will be added back to the pool
        uint128 unusedToken = block.timestamp <= vesting.startDate ? vesting.amount : vesting.amount - calculateVestedAmount(vestingId);
        totalTokensInVesting -= unusedToken;
        // Vesting is set to cancelled and therefore disallows unpausing
        vesting.cancelled = true;
        vestings[vestingId] = vesting;
        emit CanceledVesting(vestingId);
    }

    function pauseVesting(bytes32 vestingId) public onlyPoolManager {
        Vesting memory vesting = vestings[vestingId];
        require(vesting.account != address(0), "Vesting not found");
        require(vesting.managed, "Only managed vestings can be paused");
        require(vesting.pausingDate == 0, "Vesting already paused");
        // pausingDate should always be larger or equal to startDate
        if (block.timestamp >= vesting.startDate) {
            vesting.pausingDate = uint64(block.timestamp);
        } else {
            vesting.pausingDate = vesting.startDate;
        }
        vestings[vestingId] = vesting;
        emit PausedVesting(vestingId);
    }

    function unpauseVesting(bytes32 vestingId) public onlyPoolManager {
        Vesting memory vesting = vestings[vestingId];
        require(vesting.account != address(0), "Vesting not found");
        require(vesting.pausingDate != 0, "Vesting is not paused");
        require(!vesting.cancelled, "Vesting has been cancelled and cannot be unpaused");
        // Calculate the time the vesting was paused
        // If vesting has not started yet, then pausing Date might be in the future
        uint64 timePaused = block.timestamp <= vesting.pausingDate ? 0 : uint64(block.timestamp) - vesting.pausingDate;
        // Offset the start date to create the effect of pausing
        vesting.startDate = vesting.startDate + timePaused;
        vesting.pausingDate = 0;
        vestings[vestingId] = vesting;
        emit UnpausedVesting(vestingId);
    }

    function calculateVestedAmount(bytes32 vestingId) public view returns (uint128 vestedAmount) {
        // TODO: create internal method to pass memory vesting to
        Vesting memory vesting = vestings[vestingId];
        require(vesting.account != address(0), "Vesting not found");
        require(vesting.startDate <= block.timestamp, "Vesting not active yet");
        // Convert vesting duration to seconds
        uint64 durationSeconds = uint64(vesting.durationWeeks) * 7 * 24 * 60 * 60;
        // If contract is paused use the pausing date to calculate amount
        uint64 vestedSeconds = vesting.pausingDate > 0
            ? vesting.pausingDate - vesting.startDate
            : uint64(block.timestamp) - vesting.startDate;
        if (vestedSeconds >= durationSeconds) {
            // If vesting time is longer than duration everything has been vested
            vestedAmount = vesting.amount;
        } else if (vesting.curveType == 0) {
            // Linear vesting
            vestedAmount = calculateLinear(vesting.amount, vestedSeconds, durationSeconds);
        } else if (vesting.curveType == 1) {
            // Exponential vesting
            vestedAmount = calculateExponential(vesting.amount, vestedSeconds, durationSeconds);
        } else {
            revert("Invalid curve type");
        }
    }

    function calculateLinear(
        uint128 targetAmount,
        uint64 elapsedTime,
        uint64 totalTime
    ) internal pure returns (uint128) {
        // Calculate vested amount on linear curve: amount * vestedTime / duration
        return (targetAmount * elapsedTime) / totalTime;
    }

    function calculateExponential(
        uint128 targetAmount,
        uint64 elapsedTime,
        uint64 totalTime
    ) internal pure returns (uint128) {
        // Calculate vested amount on exponential curve: amount * vestedTime^2 / duration^2
        return (targetAmount * elapsedTime * elapsedTime) / (totalTime * totalTime);
    }

    function vestingHash(
        address target,
        uint8 curveType,
        bool managed,
        uint16 durationWeeks,
        uint64 startDate,
        uint128 amount
    ) public view returns (bytes32 vestingId) {
        // TODO: implement EIP-712
        vestingId = keccak256(abi.encodePacked(address(this), target, curveType, managed, durationWeeks, startDate, amount));
    }
}