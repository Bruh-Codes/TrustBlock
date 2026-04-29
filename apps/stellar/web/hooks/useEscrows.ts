"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/components/WalletProvider";
import { Client, networks, type Escrow, type Milestone } from "@/lib/soroban/trustblock-escrow-client/src";
import { ESCROW_STATUS, MILESTONE_STATUS, type DashboardStat, type EscrowCard, type TimelineMilestone } from "@/lib/escrow";
import { formatAddressLabel } from "@/lib/escrow";
import { storeActivityItem } from "@/lib/stellar-activity-store";
import { loadStoredEscrowIds } from "@/lib/stellar-escrow-store";

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
const ZERO_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function formatXlmAmount(value: bigint) {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const whole = absolute / 10_000_000n;
	const fraction = absolute % 10_000_000n;
	const fractionText = fraction.toString().padStart(7, "0").replace(/0+$/, "");

	return `${sign}${whole.toLocaleString("en-US")}${fractionText ? `.${fractionText}` : ""} XLM`;
}

function mapContractStatus(status: number) {
	switch (status) {
		case 1:
			return ESCROW_STATUS.LIVE;
		case 2:
			return ESCROW_STATUS.IN_REVIEW;
		case 3:
			return ESCROW_STATUS.COMPLETED;
		case 4:
			return ESCROW_STATUS.CANCELLED;
		default:
			return ESCROW_STATUS.AWAITING_FUNDING;
	}
}

function getEscrowStatusLabel(status: number) {
	switch (status) {
		case ESCROW_STATUS.LIVE:
			return "Funded";
		case ESCROW_STATUS.IN_REVIEW:
			return "In review";
		case ESCROW_STATUS.COMPLETED:
			return "Completed";
		case ESCROW_STATUS.CANCELLED:
			return "Refunded";
		default:
			return "Awaiting funding";
	}
}

function getEscrowStatusTone(status: number) {
	switch (status) {
		case ESCROW_STATUS.COMPLETED:
			return "status-emerald";
		case ESCROW_STATUS.IN_REVIEW:
			return "status-amber";
		case ESCROW_STATUS.CANCELLED:
			return "status-rose";
		default:
			return "status-cyan";
	}
}

function mapMilestoneStatus(milestone: Milestone) {
	if (milestone.released) {
		return MILESTONE_STATUS.RELEASED;
	}
	if (milestone.client_approved) {
		return MILESTONE_STATUS.APPROVED;
	}
	if (milestone.submitted) {
		return MILESTONE_STATUS.IN_REVIEW;
	}
	return MILESTONE_STATUS.PENDING;
}

function getMilestoneStatusLabel(status: number): TimelineMilestone["status"] {
	switch (status) {
		case MILESTONE_STATUS.RELEASED:
			return "Released";
		case MILESTONE_STATUS.APPROVED:
			return "Approved";
		case MILESTONE_STATUS.IN_REVIEW:
			return "In review";
		default:
			return "Ready for delivery";
	}
}

function getMilestoneTone(status: TimelineMilestone["status"]) {
	switch (status) {
		case "Released":
			return "status-emerald";
		case "Approved":
		case "In review":
			return "status-amber";
		default:
			return "status-cyan";
	}
}

function mapMilestone(milestone: Milestone): TimelineMilestone {
	const rawStatus = mapMilestoneStatus(milestone);
	const status = getMilestoneStatusLabel(rawStatus);

	return {
		id: milestone.id.toString(),
		rawId: BigInt(milestone.id),
		rawStatus,
		title: milestone.title,
		description: "Milestone tracked on the Soroban escrow contract.",
		releaseCondition: "Client approval",
		amount: formatXlmAmount(milestone.amount),
		amountValue: milestone.amount,
		timestamp:
			status === "Released"
				? "Released onchain"
				: status === "Approved"
					? "Approved onchain"
					: status === "In review"
						? "Submitted for review"
						: "Ready for delivery",
		status,
		statusTone: getMilestoneTone(status),
		dueDate: 0n,
		reviewDeadline: 0n,
		resolvedAt: 0n,
		releaseRule: 0,
		refundPolicy: 0,
		clientApproved: milestone.client_approved,
		recipientApproved: milestone.submitted,
		clientRefundApproved: false,
		recipientRefundApproved: false,
	};
}

function mapEscrow(escrow: Escrow, milestones: Milestone[]): EscrowCard {
	const mappedMilestones = milestones.map(mapMilestone);
	const rawStatus = mapContractStatus(Number(escrow.status));
	const settledMilestones = mappedMilestones.filter(
		(milestone) => milestone.rawStatus === MILESTONE_STATUS.RELEASED,
	).length;
	const pendingAmount =
		escrow.total_amount - escrow.released_amount - escrow.refunded_amount;
	const nextMilestone =
		mappedMilestones.find((milestone) => milestone.rawStatus !== MILESTONE_STATUS.RELEASED) ??
		mappedMilestones[mappedMilestones.length - 1];

	return {
		id: escrow.id.toString(),
		rawId: escrow.id,
		rawStatus,
		clientName: formatAddressLabel(escrow.client),
		recipientName: formatAddressLabel(escrow.recipient),
		clientAddress: escrow.client as `0x${string}`,
		recipientAddress: escrow.recipient as `0x${string}`,
		resolverAddress: (escrow.resolver ?? ZERO_ADDRESS) as `0x${string}`,
		title: escrow.title,
		description: "Live Stellar escrow stored on the deployed Soroban contract.",
		counterparties: `${formatAddressLabel(escrow.client)} and ${formatAddressLabel(escrow.recipient)}`,
		category: "Milestone escrow",
		amount: formatXlmAmount(escrow.total_amount),
		totalAmountValue: escrow.total_amount,
		fundedAmountValue: escrow.funded_amount,
		completedMilestones: settledMilestones,
		totalMilestones: mappedMilestones.length,
		status: getEscrowStatusLabel(rawStatus),
		statusTone: getEscrowStatusTone(rawStatus),
		released: formatXlmAmount(escrow.released_amount),
		pending: formatXlmAmount(pendingAmount > 0n ? pendingAmount : 0n),
		mediator: escrow.resolver ? "Resolver assigned" : "Direct resolution",
		fundingDeadlineLabel: rawStatus === ESCROW_STATUS.AWAITING_FUNDING ? "Awaiting funding" : "Funded onchain",
		clientLabel: formatAddressLabel(escrow.client),
		recipientLabel: formatAddressLabel(escrow.recipient),
		resolverLabel: formatAddressLabel(escrow.resolver ?? ZERO_ADDRESS),
		nextActionTitle: nextMilestone?.title ?? "Escrow created",
		nextActionDescription:
			nextMilestone?.description ?? "This escrow has no milestone data yet.",
		reviewWindowLabel: nextMilestone?.timestamp ?? "Stored onchain",
		explorerLabel: formatAddressLabel(escrow.client),
		milestones: mappedMilestones,
	};
}

function buildFeaturedStats(escrows: EscrowCard[]): DashboardStat[] {
	const protectedVolume = escrows.reduce(
		(sum, escrow) => sum + escrow.fundedAmountValue,
		0n,
	);
	const pendingReleases = escrows.reduce((sum, escrow) => {
		return (
			sum +
			escrow.milestones.reduce((milestoneSum, milestone) => {
				return milestone.rawStatus === MILESTONE_STATUS.IN_REVIEW ||
					milestone.rawStatus === MILESTONE_STATUS.APPROVED
					? milestoneSum + milestone.amountValue
					: milestoneSum;
			}, 0n)
		);
	}, 0n);

	return [
		{
			label: "Protected volume",
			value: formatXlmAmount(protectedVolume),
			helper: "Escrow value currently funded on Stellar for this wallet.",
			icon: "landmark",
		},
		{
			label: "Open contracts",
			value: escrows.length.toLocaleString("en-US"),
			helper: "Escrows tracked from your local Stellar builder activity.",
			icon: "workflow",
		},
		{
			label: "Pending releases",
			value: formatXlmAmount(pendingReleases),
			helper: "Milestone value submitted or approved but not yet released.",
			icon: "shield",
		},
	];
}

export function useEscrows() {
	const { address, status, networkPassphrase } = useWallet();
	const isConnected = Boolean(address) && status === "connected";
	const previousEscrowsRef = useRef<Map<string, EscrowCard>>(new Map());

	const escrowsQuery = useQuery({
		queryKey: ["stellar-escrows", address],
		enabled: isConnected,
		refetchInterval: isConnected ? 4_000 : false,
		queryFn: async () => {
			if (!address) {
				return [] as EscrowCard[];
			}

			const ids = loadStoredEscrowIds(address);
			if (ids.length === 0) {
				return [] as EscrowCard[];
			}

			const client = new Client({
				contractId: networks.testnet.contractId,
				networkPassphrase: networks.testnet.networkPassphrase,
				rpcUrl: TESTNET_RPC_URL,
			});

			const escrows = await Promise.all(
				ids.map(async (escrowId) => {
					const [escrowTx, milestonesTx] = await Promise.all([
						client.get_escrow({ escrow_id: escrowId }),
						client.get_milestones({ escrow_id: escrowId }),
					]);

					return mapEscrow(escrowTx.result, milestonesTx.result);
				}),
			);

			return escrows.filter((escrow) => {
				const normalized = address.toLowerCase();
				return (
					escrow.clientAddress.toLowerCase() === normalized ||
					escrow.recipientAddress.toLowerCase() === normalized ||
					escrow.resolverAddress.toLowerCase() === normalized
				);
			});
		},
	});

	const escrows = escrowsQuery.data ?? [];
	const featuredStats = useMemo(
		() => (isConnected ? buildFeaturedStats(escrows) : []),
		[escrows, isConnected],
	);

	useEffect(() => {
		if (!isConnected) {
			previousEscrowsRef.current = new Map();
			return;
		}

		const previousEscrows = previousEscrowsRef.current;
		for (const escrow of escrows) {
			const previous = previousEscrows.get(escrow.id);
			if (!previous) {
				storeActivityItem({
					description: `${escrow.title} is being tracked in the ledger for this wallet.`,
					id: `tracked-${escrow.id}`,
					status: "info",
					timestamp: new Date().toISOString(),
					title: "Escrow synced",
				});
				continue;
			}

			if (previous.status !== escrow.status) {
				storeActivityItem({
					description: `${escrow.title} moved from ${previous.status} to ${escrow.status}.`,
					id: `status-${escrow.id}-${escrow.status}`,
					status:
						escrow.status === "Completed"
							? "success"
							: escrow.status === "Refunded"
								? "fail"
								: "pending",
					timestamp: new Date().toISOString(),
					title: "Escrow status changed",
				});
			}

			if (previous.completedMilestones !== escrow.completedMilestones) {
				storeActivityItem({
					description: `${escrow.title} now has ${escrow.completedMilestones}/${escrow.totalMilestones} milestones released.`,
					id: `milestone-${escrow.id}-${escrow.completedMilestones}`,
					status: "success",
					timestamp: new Date().toISOString(),
					title: "Milestone progress updated",
				});
			}
		}

		previousEscrowsRef.current = new Map(
			escrows.map((escrow) => [escrow.id, escrow] as const),
		);
	}, [escrows, isConnected]);

	return {
		address: address as `0x${string}` | undefined,
		activeChainId: 0,
		contractsConfigured: true,
		data: escrows,
		escrows,
		featuredStats,
		hasEscrows: escrows.length > 0,
		isConnected,
		isLoading: escrowsQuery.isLoading,
		isOnDeploymentChain: networkPassphrase === networks.testnet.networkPassphrase,
		refetch: escrowsQuery.refetch,
	};
}
