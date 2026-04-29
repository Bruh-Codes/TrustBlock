import { describe, expect, it } from "vitest";
import {
	parseXlmAmountToStroops,
	sanitizeAmountInput,
} from "@/lib/stellar-amount";

describe("stellar amount helpers", () => {
	it("converts whole XLM values to stroops", () => {
		expect(parseXlmAmountToStroops("12")).toBe(120000000n);
	});

	it("converts decimal XLM values to stroops", () => {
		expect(parseXlmAmountToStroops("1.5")).toBe(15000000n);
	});

	it("rejects values with more than 7 decimal places", () => {
		expect(() => parseXlmAmountToStroops("0.12345678")).toThrow(
			"XLM amounts support up to 7 decimal places.",
		);
	});

	it("sanitizes non-numeric amount characters", () => {
		expect(sanitizeAmountInput("1,250 XLM")).toBe("1250");
	});
});
