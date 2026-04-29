"use client";

export type RecentTransactionState = {
	details?: string;
	errorMessage?: string;
	hash?: string;
	label: string;
	status: "fail" | "pending" | "success";
	updatedAt: string;
};

const STORAGE_KEY = "trustblock:recent-stellar-transaction";
const EVENT_NAME = "trustblock:recent-stellar-transaction";

export function loadRecentTransaction(): RecentTransactionState | null {
	if (typeof window === "undefined") {
		return null;
	}

	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as RecentTransactionState;
	} catch {
		return null;
	}
}

export function storeRecentTransaction(transaction: RecentTransactionState) {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transaction));
	window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: transaction }));
}

export function subscribeToRecentTransaction(
	callback: (transaction: RecentTransactionState | null) => void,
) {
	if (typeof window === "undefined") {
		return () => {};
	}

	const handleStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY) {
			callback(loadRecentTransaction());
		}
	};

	const handleCustomEvent = (event: Event) => {
		callback((event as CustomEvent<RecentTransactionState>).detail);
	};

	window.addEventListener("storage", handleStorage);
	window.addEventListener(EVENT_NAME, handleCustomEvent);

	return () => {
		window.removeEventListener("storage", handleStorage);
		window.removeEventListener(EVENT_NAME, handleCustomEvent);
	};
}
