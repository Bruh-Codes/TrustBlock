"use client";

export function sanitizeAmountInput(value: string) {
	return value.replace(/[^0-9.]/g, "");
}

export function parseXlmAmountToStroops(value: string) {
	const normalized = sanitizeAmountInput(value);
	if (!normalized) {
		throw new Error("Each milestone needs an XLM amount.");
	}

	const [wholePart = "0", fractionPart = ""] = normalized.split(".");
	if (fractionPart.length > 7) {
		throw new Error("XLM amounts support up to 7 decimal places.");
	}

	const whole = wholePart === "" ? "0" : wholePart;
	const fraction = fractionPart.padEnd(7, "0");
	return BigInt(`${whole}${fraction}`);
}
