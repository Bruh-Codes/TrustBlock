"use client";

const STORAGE_PREFIX = "trustblock-stellar-escrows";

function getStorageKey(address: string) {
	return `${STORAGE_PREFIX}:${address}`;
}

export function loadStoredEscrowIds(address: string) {
	if (typeof window === "undefined") {
		return [] as bigint[];
	}

	const raw = window.localStorage.getItem(getStorageKey(address));
	if (!raw) {
		return [] as bigint[];
	}

	try {
		const parsed = JSON.parse(raw) as string[];
		return parsed.map((value) => BigInt(value));
	} catch {
		return [] as bigint[];
	}
}

export function storeEscrowId(address: string, escrowId: bigint) {
	if (typeof window === "undefined") {
		return;
	}

	const ids = new Set(loadStoredEscrowIds(address).map((value) => value.toString()));
	ids.add(escrowId.toString());
	window.localStorage.setItem(
		getStorageKey(address),
		JSON.stringify(Array.from(ids.values())),
	);
}
