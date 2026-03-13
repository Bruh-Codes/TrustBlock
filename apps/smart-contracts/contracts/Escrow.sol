// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./Events.sol";
import "./Types.sol";

contract Escrow is Initializable, OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint64 public constant DEFAULT_REVIEW_TIMEOUT = 5 days;
    uint16 public constant MAX_BPS = 10_000;

    error EmptyString(string fieldName);
    error EscrowNotFound(uint256 escrowId);
    error FundingWindowClosed(uint256 escrowId);
    error InvalidAmount();
    error InvalidMilestoneStatus(
        uint256 milestoneId,
        MilestoneStatus currentStatus,
        MilestoneStatus expectedStatus
    );
    error InvalidResolutionSplit(uint256 expected, uint256 actual);
    error InvalidResolverType(ResolverType resolverType);
    error InvalidStatusTransition();
    error InvalidTime(string fieldName);
    error MilestoneAmountMismatch(uint256 expected, uint256 actual);
    error MilestoneNotFound(uint256 milestoneId);
    error ResolverNotConfigured(ResolverType resolverType);
    error Unauthorized(address caller);
    error ZeroAddress(string fieldName);

    mapping(uint256 => EscrowData) private escrows;
    mapping(uint256 => MilestoneData) private milestones;
    mapping(address => uint256[]) private participantEscrowIds;
    mapping(ResolverType => ResolverConfig) private resolverConfigs;

    uint256 private nextEscrowId;
    uint256 private nextMilestoneId;

    /// @notice Locks the implementation contract to prevent direct initialization.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the escrow contract.
    /// @param initialOwner The address assigned as the initial contract owner.
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);

        nextEscrowId = 1;
        nextMilestoneId = 1;
    }

    /// @notice Configures the resolver address and fee used by UI-selected dispute modes.
    /// @param resolverType The resolver bucket used by the UI.
    /// @param resolver The address allowed to resolve disputes for this resolver type.
    /// @param feeBps The fee in basis points used for UI display and future accounting.
    /// @param label A UI-facing label for the resolver.
    /// @param active Whether the resolver configuration is enabled.
    function setResolverConfig(
        ResolverType resolverType,
        address resolver,
        uint16 feeBps,
        string calldata label,
        bool active
    ) external onlyOwner {
        if (resolverType == ResolverType.NONE) revert InvalidResolverType(resolverType);
        if (resolver == address(0)) revert ZeroAddress("resolver");
        if (feeBps > MAX_BPS) revert InvalidAmount();
        if (bytes(label).length == 0) revert EmptyString("label");

        resolverConfigs[resolverType] = ResolverConfig({
            resolver: resolver,
            feeBps: feeBps,
            label: label,
            active: active
        });

        emit ResolverConfigured(resolverType, resolver, feeBps, label, active);
    }

    /// @notice Creates an escrow and all of its milestones in one call.
    /// @param input The escrow-level metadata and participants.
    /// @param milestoneInputs The milestone schedule for the escrow.
    /// @return escrowId The identifier of the newly created escrow.
    function createEscrow(
        CreateEscrowInput calldata input,
        MilestoneInput[] calldata milestoneInputs
    ) external returns (uint256 escrowId) {
        escrowId = _createEscrow(input, milestoneInputs, msg.sender);
    }

    /// @notice Creates an escrow and immediately transfers its full token amount into custody.
    /// @param input The escrow-level metadata and participants.
    /// @param milestoneInputs The milestone schedule for the escrow.
    /// @return escrowId The identifier of the newly created escrow.
    function createAndFundEscrow(
        CreateEscrowInput calldata input,
        MilestoneInput[] calldata milestoneInputs
    ) external nonReentrant returns (uint256 escrowId) {
        escrowId = _createEscrow(input, milestoneInputs, msg.sender);
        _fundEscrow(escrowId, msg.sender);
    }

    /// @notice Transfers the escrow token amount from the client into the contract.
    /// @param escrowId The identifier of the escrow to fund.
    function fundEscrow(uint256 escrowId) external nonReentrant {
        _fundEscrow(escrowId, msg.sender);
    }

    /// @notice Marks a milestone as delivered and starts its review period.
    /// @param milestoneId The identifier of the milestone being submitted.
    function submitMilestone(uint256 milestoneId) external {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        EscrowData storage escrow = _getEscrowStorage(milestone.escrowId);

        if (msg.sender != escrow.recipient) revert Unauthorized(msg.sender);
        if (
            milestone.status != MilestoneStatus.PENDING &&
            milestone.status != MilestoneStatus.IN_REVIEW
        ) {
            revert InvalidMilestoneStatus(
                milestoneId,
                milestone.status,
                MilestoneStatus.PENDING
            );
        }

        MilestoneStatus previousStatus = milestone.status;
        milestone.status = MilestoneStatus.IN_REVIEW;
        milestone.submittedAt = uint64(block.timestamp);
        milestone.reviewDeadline = uint64(block.timestamp) + DEFAULT_REVIEW_TIMEOUT;
        milestone.recipientApproved = true;

        _setEscrowStatus(escrow, EscrowStatus.IN_REVIEW);

        emit MilestoneSubmitted(
            milestoneId,
            escrow.id,
            msg.sender,
            milestone.reviewDeadline
        );
        emit MilestoneStatusChanged(
            milestoneId,
            escrow.id,
            previousStatus,
            milestone.status
        );
    }

    /// @notice Records approval for a milestone and advances it to approved when its rule is satisfied.
    /// @param milestoneId The identifier of the milestone being approved.
    function approveMilestone(uint256 milestoneId) external {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        EscrowData storage escrow = _getEscrowStorage(milestone.escrowId);

        if (msg.sender != escrow.client && msg.sender != escrow.recipient) {
            revert Unauthorized(msg.sender);
        }
        if (
            milestone.status != MilestoneStatus.IN_REVIEW &&
            milestone.status != MilestoneStatus.APPROVED
        ) {
            revert InvalidMilestoneStatus(
                milestoneId,
                milestone.status,
                MilestoneStatus.IN_REVIEW
            );
        }

        if (msg.sender == escrow.client) {
            milestone.clientApproved = true;
        } else {
            milestone.recipientApproved = true;
        }

        emit MilestoneApproved(milestoneId, escrow.id, msg.sender);

        if (_isMilestoneApproved(milestone)) {
            MilestoneStatus previousStatus = milestone.status;
            milestone.status = MilestoneStatus.APPROVED;
            emit MilestoneStatusChanged(
                milestoneId,
                escrow.id,
                previousStatus,
                MilestoneStatus.APPROVED
            );
        }
    }

    /// @notice Records consent to refund a milestone.
    /// @param milestoneId The identifier of the milestone being approved for refund.
    function approveRefund(uint256 milestoneId) external {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        EscrowData storage escrow = _getEscrowStorage(milestone.escrowId);

        if (msg.sender != escrow.client && msg.sender != escrow.recipient) {
            revert Unauthorized(msg.sender);
        }

        if (_isMilestoneSettled(milestone.status)) {
            revert InvalidMilestoneStatus(
                milestoneId,
                milestone.status,
                MilestoneStatus.IN_REVIEW
            );
        }

        if (msg.sender == escrow.client) {
            milestone.clientRefundApproved = true;
        } else {
            milestone.recipientRefundApproved = true;
        }

        emit MilestoneRefundApproved(milestoneId, escrow.id, msg.sender);
    }

    /// @notice Releases milestone funds to the escrow recipient when the release rule is satisfied.
    /// @param milestoneId The identifier of the milestone being released.
    function releaseMilestone(uint256 milestoneId) external nonReentrant {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        EscrowData storage escrow = _getEscrowStorage(milestone.escrowId);

        if (!_canRelease(milestone)) revert InvalidStatusTransition();

        milestone.status = MilestoneStatus.RELEASED;
        milestone.resolvedAt = uint64(block.timestamp);
        escrow.releasedAmount += milestone.amount;

        IERC20(escrow.token).safeTransfer(escrow.recipient, milestone.amount);

        emit FundsReleased(milestoneId, escrow.id, escrow.recipient, milestone.amount);
        emit MilestoneStatusChanged(
            milestoneId,
            escrow.id,
            MilestoneStatus.APPROVED,
            MilestoneStatus.RELEASED
        );

        _syncEscrowAfterSettlement(escrow);
    }

    /// @notice Refunds a milestone according to the configured refund policy.
    /// @param milestoneId The identifier of the milestone being refunded.
    function refundMilestone(uint256 milestoneId) external nonReentrant {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        EscrowData storage escrow = _getEscrowStorage(milestone.escrowId);

        if (!_canRefund(escrow, milestone)) revert InvalidStatusTransition();

        milestone.status = MilestoneStatus.REFUNDED;
        milestone.resolvedAt = uint64(block.timestamp);
        escrow.refundedAmount += milestone.amount;

        IERC20(escrow.token).safeTransfer(escrow.client, milestone.amount);

        emit FundsRefunded(milestoneId, escrow.id, escrow.client, milestone.amount);
        emit MilestoneStatusChanged(
            milestoneId,
            escrow.id,
            MilestoneStatus.IN_REVIEW,
            MilestoneStatus.REFUNDED
        );

        _syncEscrowAfterSettlement(escrow);
    }

    /// @notice Opens a dispute on a milestone and moves the escrow into a disputed state.
    /// @param milestoneId The identifier of the disputed milestone.
    /// @param reason The reason attached to the dispute.
    function openDispute(uint256 milestoneId, string calldata reason) external {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        EscrowData storage escrow = _getEscrowStorage(milestone.escrowId);

        if (msg.sender != escrow.client && msg.sender != escrow.recipient) {
            revert Unauthorized(msg.sender);
        }
        if (bytes(reason).length == 0) revert EmptyString("reason");
        if (_isMilestoneSettled(milestone.status)) revert InvalidStatusTransition();

        MilestoneStatus previousStatus = milestone.status;
        milestone.status = MilestoneStatus.DISPUTED;

        emit DisputeOpened(milestoneId, escrow.id, msg.sender, reason);
        emit MilestoneStatusChanged(
            milestoneId,
            escrow.id,
            previousStatus,
            MilestoneStatus.DISPUTED
        );

        _setEscrowStatus(escrow, EscrowStatus.DISPUTED);
    }

    /// @notice Resolves a disputed milestone and may split funds between recipient and client.
    /// @param milestoneId The identifier of the disputed milestone.
    /// @param recipientAmount The portion released to the recipient.
    /// @param clientRefundAmount The portion refunded to the client.
    /// @param resolutionDetails Free-form resolution metadata for the UI timeline.
    function resolveDispute(
        uint256 milestoneId,
        uint256 recipientAmount,
        uint256 clientRefundAmount,
        string calldata resolutionDetails
    ) external nonReentrant {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        EscrowData storage escrow = _getEscrowStorage(milestone.escrowId);

        if (!_isAuthorizedResolver(escrow, msg.sender)) {
            revert Unauthorized(msg.sender);
        }
        if (milestone.status != MilestoneStatus.DISPUTED) {
            revert InvalidMilestoneStatus(
                milestoneId,
                milestone.status,
                MilestoneStatus.DISPUTED
            );
        }
        if (recipientAmount + clientRefundAmount != milestone.amount) {
            revert InvalidResolutionSplit(
                milestone.amount,
                recipientAmount + clientRefundAmount
            );
        }

        milestone.resolvedAt = uint64(block.timestamp);

        if (recipientAmount > 0) {
            escrow.releasedAmount += recipientAmount;
            IERC20(escrow.token).safeTransfer(escrow.recipient, recipientAmount);
            emit FundsReleased(milestoneId, escrow.id, escrow.recipient, recipientAmount);
        }

        if (clientRefundAmount > 0) {
            escrow.refundedAmount += clientRefundAmount;
            IERC20(escrow.token).safeTransfer(escrow.client, clientRefundAmount);
            emit FundsRefunded(milestoneId, escrow.id, escrow.client, clientRefundAmount);
        }

        if (recipientAmount == 0) {
            milestone.status = MilestoneStatus.REFUNDED;
        } else if (clientRefundAmount == 0) {
            milestone.status = MilestoneStatus.RELEASED;
        } else {
            milestone.status = MilestoneStatus.RESOLVED;
        }

        emit DisputeResolved(
            milestoneId,
            escrow.id,
            msg.sender,
            recipientAmount,
            clientRefundAmount,
            resolutionDetails
        );
        emit MilestoneStatusChanged(
            milestoneId,
            escrow.id,
            MilestoneStatus.DISPUTED,
            milestone.status
        );

        _syncEscrowAfterSettlement(escrow);
    }

    /// @notice Cancels an unfunded escrow.
    /// @param escrowId The identifier of the escrow to cancel.
    function cancelEscrow(uint256 escrowId) external {
        EscrowData storage escrow = _getEscrowStorage(escrowId);

        if (msg.sender != escrow.client) revert Unauthorized(msg.sender);
        if (escrow.status != EscrowStatus.AWAITING_FUNDING) {
            revert InvalidStatusTransition();
        }

        _setEscrowStatus(escrow, EscrowStatus.CANCELLED);
        escrow.completedAt = uint64(block.timestamp);

        emit EscrowCancelled(escrowId, msg.sender);
    }

    /// @notice Returns the static summary for an escrow.
    /// @param escrowId The identifier of the escrow.
    /// @return The escrow summary.
    function getEscrowSummary(
        uint256 escrowId
    ) external view returns (EscrowSummary memory) {
        EscrowData storage escrow = _getEscrowStorage(escrowId);
        return _toEscrowSummary(escrow);
    }

    /// @notice Returns the text fields for an escrow.
    /// @param escrowId The identifier of the escrow.
    /// @return The escrow text fields.
    function getEscrowText(
        uint256 escrowId
    ) external view returns (EscrowText memory) {
        EscrowData storage escrow = _getEscrowStorage(escrowId);
        return _toEscrowText(escrow);
    }

    /// @notice Returns the milestone ids attached to an escrow.
    /// @param escrowId The identifier of the escrow.
    /// @return The milestone ids.
    function getEscrowMilestoneIds(
        uint256 escrowId
    ) external view returns (uint256[] memory) {
        return _getEscrowStorage(escrowId).milestoneIds;
    }

    /// @notice Returns the static summary for a milestone.
    /// @param milestoneId The identifier of the milestone.
    /// @return The milestone summary.
    function getMilestoneSummary(
        uint256 milestoneId
    ) external view returns (MilestoneSummary memory) {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        return _toMilestoneSummary(milestone);
    }

    /// @notice Returns the text fields for a milestone.
    /// @param milestoneId The identifier of the milestone.
    /// @return The milestone text fields.
    function getMilestoneText(
        uint256 milestoneId
    ) external view returns (MilestoneText memory) {
        MilestoneData storage milestone = _getMilestoneStorage(milestoneId);
        return _toMilestoneText(milestone);
    }

    /// @notice Returns all escrow ids associated with a participant.
    /// @param participant The wallet to query.
    /// @return The list of escrow ids associated with the wallet.
    function getEscrowIdsForParticipant(
        address participant
    ) external view returns (uint256[] memory) {
        return participantEscrowIds[participant];
    }

    /// @notice Returns a resolver configuration used by the create flow.
    /// @param resolverType The configured resolver bucket.
    /// @return The resolver configuration.
    function getResolverConfig(
        ResolverType resolverType
    ) external view returns (ResolverConfig memory) {
        return resolverConfigs[resolverType];
    }

    /// @notice Returns the total number of escrows created.
    /// @return The escrow count.
    function getEscrowCount() external view returns (uint256) {
        return nextEscrowId - 1;
    }

    /// @notice Returns the total number of milestones created.
    /// @return The milestone count.
    function getMilestoneCount() external view returns (uint256) {
        return nextMilestoneId - 1;
    }

    /// @notice Rejects direct calls with calldata.
    fallback() external payable {
        revert("Direct payments not allowed");
    }

    /// @notice Rejects direct native token transfers without calldata.
    receive() external payable {
        revert("Direct payments not allowed");
    }

    function _createEscrow(
        CreateEscrowInput calldata input,
        MilestoneInput[] calldata milestoneInputs,
        address client
    ) internal returns (uint256 escrowId) {
        _validateEscrowInput(input, milestoneInputs);

        ResolverConfig memory resolverConfig;
        if (input.resolverType != ResolverType.NONE) {
            resolverConfig = resolverConfigs[input.resolverType];
            if (!resolverConfig.active || resolverConfig.resolver == address(0)) {
                revert ResolverNotConfigured(input.resolverType);
            }
        }

        escrowId = nextEscrowId++;

        EscrowData storage escrow = escrows[escrowId];
        escrow.id = escrowId;
        escrow.title = input.title;
        escrow.description = input.description;
        escrow.clientName = input.clientName;
        escrow.recipientName = input.recipientName;
        escrow.client = client;
        escrow.recipient = input.recipient;
        escrow.token = input.token;
        escrow.totalAmount = input.totalAmount;
        escrow.createdAt = uint64(block.timestamp);
        escrow.fundingDeadline = input.fundingDeadline;
        escrow.defaultReleaseRule = input.defaultReleaseRule;
        escrow.refundPolicy = input.refundPolicy;
        escrow.resolverType = input.resolverType;
        escrow.resolver = resolverConfig.resolver;
        escrow.resolverFeeBps = resolverConfig.feeBps;
        escrow.status = EscrowStatus.AWAITING_FUNDING;

        for (uint256 i = 0; i < milestoneInputs.length; i++) {
            uint256 milestoneId = nextMilestoneId++;
            MilestoneInput calldata milestoneInput = milestoneInputs[i];
            MilestoneData storage milestone = milestones[milestoneId];

            milestone.id = milestoneId;
            milestone.escrowId = escrowId;
            milestone.title = milestoneInput.title;
            milestone.description = milestoneInput.description;
            milestone.amount = milestoneInput.amount;
            milestone.dueDate = milestoneInput.dueDate;
            milestone.releaseRule = milestoneInput.releaseRule;
            milestone.refundPolicy = input.refundPolicy;
            milestone.status = MilestoneStatus.PENDING;
            milestone.releaseCondition = milestoneInput.releaseCondition;

            escrow.milestoneIds.push(milestoneId);

            emit MilestoneCreated(
                milestoneId,
                escrowId,
                milestone.amount,
                milestone.dueDate,
                milestone.releaseRule,
                milestone.title
            );
        }

        _indexEscrowParticipants(escrow);

        emit EscrowCreated(
            escrowId,
            client,
            input.recipient,
            input.token,
            input.totalAmount,
            input.fundingDeadline,
            input.resolverType
        );
    }

    function _fundEscrow(uint256 escrowId, address caller) internal {
        EscrowData storage escrow = _getEscrowStorage(escrowId);

        if (caller != escrow.client) revert Unauthorized(caller);
        if (escrow.status != EscrowStatus.AWAITING_FUNDING) revert InvalidStatusTransition();
        if (block.timestamp > escrow.fundingDeadline) revert FundingWindowClosed(escrowId);

        IERC20(escrow.token).safeTransferFrom(caller, address(this), escrow.totalAmount);

        escrow.fundedAmount = escrow.totalAmount;
        escrow.fundedAt = uint64(block.timestamp);

        emit EscrowFunded(escrowId, caller, escrow.totalAmount);
        _setEscrowStatus(escrow, EscrowStatus.LIVE);
    }

    function _validateEscrowInput(
        CreateEscrowInput calldata input,
        MilestoneInput[] calldata milestoneInputs
    ) internal view {
        if (input.recipient == address(0)) revert ZeroAddress("recipient");
        if (input.token == address(0)) revert ZeroAddress("token");
        if (input.totalAmount == 0) revert InvalidAmount();
        if (input.fundingDeadline <= block.timestamp) revert InvalidTime("fundingDeadline");
        if (bytes(input.title).length == 0) revert EmptyString("title");
        if (bytes(input.description).length == 0) revert EmptyString("description");
        if (bytes(input.clientName).length == 0) revert EmptyString("clientName");
        if (bytes(input.recipientName).length == 0) revert EmptyString("recipientName");
        if (milestoneInputs.length == 0) revert InvalidAmount();

        uint256 totalMilestoneAmount;
        for (uint256 i = 0; i < milestoneInputs.length; i++) {
            MilestoneInput calldata milestone = milestoneInputs[i];

            if (bytes(milestone.title).length == 0) revert EmptyString("milestone.title");
            if (bytes(milestone.description).length == 0) revert EmptyString("milestone.description");
            if (milestone.amount == 0) revert InvalidAmount();
            if (milestone.dueDate <= block.timestamp) revert InvalidTime("milestone.dueDate");
            if (
                milestone.releaseRule == MilestoneReleaseRule.CUSTOM &&
                bytes(milestone.releaseCondition).length == 0
            ) {
                revert EmptyString("milestone.releaseCondition");
            }

            totalMilestoneAmount += milestone.amount;
        }

        if (totalMilestoneAmount != input.totalAmount) {
            revert MilestoneAmountMismatch(input.totalAmount, totalMilestoneAmount);
        }
    }

    function _syncEscrowAfterSettlement(EscrowData storage escrow) internal {
        if (escrow.releasedAmount + escrow.refundedAmount == escrow.totalAmount) {
            escrow.completedAt = uint64(block.timestamp);
            _setEscrowStatus(escrow, EscrowStatus.COMPLETED);
            emit EscrowCompleted(escrow.id, msg.sender);
            return;
        }

        bool hasDispute;
        bool hasReview;
        for (uint256 i = 0; i < escrow.milestoneIds.length; i++) {
            MilestoneStatus status = milestones[escrow.milestoneIds[i]].status;

            if (status == MilestoneStatus.DISPUTED) {
                hasDispute = true;
                break;
            }
            if (
                status == MilestoneStatus.IN_REVIEW ||
                status == MilestoneStatus.APPROVED
            ) {
                hasReview = true;
            }
        }

        if (hasDispute) {
            _setEscrowStatus(escrow, EscrowStatus.DISPUTED);
        } else if (hasReview) {
            _setEscrowStatus(escrow, EscrowStatus.IN_REVIEW);
        } else {
            _setEscrowStatus(escrow, EscrowStatus.LIVE);
        }
    }

    function _setEscrowStatus(
        EscrowData storage escrow,
        EscrowStatus newStatus
    ) internal {
        EscrowStatus oldStatus = escrow.status;
        if (oldStatus == newStatus) return;

        escrow.status = newStatus;
        emit EscrowStatusChanged(escrow.id, oldStatus, newStatus);
    }

    function _canRelease(
        MilestoneData storage milestone
    ) internal view returns (bool) {
        if (_isMilestoneSettled(milestone.status)) return false;
        if (milestone.status == MilestoneStatus.DISPUTED) return false;
        if (milestone.status == MilestoneStatus.APPROVED) return true;

        return (
            milestone.releaseRule == MilestoneReleaseRule.CLIENT_APPROVAL_OR_TIMEOUT &&
            milestone.status == MilestoneStatus.IN_REVIEW &&
            milestone.reviewDeadline != 0 &&
            block.timestamp >= milestone.reviewDeadline
        );
    }

    function _canRefund(
        EscrowData storage escrow,
        MilestoneData storage milestone
    ) internal view returns (bool) {
        if (_isMilestoneSettled(milestone.status)) return false;
        if (milestone.refundPolicy == RefundPolicy.MEDIATOR_CAN_SPLIT_REFUND) {
            return false;
        }

        if (milestone.refundPolicy == RefundPolicy.MANUAL_ONLY) {
            return (
                milestone.clientRefundApproved &&
                milestone.recipientRefundApproved &&
                (msg.sender == escrow.client || msg.sender == escrow.recipient)
            );
        }

        return (
            msg.sender == escrow.client &&
            block.timestamp >= milestone.dueDate &&
            !milestone.clientApproved
        );
    }

    function _isMilestoneApproved(
        MilestoneData storage milestone
    ) internal view returns (bool) {
        if (
            milestone.releaseRule == MilestoneReleaseRule.CLIENT_APPROVAL ||
            milestone.releaseRule == MilestoneReleaseRule.CLIENT_APPROVAL_OR_TIMEOUT ||
            milestone.releaseRule == MilestoneReleaseRule.CUSTOM
        ) {
            return milestone.clientApproved;
        }

        return milestone.clientApproved && milestone.recipientApproved;
    }

    function _isMilestoneSettled(
        MilestoneStatus status
    ) internal pure returns (bool) {
        return (
            status == MilestoneStatus.RELEASED ||
            status == MilestoneStatus.REFUNDED ||
            status == MilestoneStatus.RESOLVED ||
            status == MilestoneStatus.CANCELLED
        );
    }

    function _isAuthorizedResolver(
        EscrowData storage escrow,
        address caller
    ) internal view returns (bool) {
        return caller == owner() || caller == escrow.resolver;
    }

    function _indexEscrowParticipants(EscrowData storage escrow) internal {
        participantEscrowIds[escrow.client].push(escrow.id);

        if (escrow.recipient != escrow.client) {
            participantEscrowIds[escrow.recipient].push(escrow.id);
        }

        if (
            escrow.resolver != address(0) &&
            escrow.resolver != escrow.client &&
            escrow.resolver != escrow.recipient
        ) {
            participantEscrowIds[escrow.resolver].push(escrow.id);
        }
    }

    function _getEscrowStorage(
        uint256 escrowId
    ) internal view returns (EscrowData storage escrow) {
        escrow = escrows[escrowId];
        if (escrow.id == 0) revert EscrowNotFound(escrowId);
    }

    function _getMilestoneStorage(
        uint256 milestoneId
    ) internal view returns (MilestoneData storage milestone) {
        milestone = milestones[milestoneId];
        if (milestone.id == 0) revert MilestoneNotFound(milestoneId);
    }

    function _toEscrowSummary(
        EscrowData storage escrow
    ) internal view returns (EscrowSummary memory) {
        return EscrowSummary({
            id: escrow.id,
            client: escrow.client,
            recipient: escrow.recipient,
            token: escrow.token,
            totalAmount: escrow.totalAmount,
            fundedAmount: escrow.fundedAmount,
            releasedAmount: escrow.releasedAmount,
            refundedAmount: escrow.refundedAmount,
            createdAt: escrow.createdAt,
            fundingDeadline: escrow.fundingDeadline,
            fundedAt: escrow.fundedAt,
            completedAt: escrow.completedAt,
            defaultReleaseRule: escrow.defaultReleaseRule,
            refundPolicy: escrow.refundPolicy,
            resolverType: escrow.resolverType,
            resolver: escrow.resolver,
            resolverFeeBps: escrow.resolverFeeBps,
            status: escrow.status,
            milestoneCount: escrow.milestoneIds.length
        });
    }

    function _toEscrowText(
        EscrowData storage escrow
    ) internal view returns (EscrowText memory) {
        return EscrowText({
            title: escrow.title,
            description: escrow.description,
            clientName: escrow.clientName,
            recipientName: escrow.recipientName
        });
    }

    function _toMilestoneSummary(
        MilestoneData storage milestone
    ) internal view returns (MilestoneSummary memory) {
        return MilestoneSummary({
            id: milestone.id,
            escrowId: milestone.escrowId,
            amount: milestone.amount,
            dueDate: milestone.dueDate,
            submittedAt: milestone.submittedAt,
            reviewDeadline: milestone.reviewDeadline,
            resolvedAt: milestone.resolvedAt,
            releaseRule: milestone.releaseRule,
            refundPolicy: milestone.refundPolicy,
            status: milestone.status,
            clientApproved: milestone.clientApproved,
            recipientApproved: milestone.recipientApproved,
            clientRefundApproved: milestone.clientRefundApproved,
            recipientRefundApproved: milestone.recipientRefundApproved
        });
    }

    function _toMilestoneText(
        MilestoneData storage milestone
    ) internal view returns (MilestoneText memory) {
        return MilestoneText({
            title: milestone.title,
            description: milestone.description,
            releaseCondition: milestone.releaseCondition
        });
    }
}
