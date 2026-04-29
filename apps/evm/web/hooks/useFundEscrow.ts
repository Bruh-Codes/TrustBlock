"use client";

import { useState } from "react";
import { useWallet } from "@/components/WalletProvider";
import { Client, networks } from "@/lib/soroban/trustblock-escrow-client/src";
import { storeActivityItem } from "@/lib/stellar-activity-store";
import { storeRecentTransaction } from "@/lib/stellar-transaction-store";
import { getUserFacingTransactionErrorMessage } from "@/lib/transaction-errors";

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

export function useFundEscrow({
	onSuccess,
}: {
	onSuccess?: (hash: string) => void | Promise<void>;
} = {}) {
	const { address, networkPassphrase, signTransaction } = useWallet();
	const [statusMessage, setStatusMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isApproving, setIsApproving] = useState(false);
	const [isFunding, setIsFunding] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	const fundEscrow = async (input?: {
		escrowId: bigint;
		totalAmount: bigint;
	}) => {
		setErrorMessage("");
		setStatusMessage("");

		if (!address) {
			setErrorMessage("Connect a Stellar wallet before funding the escrow.");
			return;
		}

		if (!input) {
			setErrorMessage("Select an escrow before funding.");
			return;
		}

		if (networkPassphrase !== networks.testnet.networkPassphrase) {
			setErrorMessage("Switch the connected wallet to Stellar TESTNET before funding the escrow.");
			return;
		}

		try {
			setIsApproving(false);
			setIsFunding(true);
			setIsProcessing(true);
			setStatusMessage("Preparing the Soroban funding transaction in your Stellar wallet...");
			storeRecentTransaction({
				label: "Soroban escrow funding",
				status: "pending",
				updatedAt: new Date().toISOString(),
			});

			const client = new Client({
				contractId: networks.testnet.contractId,
				networkPassphrase: networks.testnet.networkPassphrase,
				address,
				publicKey: address,
				rpcUrl: TESTNET_RPC_URL,
				signTransaction,
			} as ConstructorParameters<typeof Client>[0] & { address: string });

			const transaction = await client.fund_escrow(
				{
					amount: input.totalAmount,
					client: address,
					escrow_id: input.escrowId,
				},
				{
					address,
					publicKey: address,
					signTransaction,
				} as Parameters<typeof client.fund_escrow>[1] & { address: string },
			);

			setStatusMessage("Approve the Soroban funding transaction in your Stellar wallet.");

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

			const transactionHash =
				submittedHash ??
				sentTransaction.sendTransactionResponse?.hash ??
				sentTransaction.getTransactionResponse?.txHash ??
				(transaction.built
					? Buffer.from(transaction.built.hash()).toString("hex")
					: undefined);

			setStatusMessage(
				`Escrow #${input.escrowId.toString()} was funded on Stellar testnet.`,
			);
			storeRecentTransaction({
				details: `Escrow #${input.escrowId.toString()} funding transaction was submitted successfully.`,
				hash: transactionHash,
				label: "Soroban escrow funding",
				status: "success",
				updatedAt: new Date().toISOString(),
			});
			storeActivityItem({
				description: `Escrow #${input.escrowId.toString()} received its funding transaction on Stellar testnet.`,
				hash: transactionHash,
				id: `fund-${input.escrowId.toString()}-${transactionHash ?? "nohash"}`,
				status: "success",
				timestamp: new Date().toISOString(),
				title: "Escrow funded",
			});

			await onSuccess?.(transactionHash ?? input.escrowId.toString());
		} catch (error) {
			const userMessage = getUserFacingTransactionErrorMessage(error, "XLM");
			const detailedMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "";
			const finalMessage =
				userMessage === "The transaction could not be completed. Please try again." &&
				detailedMessage
					? detailedMessage
					: userMessage;

			setErrorMessage(finalMessage);
			storeRecentTransaction({
				errorMessage: finalMessage,
				label: "Soroban escrow funding",
				status: "fail",
				updatedAt: new Date().toISOString(),
			});
			storeActivityItem({
				description: finalMessage,
				id: `fund-error-${Date.now()}`,
				status: "fail",
				timestamp: new Date().toISOString(),
				title: "Escrow funding failed",
			});
			console.error("Fund escrow failed", error);
		} finally {
			setIsFunding(false);
			setIsProcessing(false);
		}
	};

	return {
		fundEscrow,
		isApproving,
		isFunding,
		isProcessing,
		statusMessage,
		errorMessage,
	};
}
