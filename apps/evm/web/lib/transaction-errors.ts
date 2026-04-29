export function getErrorText(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "object" && error !== null) {
		const message = "message" in error ? error.message : "";
		return typeof message === "string" ? message : "";
	}

	return "";
}

export function getUserFacingTransactionErrorMessage(
	error: unknown,
	fundingTokenSymbol: string,
) {
	const message = getErrorText(error).toLowerCase();

	if (
		message.includes("user rejected") ||
		message.includes("user denied") ||
		message.includes("request rejected") ||
		message.includes("rejected the request") ||
		message.includes("cancelled") ||
		message.includes("canceled")
	) {
		return "The wallet request was cancelled.";
	}

	if (
		message.includes("max fee per gas less than block base fee") ||
		message.includes("fee cap less than block base fee")
	) {
		return "Network gas changed during submission. Try the transaction again.";
	}

	if (
		message.includes("insufficient funds") ||
		message.includes("exceeds the balance") ||
		message.includes("underfunded")
	) {
		return "The connected wallet does not have enough funds to complete this transaction.";
	}

	if (
		message.includes("allowance") ||
		message.includes("erc20insufficientallowance")
	) {
		return `Approval for ${fundingTokenSymbol} is missing or outdated. Try again to refresh the approval.`;
	}

	if (
		message.includes("invalid address") ||
		message.includes("address is invalid")
	) {
		return "One of the wallet addresses is invalid. Check the recipient address and try again.";
	}

	if (
		message.includes("connector not connected") ||
		message.includes("wallet not found") ||
		message.includes("not detected") ||
		message.includes("not installed")
	) {
		return "Connect the wallet again and retry the transaction.";
	}

	return "The transaction could not be completed. Please try again.";
}
