"use client";

import { useState } from "react";
import { useWallet } from "@/components/WalletProvider";

type ExecuteEscrowActionInput = {
	actionKey: string;
	functionName: string;
	args?: readonly unknown[];
	pendingMessage: string;
	successMessage: string;
	onSuccess?: (hash: `0x${string}`) => void | Promise<void>;
};

export function useEscrowAction() {
	const { address } = useWallet();
	const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState("");
	const [errorMessage, setErrorMessage] = useState("");

	const executeEscrowAction = async ({
		actionKey,
		pendingMessage,
		successMessage,
		onSuccess,
	}: ExecuteEscrowActionInput) => {
		setErrorMessage("");
		setStatusMessage("");

		if (!address) {
			setErrorMessage("Connect Freighter before continuing.");
			return false;
		}

		try {
			setActiveActionKey(actionKey);
			setStatusMessage(pendingMessage);
			await new Promise((resolve) => setTimeout(resolve, 350));
			setStatusMessage(successMessage);
			await onSuccess?.("0xstellaractionplaceholder" as `0x${string}`);
			return true;
		} catch {
			setStatusMessage("");
			setErrorMessage("Unable to complete the Stellar escrow action.");
			return false;
		} finally {
			setActiveActionKey(null);
		}
	};

	return {
		executeEscrowAction,
		activeActionKey,
		isProcessing: activeActionKey !== null,
		statusMessage,
		errorMessage,
		clearActionFeedback: () => {
			setStatusMessage("");
			setErrorMessage("");
		},
	};
}
