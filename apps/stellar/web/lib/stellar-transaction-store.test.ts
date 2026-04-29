import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	loadRecentTransaction,
	storeRecentTransaction,
	subscribeToRecentTransaction,
	type RecentTransactionState,
} from "@/lib/stellar-transaction-store";

type Listener = (event: Event | StorageEvent) => void;

function createWindowStub() {
	const storage = new Map<string, string>();
	const listeners = new Map<string, Set<Listener>>();

	return {
		localStorage: {
			getItem(key: string) {
				return storage.get(key) ?? null;
			},
			removeItem(key: string) {
				storage.delete(key);
			},
			setItem(key: string, value: string) {
				storage.set(key, value);
			},
		},
		addEventListener(type: string, listener: Listener) {
			const current = listeners.get(type) ?? new Set<Listener>();
			current.add(listener);
			listeners.set(type, current);
		},
		removeEventListener(type: string, listener: Listener) {
			listeners.get(type)?.delete(listener);
		},
		dispatchEvent(event: Event) {
			listeners.get(event.type)?.forEach((listener) => listener(event));
			return true;
		},
	};
}

describe("recent transaction store", () => {
	beforeEach(() => {
		const windowStub = createWindowStub();
		vi.stubGlobal("window", windowStub);
		vi.stubGlobal(
			"CustomEvent",
			class CustomEvent<T> extends Event {
				detail: T;

				constructor(type: string, init?: CustomEventInit<T>) {
					super(type);
					this.detail = init?.detail as T;
				}
			},
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("stores and loads the latest transaction", () => {
		const transaction: RecentTransactionState = {
			hash: "abc123",
			label: "Soroban escrow creation",
			status: "success",
			updatedAt: "2026-04-08T00:00:00.000Z",
		};

		storeRecentTransaction(transaction);

		expect(loadRecentTransaction()).toEqual(transaction);
	});

	it("notifies subscribers when the transaction changes", () => {
		const callback = vi.fn();
		const unsubscribe = subscribeToRecentTransaction(callback);

		storeRecentTransaction({
			hash: "def456",
			label: "Soroban escrow funding",
			status: "pending",
			updatedAt: "2026-04-08T00:00:00.000Z",
		});

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback.mock.calls[0]?.[0]).toMatchObject({
			hash: "def456",
			status: "pending",
		});

		unsubscribe();
	});
});
