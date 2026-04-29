import { describe, expect, it } from "vitest";
import { getUserFacingTransactionErrorMessage } from "@/lib/transaction-errors";

describe("transaction error messages", () => {
	it("maps rejected wallet requests", () => {
		expect(
			getUserFacingTransactionErrorMessage(
				new Error("User rejected the request"),
				"XLM",
			),
		).toBe("The wallet request was cancelled.");
	});

	it("maps insufficient balance failures", () => {
		expect(
			getUserFacingTransactionErrorMessage(
				new Error("insufficient funds for this operation"),
				"XLM",
			),
		).toBe(
			"The connected wallet does not have enough funds to complete this transaction.",
		);
	});

	it("maps missing wallet detection failures", () => {
		expect(
			getUserFacingTransactionErrorMessage(
				new Error("wallet not found in this browser"),
				"XLM",
			),
		).toBe("Connect the wallet again and retry the transaction.");
	});
});
