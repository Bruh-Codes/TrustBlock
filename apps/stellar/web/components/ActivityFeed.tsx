"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
	loadActivityFeed,
	subscribeToActivityFeed,
	type ActivityFeedItem,
} from "@/lib/stellar-activity-store";

const STELLAR_EXPLORER_BASE_URL = "https://stellar.expert/explorer/testnet";

function formatRelativeTime(timestamp: string) {
	const delta = Date.now() - new Date(timestamp).getTime();
	const minutes = Math.max(1, Math.floor(delta / 60_000));

	if (minutes < 60) {
		return `${minutes}m ago`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours}h ago`;
	}

	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function ActivityFeed() {
	const [items, setItems] = useState<ActivityFeedItem[]>(() =>
		loadActivityFeed(),
	);

	useEffect(() => {
		return subscribeToActivityFeed(setItems);
	}, []);

	return (
		<section className="rounded-xl border border-border/70 bg-background/25 p-4.5">
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
				Live activity
			</p>
			<h3 className="mt-2 text-lg font-semibold text-foreground">
				Recent Stellar events
			</h3>

			<div className="mt-4 space-y-3">
				{items.length > 0 ? (
					items.map((item) => (
						<div
							key={item.id}
							className="rounded-xl border border-border/70 bg-background/40 p-3.5"
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-semibold text-foreground">
										{item.title}
									</p>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										{item.description}
									</p>
								</div>
								<span
									className={`status-pill ${
										item.status === "success"
											? "status-emerald"
											: item.status === "pending"
												? "status-amber"
												: item.status === "fail"
													? "status-rose"
													: "status-cyan"
									}`}
								>
									{item.status}
								</span>
							</div>
							<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
								<span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									{formatRelativeTime(item.timestamp)}
								</span>
								{item.hash ? (
									<a
										href={`${STELLAR_EXPLORER_BASE_URL}/tx/${item.hash}`}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-2 text-xs font-semibold text-primary"
									>
										View tx
										<ExternalLink className="h-3.5 w-3.5" />
									</a>
								) : null}
							</div>
						</div>
					))
				) : (
					<div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
						Create or update an escrow to populate the live Stellar activity
						feed.
					</div>
				)}
			</div>
		</section>
	);
}
