import { formatUnits } from "viem";
import { fundingTokenDecimals, fundingTokenSymbol } from "@/lib/wagmi-helpers";

export const ESCROW_STATUS = {
	DRAFT: 0,
	AWAITING_FUNDING: 1,
	LIVE: 2,
	IN_REVIEW: 3,
	DISPUTED: 4,
	COMPLETED: 5,
	CANCELLED: 6,
} as const;

export const MILESTONE_STATUS = {
	PENDING: 0,
	IN_REVIEW: 1,
	APPROVED: 2,
	RELEASED: 3,
	REFUNDED: 4,
	DISPUTED: 5,
	RESOLVED: 6,
	CANCELLED: 7,
} as const;

export const GLOBAL_RELEASE_RULE = {
	DUAL_APPROVAL: 0,
	CLIENT_APPROVAL_AND_TIMEOUT: 1,
} as const;

export const MILESTONE_RELEASE_RULE = {
	CLIENT_APPROVAL: 0,
	BOTH_PARTIES_APPROVE: 1,
	CLIENT_APPROVAL_OR_TIMEOUT: 2,
	CUSTOM: 3,
} as const;

export const REFUND_POLICY = {
	ON_EXPIRY_IF_UNAPPROVED: 0,
	MEDIATOR_CAN_SPLIT_REFUND: 1,
	MANUAL_ONLY: 2,
} as const;

export const RESOLVER_TYPE = {
	NONE: 0,
	PLATFORM: 1,
	INDEPENDENT: 2,
} as const;

export type EscrowViewResult = {
	summary: {
		id: bigint;
		client: `0x${string}`;
		recipient: `0x${string}`;
		token: `0x${string}`;
		totalAmount: bigint;
		fundedAmount: bigint;
		releasedAmount: bigint;
		refundedAmount: bigint;
		createdAt: bigint;
		fundingDeadline: bigint;
		fundedAt: bigint;
		completedAt: bigint;
		defaultReleaseRule: number;
		refundPolicy: number;
		resolverType: number;
		resolver: `0x${string}`;
		resolverFeeBps: number;
		status: number;
		milestoneCount: bigint;
	};
	text: {
		title: string;
		description: string;
		clientName: string;
		recipientName: string;
	};
	milestoneIds: bigint[];
	milestones: MilestoneViewResult[];
};

export type MilestoneViewResult = {
	summary: {
		id: bigint;
		escrowId: bigint;
		amount: bigint;
		dueDate: bigint;
		submittedAt: bigint;
		reviewDeadline: bigint;
		resolvedAt: bigint;
		releaseRule: number;
		refundPolicy: number;
		status: number;
		clientApproved: boolean;
		recipientApproved: boolean;
		clientRefundApproved: boolean;
		recipientRefundApproved: boolean;
	};
	text: {
		title: string;
		description: string;
		releaseCondition: string;
	};
};

export type TimelineMilestone = {
	id: string;
	rawId: bigint;
	rawStatus: number;
	title: string;
	description: string;
	releaseCondition: string;
	amount: string;
	amountValue: bigint;
	timestamp: string;
	status:
		| "Ready for delivery"
		| "In review"
		| "Approved"
		| "Released"
		| "Refunded"
		| "Resolved"
		| "Cancelled"
		| "Disputed";
	statusTone: string;
	dueDate: bigint;
	reviewDeadline: bigint;
	resolvedAt: bigint;
	releaseRule: number;
	refundPolicy: number;
	clientApproved: boolean;
	recipientApproved: boolean;
	clientRefundApproved: boolean;
	recipientRefundApproved: boolean;
};

export type EscrowCard = {
	id: string;
	rawId: bigint;
	rawStatus: number;
	clientName: string;
	recipientName: string;
	clientAddress: `0x${string}`;
	recipientAddress: `0x${string}`;
	resolverAddress: `0x${string}`;
	title: string;
	description: string;
	counterparties: string;
	category: string;
	amount: string;
	totalAmountValue: bigint;
	fundedAmountValue: bigint;
	completedMilestones: number;
	totalMilestones: number;
	status: string;
	statusTone: string;
	released: string;
	pending: string;
	mediator: string;
	fundingDeadlineLabel: string;
	clientLabel: string;
	recipientLabel: string;
	resolverLabel: string;
	nextActionTitle: string;
	nextActionDescription: string;
	reviewWindowLabel: string;
	explorerLabel: string;
	milestones: TimelineMilestone[];
};

export type DashboardStat = {
	label: string;
	value: string;
	helper: string;
	icon: "landmark" | "workflow" | "shield";
};

export function formatTokenAmount(value: bigint) {
	const normalized = Number(formatUnits(value, fundingTokenDecimals));
	return `${normalized.toLocaleString("en-US", {
		maximumFractionDigits: fundingTokenDecimals,
	})} ${fundingTokenSymbol}`;
}

export function formatShortDate(timestamp: bigint) {
	if (timestamp === 0n) {
		return "Pending";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
	}).format(new Date(Number(timestamp) * 1000));
}

export function formatLongDate(timestamp: bigint) {
	if (timestamp === 0n) {
		return "Pending";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(Number(timestamp) * 1000));
}

export function formatAddressLabel(address?: string) {
	if (!address) {
		return "Not set";
	}

	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function normalizeAddress(address?: string) {
	return address?.toLowerCase() ?? "";
}

export function getEscrowStatusLabel(status: number) {
	switch (status) {
		case ESCROW_STATUS.AWAITING_FUNDING:
			return "Awaiting funding";
		case ESCROW_STATUS.LIVE:
			return "Funded";
		case ESCROW_STATUS.IN_REVIEW:
			return "In review";
		case ESCROW_STATUS.DISPUTED:
			return "Disputed";
		case ESCROW_STATUS.COMPLETED:
			return "Completed";
		case ESCROW_STATUS.CANCELLED:
			return "Cancelled";
		default:
			return "Draft";
	}
}

export function getEscrowStatusTone(status: number) {
	switch (status) {
		case ESCROW_STATUS.COMPLETED:
			return "status-emerald";
		case ESCROW_STATUS.DISPUTED:
			return "status-rose";
		case ESCROW_STATUS.IN_REVIEW:
			return "status-amber";
		default:
			return "status-cyan";
	}
}

export function getResolverLabel(resolverType: number) {
	switch (resolverType) {
		case RESOLVER_TYPE.PLATFORM:
			return "Platform review";
		case RESOLVER_TYPE.INDEPENDENT:
			return "Independent resolver";
		default:
			return "Direct resolution";
	}
}

export function getMilestoneStatusLabel(status: number): TimelineMilestone["status"] {
	switch (status) {
		case MILESTONE_STATUS.PENDING:
			return "Ready for delivery";
		case MILESTONE_STATUS.IN_REVIEW:
			return "In review";
		case MILESTONE_STATUS.APPROVED:
			return "Approved";
		case MILESTONE_STATUS.RELEASED:
			return "Released";
		case MILESTONE_STATUS.REFUNDED:
			return "Refunded";
		case MILESTONE_STATUS.RESOLVED:
			return "Resolved";
		case MILESTONE_STATUS.CANCELLED:
			return "Cancelled";
		case MILESTONE_STATUS.DISPUTED:
		default:
			return "Disputed";
	}
}

export function getMilestoneTone(status: TimelineMilestone["status"]) {
	if (status === "Disputed") {
		return "status-rose";
	}
	if (status === "In review" || status === "Approved") {
		return "status-amber";
	}
	if (status === "Released" || status === "Resolved") {
		return "status-emerald";
	}
	if (status === "Refunded" || status === "Cancelled") {
		return "status-cyan";
	}
	return "status-cyan";
}

export function mapMilestone(view: MilestoneViewResult): TimelineMilestone {
	const status = getMilestoneStatusLabel(Number(view.summary.status));
	const timestamp =
		view.summary.resolvedAt > 0n
			? formatShortDate(view.summary.resolvedAt)
			: view.summary.reviewDeadline > 0n
				? `Review until ${formatShortDate(view.summary.reviewDeadline)}`
				: `Due ${formatShortDate(view.summary.dueDate)}`;

	return {
		id: view.summary.id.toString(),
		rawId: view.summary.id,
		rawStatus: Number(view.summary.status),
		title: view.text.title,
		description: view.text.description,
		releaseCondition: view.text.releaseCondition,
		amount: formatTokenAmount(view.summary.amount),
		amountValue: view.summary.amount,
		timestamp,
		status,
		statusTone: getMilestoneTone(status),
		dueDate: view.summary.dueDate,
		reviewDeadline: view.summary.reviewDeadline,
		resolvedAt: view.summary.resolvedAt,
		releaseRule: Number(view.summary.releaseRule),
		refundPolicy: Number(view.summary.refundPolicy),
		clientApproved: view.summary.clientApproved,
		recipientApproved: view.summary.recipientApproved,
		clientRefundApproved: view.summary.clientRefundApproved,
		recipientRefundApproved: view.summary.recipientRefundApproved,
	};
}

export function mapEscrowView(view: EscrowViewResult): EscrowCard {
	const milestones = view.milestones.map(mapMilestone);
	const completedStatuses = new Set<number>([
		MILESTONE_STATUS.RELEASED,
		MILESTONE_STATUS.REFUNDED,
		MILESTONE_STATUS.RESOLVED,
		MILESTONE_STATUS.CANCELLED,
	]);
	const completedMilestones = view.milestones.filter((milestone) =>
		completedStatuses.has(Number(milestone.summary.status)),
	).length;
	const totalMilestones = view.milestones.length;
	const pendingAmount =
		view.summary.totalAmount -
		view.summary.releasedAmount -
		view.summary.refundedAmount;
	const nextActionMilestone =
		milestones.find((milestone) => !isMilestoneSettled(milestone.rawStatus)) ??
		milestones[milestones.length - 1];

	return {
		id: view.summary.id.toString(),
		rawId: view.summary.id,
		rawStatus: Number(view.summary.status),
		clientName: view.text.clientName,
		recipientName: view.text.recipientName,
		clientAddress: view.summary.client,
		recipientAddress: view.summary.recipient,
		resolverAddress: view.summary.resolver,
		title: view.text.title,
		description: view.text.description,
		counterparties: `${view.text.clientName} and ${view.text.recipientName}`,
		category: "Milestone escrow",
		amount: formatTokenAmount(view.summary.totalAmount),
		totalAmountValue: view.summary.totalAmount,
		fundedAmountValue: view.summary.fundedAmount,
		completedMilestones,
		totalMilestones,
		status: getEscrowStatusLabel(Number(view.summary.status)),
		statusTone: getEscrowStatusTone(Number(view.summary.status)),
		released: formatTokenAmount(view.summary.releasedAmount),
		pending: formatTokenAmount(pendingAmount > 0n ? pendingAmount : 0n),
		mediator: getResolverLabel(Number(view.summary.resolverType)),
		fundingDeadlineLabel: formatLongDate(view.summary.fundingDeadline),
		clientLabel: formatAddressLabel(view.summary.client),
		recipientLabel: formatAddressLabel(view.summary.recipient),
		resolverLabel: formatAddressLabel(view.summary.resolver),
		nextActionTitle: nextActionMilestone?.title ?? "No milestone activity yet",
		nextActionDescription:
			nextActionMilestone?.description ??
			"Create and fund an escrow to begin milestone tracking.",
		reviewWindowLabel:
			nextActionMilestone?.timestamp ??
			`Due ${formatShortDate(view.summary.fundingDeadline)}`,
		explorerLabel: formatAddressLabel(view.summary.client),
		milestones,
	};
}

export function buildDashboardStats(views: EscrowViewResult[]): DashboardStat[] {
	const totalProtectedVolume = views.reduce((sum, view) => {
		const status = Number(view.summary.status);
		const protectedAmount =
			status === ESCROW_STATUS.AWAITING_FUNDING ||
			status === ESCROW_STATUS.DRAFT ||
			status === ESCROW_STATUS.CANCELLED
				? 0n
				: view.summary.fundedAmount > 0n
					? view.summary.fundedAmount
					: view.summary.totalAmount;

		return sum + protectedAmount;
	}, 0n);
	const openContracts = views.filter(
		(view) =>
			Number(view.summary.status) !== ESCROW_STATUS.COMPLETED &&
			Number(view.summary.status) !== ESCROW_STATUS.CANCELLED,
	).length;
	const pendingReleases = views.reduce((sum, view) => {
		const pendingStatuses = new Set<number>([
			MILESTONE_STATUS.IN_REVIEW,
			MILESTONE_STATUS.APPROVED,
		]);

		return (
			sum +
			view.milestones.reduce((milestoneSum, milestone) => {
				return pendingStatuses.has(Number(milestone.summary.status))
					? milestoneSum + milestone.summary.amount
					: milestoneSum;
			}, 0n)
		);
	}, 0n);

	return [
		{
			label: "Protected volume",
			value: formatTokenAmount(totalProtectedVolume),
			helper: "Escrow value across contracts visible to the connected wallet.",
			icon: "landmark",
		},
		{
			label: "Open contracts",
			value: openContracts.toLocaleString("en-US"),
			helper: "Contracts that still require funding, review, release, or resolution.",
			icon: "workflow",
		},
		{
			label: "Pending releases",
			value: formatTokenAmount(pendingReleases),
			helper: "Milestone value currently in review or approved but not yet settled.",
			icon: "shield",
		},
	];
}

export function getParticipantRole(
	escrow: EscrowCard,
	address?: `0x${string}`,
) {
	const normalizedAddress = normalizeAddress(address);
	if (!normalizedAddress) {
		return "viewer" as const;
	}
	if (normalizedAddress === normalizeAddress(escrow.clientAddress)) {
		return "client" as const;
	}
	if (normalizedAddress === normalizeAddress(escrow.recipientAddress)) {
		return "recipient" as const;
	}
	if (
		normalizeAddress(escrow.resolverAddress) !==
			"0x0000000000000000000000000000000000000000" &&
		normalizedAddress === normalizeAddress(escrow.resolverAddress)
	) {
		return "resolver" as const;
	}
	return "viewer" as const;
}

export function isMilestoneSettled(status: number) {
	return (
		status === MILESTONE_STATUS.RELEASED ||
		status === MILESTONE_STATUS.REFUNDED ||
		status === MILESTONE_STATUS.RESOLVED ||
		status === MILESTONE_STATUS.CANCELLED
	);
}
