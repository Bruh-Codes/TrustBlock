// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Types.sol";

interface IEscrowReaderSource {
    function getEscrowSummary(
        uint256 escrowId
    ) external view returns (EscrowSummary memory);

    function getEscrowText(
        uint256 escrowId
    ) external view returns (EscrowText memory);

    function getEscrowMilestoneIds(
        uint256 escrowId
    ) external view returns (uint256[] memory);

    function getMilestoneSummary(
        uint256 milestoneId
    ) external view returns (MilestoneSummary memory);

    function getMilestoneText(
        uint256 milestoneId
    ) external view returns (MilestoneText memory);

    function getEscrowIdsForParticipant(
        address participant
    ) external view returns (uint256[] memory);
}
