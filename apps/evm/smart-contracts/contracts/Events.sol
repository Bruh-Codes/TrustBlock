// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Types.sol";

event ResolverConfigured(
    ResolverType indexed resolverType,
    address indexed resolver,
    uint16 feeBps,
    string label,
    bool active
);

event EscrowCreated(
    uint256 indexed escrowId,
    address indexed client,
    address indexed recipient,
    address token,
    uint256 totalAmount,
    uint64 fundingDeadline,
    ResolverType resolverType
);

event EscrowFunded(
    uint256 indexed escrowId,
    address indexed client,
    uint256 amount
);

event EscrowStatusChanged(
    uint256 indexed escrowId,
    EscrowStatus oldStatus,
    EscrowStatus newStatus
);

event EscrowCancelled(uint256 indexed escrowId, address indexed caller);
event EscrowCompleted(uint256 indexed escrowId, address indexed caller);

event MilestoneCreated(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    uint256 amount,
    uint64 dueDate,
    MilestoneReleaseRule releaseRule,
    string title
);

event MilestoneStatusChanged(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    MilestoneStatus oldStatus,
    MilestoneStatus newStatus
);

event MilestoneSubmitted(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    address indexed submitter,
    uint64 reviewDeadline
);

event MilestoneApproved(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    address indexed approver
);

event MilestoneRefundApproved(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    address indexed approver
);

event FundsReleased(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    address indexed recipient,
    uint256 amount
);

event FundsRefunded(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    address indexed client,
    uint256 amount
);

event DisputeOpened(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    address indexed raiser,
    string reason
);

event DisputeResolved(
    uint256 indexed milestoneId,
    uint256 indexed escrowId,
    address indexed resolver,
    uint256 recipientAmount,
    uint256 clientRefundAmount,
    string resolutionDetails
);
