"use client";

import { useState } from "react";
import { useWallet } from "@/components/WalletProvider";
import { parseXlmAmountToStroops } from "@/lib/stellar-amount";
import { Client, networks } from "@/lib/soroban/trustblock-escrow-client/src";
import { storeActivityItem } from "@/lib/stellar-activity-store";
import { storeEscrowId } from "@/lib/stellar-escrow-store";
import { storeRecentTransaction } from "@/lib/stellar-transaction-store";
import { getUserFacingTransactionErrorMessage } from "@/lib/transaction-errors";

type CreateMilestoneInput = {
	title: string;
	description: string;
	amount: string;
	trigger: string;
	deadline: string;
};

type CreateEscrowDraft = {
	title: string;
	description: string;
	clientName: string;
	recipientName: string;
	recipientWallet: string;
	totalAmount: string;
	releaseType: string;
	refundPolicy: string;
	fundingWindow: string;
	selectedMediator: string;
	milestones: CreateMilestoneInput[];
};

function isStellarAddress(value: string) {
	return value.startsWith("G") && value.length >= 20;
}

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

export function useCreateEscrow({
	onSuccess,
}: {
	onSuccess?: (hash: string) => void;
} = {}) {
	const { address, networkPassphrase, signTransaction } = useWallet();
	const [statusMessage, setStatusMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isApproving, setIsApproving] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	const handleCreateEscrow = async (
		draft: CreateEscrowDraft,
		_mode?: "draft" | "createAndFund",
	) => {
		setErrorMessage("");
		setStatusMessage("");

		if (!address) {
			setErrorMessage("Connect a Stellar wallet before creating an escrow.");
			return;
		}

		if (!draft.title.trim() || !draft.clientName.trim() || !draft.recipientName.trim()) {
			setErrorMessage("Complete the escrow title and both party names first.");
			return;
		}

		if (!isStellarAddress(draft.recipientWallet)) {
			setErrorMessage("Enter a valid Stellar recipient address.");
			return;
		}

		if (draft.milestones.length === 0) {
			setErrorMessage("Add at least one milestone before creating the escrow.");
			return;
		}

		if (networkPassphrase !== networks.testnet.networkPassphrase) {
			setErrorMessage("Switch the connected wallet to Stellar TESTNET before creating the escrow.");
			return;
		}

		try {
			setIsApproving(false);
			setIsCreating(true);
			setIsProcessing(true);
			setStatusMessage("Preparing the Soroban escrow transaction in your Stellar wallet...");
			storeRecentTransaction({
				label: "Soroban escrow creation",
				status: "pending",
				updatedAt: new Date().toISOString(),
			});

			const milestoneTitles = draft.milestones.map((milestone, index) => {
				const title = milestone.title.trim();
				return title || `Milestone ${index + 1}`;
			});
			const milestoneAmounts = draft.milestones.map((milestone) =>
				parseXlmAmountToStroops(milestone.amount),
			);

			const client = new Client({
				contractId: networks.testnet.contractId,
				networkPassphrase: networks.testnet.networkPassphrase,
				address,
				publicKey: address,
				rpcUrl: TESTNET_RPC_URL,
				signTransaction,
			} as ConstructorParameters<typeof Client>[0] & { address: string });

			const transaction = await client.create_escrow(
				{
					client: address,
					recipient: draft.recipientWallet,
					resolver: undefined,
					title: draft.title.trim(),
					milestone_titles: milestoneTitles,
					milestone_amounts: milestoneAmounts,
				},
				{
					address,
					publicKey: address,
					signTransaction,
				} as Parameters<typeof client.create_escrow>[1] & { address: string },
			);

			setStatusMessage("Approve the Soroban escrow transaction in your Stellar wallet.");

			let submittedHash: string | undefined;
			const sentTransaction = await transaction.signAndSend({
				signTransaction,
				force: true,
				watcher: {
					onSubmitted(response) {
						submittedHash = response?.hash;
					},
				},
			});
			const escrowId = sentTransaction.result;
			const transactionHash =
				submittedHash ??
				sentTransaction.sendTransactionResponse?.hash ??
				sentTransaction.getTransactionResponse?.txHash ??
				(transaction.built
					? Buffer.from(transaction.built.hash()).toString("hex")
					: undefined);
			storeEscrowId(address, escrowId);
			storeRecentTransaction({
				details: `Escrow #${escrowId.toString()} was created on Stellar testnet.`,
				hash: transactionHash,
				label: "Soroban escrow creation",
				status: "success",
				updatedAt: new Date().toISOString(),
			});
			storeActivityItem({
				description: `Escrow #${escrowId.toString()} for ${draft.title.trim()} is now live on Stellar testnet.`,
				hash: transactionHash,
				id: `create-${escrowId.toString()}-${transactionHash ?? "nohash"}`,
				status: "success",
				timestamp: new Date().toISOString(),
				title: "Escrow created",
			});

			setStatusMessage(
				`Soroban escrow #${escrowId.toString()} was created on Stellar testnet.`,
			);
			onSuccess?.(transactionHash ?? escrowId.toString());
		} catch (error) {
			const userMessage = getUserFacingTransactionErrorMessage(error, "XLM");
			const detailedMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "";
			setErrorMessage(
				userMessage === "The transaction could not be completed. Please try again." &&
					detailedMessage
					? detailedMessage
					: userMessage,
			);
			storeRecentTransaction({
				errorMessage:
					userMessage === "The transaction could not be completed. Please try again." &&
					detailedMessage
						? detailedMessage
						: userMessage,
				label: "Soroban escrow creation",
				status: "fail",
				updatedAt: new Date().toISOString(),
			});
			storeActivityItem({
				description:
					userMessage === "The transaction could not be completed. Please try again." &&
					detailedMessage
						? detailedMessage
						: userMessage,
				id: `create-error-${Date.now()}`,
				status: "fail",
				timestamp: new Date().toISOString(),
				title: "Escrow creation failed",
			});
			console.error("Create escrow failed", error);
		} finally {
			setIsCreating(false);
			setIsProcessing(false);
		}
	};

	return {
		handleCreateEscrow,
		isApproving,
		isCreating,
		isProcessing,
		statusMessage,
		errorMessage,
		fundingTokenConfigured: true,
		fundingTokenSymbol: "XLM",
	};
}
