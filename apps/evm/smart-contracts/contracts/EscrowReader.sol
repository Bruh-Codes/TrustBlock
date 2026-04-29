// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IEscrowReaderSource.sol";
import "./Types.sol";

contract EscrowReader {
    IEscrowReaderSource public immutable escrow;

    constructor(address escrowAddress) {
        escrow = IEscrowReaderSource(escrowAddress);
    }

    function getEscrow(
        uint256 escrowId
    ) external view returns (EscrowView memory escrowView) {
        escrowView.summary = escrow.getEscrowSummary(escrowId);
        escrowView.text = escrow.getEscrowText(escrowId);
        escrowView.milestoneIds = escrow.getEscrowMilestoneIds(escrowId);
        escrowView.milestones = _loadMilestones(escrowView.milestoneIds);
    }

    function getMilestone(
        uint256 milestoneId
    ) external view returns (MilestoneView memory milestoneView) {
        milestoneView.summary = escrow.getMilestoneSummary(milestoneId);
        milestoneView.text = escrow.getMilestoneText(milestoneId);
    }

    function getEscrowsForParticipant(
        address participant
    ) external view returns (EscrowView[] memory escrowViews) {
        uint256[] memory escrowIds = escrow.getEscrowIdsForParticipant(participant);
        escrowViews = new EscrowView[](escrowIds.length);

        for (uint256 i = 0; i < escrowIds.length; i++) {
            uint256 escrowId = escrowIds[i];
            escrowViews[i].summary = escrow.getEscrowSummary(escrowId);
            escrowViews[i].text = escrow.getEscrowText(escrowId);
            escrowViews[i].milestoneIds = escrow.getEscrowMilestoneIds(escrowId);
            escrowViews[i].milestones = _loadMilestones(escrowViews[i].milestoneIds);
        }
    }

    function _loadMilestones(
        uint256[] memory milestoneIds
    ) internal view returns (MilestoneView[] memory milestoneViews) {
        milestoneViews = new MilestoneView[](milestoneIds.length);

        for (uint256 i = 0; i < milestoneIds.length; i++) {
            uint256 milestoneId = milestoneIds[i];
            milestoneViews[i].summary = escrow.getMilestoneSummary(milestoneId);
            milestoneViews[i].text = escrow.getMilestoneText(milestoneId);
        }
    }
}
