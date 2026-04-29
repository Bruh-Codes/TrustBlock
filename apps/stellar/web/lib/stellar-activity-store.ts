"use client";

export type ActivityFeedItem = {
	description: string;
	hash?: string;
	id: string;
	status: "fail" | "info" | "pending" | "success";
	timestamp: string;
	title: string;
};

const STORAGE_KEY = "trustblock:stellar-activity-feed";
const EVENT_NAME = "trustblock:stellar-activity-feed";
const MAX_ITEMS = 12;

export function loadActivityFeed() {
	if (typeof window === "undefined") {
		return [] as ActivityFeedItem[];
	}

	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return [] as ActivityFeedItem[];
	}

	try {
		return JSON.parse(raw) as ActivityFeedItem[];
	} catch {
		return [] as ActivityFeedItem[];
	}
}

export function storeActivityItem(item: ActivityFeedItem) {
	if (typeof window === "undefined") {
		return;
	}

	const current = loadActivityFeed();
	if (current.some((entry) => entry.id === item.id)) {
		return;
	}

	const next = [item, ...current].slice(0, MAX_ITEMS);
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
}

export function subscribeToActivityFeed(
	callback: (items: ActivityFeedItem[]) => void,
) {
	if (typeof window === "undefined") {
		return () => {};
	}

	const handleStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY) {
			callback(loadActivityFeed());
		}
	};

	const handleCustomEvent = (event: Event) => {
		callback((event as CustomEvent<ActivityFeedItem[]>).detail);
	};

	window.addEventListener("storage", handleStorage);
	window.addEventListener(EVENT_NAME, handleCustomEvent);

	return () => {
		window.removeEventListener("storage", handleStorage);
		window.removeEventListener(EVENT_NAME, handleCustomEvent);
	};
}
