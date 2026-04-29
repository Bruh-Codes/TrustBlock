// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

enum GlobalReleaseRule {
    DUAL_APPROVAL,
    CLIENT_APPROVAL_AND_TIMEOUT
}

enum MilestoneReleaseRule {
    CLIENT_APPROVAL,
    BOTH_PARTIES_APPROVE,
    CLIENT_APPROVAL_OR_TIMEOUT,
    CUSTOM
}

enum RefundPolicy {
    ON_EXPIRY_IF_UNAPPROVED,
    MEDIATOR_CAN_SPLIT_REFUND,
    MANUAL_ONLY
}

enum ResolverType {
    NONE,
    PLATFORM,
    INDEPENDENT
}

enum EscrowStatus {
    DRAFT,
    AWAITING_FUNDING,
    LIVE,
    IN_REVIEW,
    DISPUTED,
    COMPLETED,
    CANCELLED
}

enum MilestoneStatus {
    PENDING,
    IN_REVIEW,
    APPROVED,
    RELEASED,
    REFUNDED,
    DISPUTED,
    RESOLVED,
    CANCELLED
}

struct ResolverConfig {
    address resolver;
    uint16 feeBps;
    string label;
    bool active;
}

struct CreateEscrowInput {
    string title;
    string description;
    string clientName;
    string recipientName;
    address recipient;
    address token;
    uint256 totalAmount;
    uint64 fundingDeadline;
    GlobalReleaseRule defaultReleaseRule;
    RefundPolicy refundPolicy;
    ResolverType resolverType;
}

struct MilestoneInput {
    string title;
    string description;
    uint256 amount;
    uint64 dueDate;
    MilestoneReleaseRule releaseRule;
    string releaseCondition;
}

struct EscrowData {
    uint256 id;
    string title;
    string description;
    string clientName;
    string recipientName;
    address client;
    address recipient;
    address token;
    uint256 totalAmount;
    uint256 fundedAmount;
    uint256 releasedAmount;
    uint256 refundedAmount;
    uint64 createdAt;
    uint64 fundingDeadline;
    uint64 fundedAt;
    uint64 completedAt;
    GlobalReleaseRule defaultReleaseRule;
    RefundPolicy refundPolicy;
    ResolverType resolverType;
    address resolver;
    uint16 resolverFeeBps;
    EscrowStatus status;
    uint256[] milestoneIds;
}

struct MilestoneData {
    uint256 id;
    uint256 escrowId;
    string title;
    string description;
    uint256 amount;
    uint64 dueDate;
    uint64 submittedAt;
    uint64 reviewDeadline;
    uint64 resolvedAt;
    MilestoneReleaseRule releaseRule;
    RefundPolicy refundPolicy;
    MilestoneStatus status;
    bool clientApproved;
    bool recipientApproved;
    bool clientRefundApproved;
    bool recipientRefundApproved;
    string releaseCondition;
}

struct EscrowSummary {
    uint256 id;
    address client;
    address recipient;
    address token;
    uint256 totalAmount;
    uint256 fundedAmount;
    uint256 releasedAmount;
    uint256 refundedAmount;
    uint64 createdAt;
    uint64 fundingDeadline;
    uint64 fundedAt;
    uint64 completedAt;
    GlobalReleaseRule defaultReleaseRule;
    RefundPolicy refundPolicy;
    ResolverType resolverType;
    address resolver;
    uint16 resolverFeeBps;
    EscrowStatus status;
    uint256 milestoneCount;
}

struct EscrowText {
    string title;
    string description;
    string clientName;
    string recipientName;
}

struct MilestoneSummary {
    uint256 id;
    uint256 escrowId;
    uint256 amount;
    uint64 dueDate;
    uint64 submittedAt;
    uint64 reviewDeadline;
    uint64 resolvedAt;
    MilestoneReleaseRule releaseRule;
    RefundPolicy refundPolicy;
    MilestoneStatus status;
    bool clientApproved;
    bool recipientApproved;
    bool clientRefundApproved;
    bool recipientRefundApproved;
}

struct MilestoneText {
    string title;
    string description;
    string releaseCondition;
}

struct MilestoneView {
    MilestoneSummary summary;
    MilestoneText text;
}

struct EscrowView {
    EscrowSummary summary;
    EscrowText text;
    uint256[] milestoneIds;
    MilestoneView[] milestones;
}
