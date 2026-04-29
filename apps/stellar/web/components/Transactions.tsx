"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewState } from "@/app/page";
import { useEscrows } from "@/hooks/useEscrows";
import { getParticipantRole } from "@/lib/escrow";
import {
	loadRecentTransaction,
	subscribeToRecentTransaction,
	type RecentTransactionState,
} from "@/lib/stellar-transaction-store";

const CONTRACT_ID = "CAQGDVXYW6YHIMLXTNCINAPCZXZ37JKLACGEWXQULYJNAGB5JJBHV4NC";
const STELLAR_EXPLORER_BASE_URL = "https://stellar.expert/explorer/testnet";

export function Transactions({
	onNavigate,
}: {
	onNavigate: (view: ViewState) => void;
}) {
	const {
		escrows,
		hasEscrows,
		isLoading,
		isConnected,
		contractsConfigured,
		isOnDeploymentChain,
		address,
	} = useEscrows();
	const [recentTransaction, setRecentTransaction] =
		useState<RecentTransactionState | null>(() => loadRecentTransaction());
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const contractExplorerHref = `${STELLAR_EXPLORER_BASE_URL}/contract/${CONTRACT_ID}`;
	const networkLabel = "Stellar TESTNET";

	useEffect(() => {
		return subscribeToRecentTransaction(setRecentTransaction);
	}, []);

	const openEscrowDetail = (escrowId: string) => {
		const nextParams = new URLSearchParams(searchParams.toString());
		nextParams.set("view", "escrow");
		nextParams.set("escrow", escrowId);
		router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
	};

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-6">
			{isConnected && !isOnDeploymentChain ? (
				<div className="rounded-2xl border border-[rgba(255,209,102,0.22)] bg-[linear-gradient(180deg,rgba(255,209,102,0.12),rgba(255,209,102,0.04)),rgba(24,19,11,0.88)] px-4 py-3 text-sm text-[#fff0c9]">
					Switch the wallet to {networkLabel} to manage these escrows. The
					ledger is pinned to the deployed Soroban contract on that network.
				</div>
			) : null}

			<section className="panel-surface p-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Ledger
						</p>
						<h2 className="mt-2 text-lg font-semibold text-foreground">
							Escrows for this wallet
						</h2>
						<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
							Open any escrow to view milestones, current approvals, and the
							next actions for the connected party.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => onNavigate("create")}
							className="ui-button-secondary px-4 py-2 text-sm font-semibold"
						>
							New escrow
						</button>
						{contractExplorerHref ? (
							<a
								href={contractExplorerHref}
								target="_blank"
								rel="noreferrer"
								className="ui-button-secondary px-4 py-2 text-sm font-semibold"
							>
								<ExternalLink className="h-4 w-4" />
								Contract
							</a>
						) : null}
					</div>
				</div>

				{recentTransaction ? (
					<div className="mt-5 rounded-2xl border border-border/70 bg-background/30 px-4 py-4">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
									Last contract transaction
								</p>
								<h3 className="mt-2 text-sm font-semibold text-foreground">
									{recentTransaction.label}
								</h3>
							</div>
							<span
								className={`status-pill ${
									recentTransaction.status === "success"
										? "status-emerald"
										: recentTransaction.status === "pending"
											? "status-amber"
											: "status-rose"
								}`}
							>
								{recentTransaction.status}
							</span>
						</div>
						<p className="mt-3 text-sm text-muted-foreground">
							{recentTransaction.details ??
								recentTransaction.errorMessage ??
								"Waiting for a Stellar contract update."}
						</p>
						{recentTransaction.hash ? (
							<a
								href={`${STELLAR_EXPLORER_BASE_URL}/tx/${recentTransaction.hash}`}
								target="_blank"
								rel="noreferrer"
								className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
							>
								View transaction hash
								<ExternalLink className="h-4 w-4" />
							</a>
						) : null}
					</div>
				) : null}

				<div className="mt-5 grid gap-3.5 lg:grid-cols-2">
					{hasEscrows ? (
						escrows.map((deal) => {
							const role = getParticipantRole(deal, address);
							const roleLabel =
								role === "client"
									? "Client"
									: role === "recipient"
										? "Recipient"
										: role === "resolver"
											? "Resolver"
											: "Viewer";

							return (
								<button
									key={deal.id}
									type="button"
									onClick={() => openEscrowDetail(deal.id)}
									className="ui-selectable rounded-2xl border p-4 text-left"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<span className="ui-chip px-2.5 py-1 text-[11px]">
													{deal.category}
												</span>
												<span className="ui-chip px-2.5 py-1 text-[11px]">
													{roleLabel}
												</span>
											</div>
											<h3 className="mt-3 text-base font-semibold text-foreground">
												{deal.title}
											</h3>
											<p className="mt-2 text-sm leading-6 text-muted-foreground">
												{deal.counterparties}
											</p>
										</div>
										<span className={`status-pill ${deal.statusTone}`}>
											{deal.status}
										</span>
									</div>
									<div className="mt-4 grid gap-2.5 sm:grid-cols-3">
										<SummaryMetric label="Value" value={deal.amount} />
										<SummaryMetric label="Released" value={deal.released} />
										<SummaryMetric
											label="Milestones"
											value={`${deal.completedMilestones}/${deal.totalMilestones}`}
										/>
									</div>
									<div className="mt-4 flex items-center justify-between text-sm">
										<span className="text-muted-foreground">
											{deal.nextActionTitle}
										</span>
										<span className="font-semibold text-foreground">
											Open details
										</span>
									</div>
								</button>
							);
						})
					) : (
						<div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground lg:col-span-2">
							{!isConnected
								? "Connect a wallet to load escrow history."
								: !contractsConfigured
									? "Export the deployed contracts into the web app to load live escrow history."
									: isLoading
										? "Loading escrows..."
										: "No escrows found for this wallet yet."}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-border/70 bg-background/25 p-3">
			<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
		</div>
	);
}
