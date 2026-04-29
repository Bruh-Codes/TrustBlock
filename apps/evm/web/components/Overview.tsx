import { ArrowRight, Landmark, ShieldCheck, Workflow } from "lucide-react";
import { ViewState } from "@/app/page";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useEscrows } from "@/hooks/useEscrows";

const iconMap = {
	landmark: Landmark,
	workflow: Workflow,
	shield: ShieldCheck,
} as const;

export function Overview({
	onNavigate,
	onOpenEscrow,
}: {
	onNavigate: (view: ViewState) => void;
	onOpenEscrow: (escrowId: string) => void;
}) {
	const {
		featuredStats,
		escrows,
		hasEscrows,
		isLoading,
		isConnected,
		contractsConfigured,
		isOnDeploymentChain,
	} = useEscrows();
	const nextAction = escrows.find((escrow) => escrow.status !== "Completed") ?? escrows[0];
	const networkLabel = "Stellar TESTNET";

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-5">
			<section className="grid gap-3.5 xl:grid-cols-3">
				{featuredStats.map((stat) => {
					const Icon = iconMap[stat.icon];
					return (
						<article
							key={stat.label}
							className="feature-panel overflow-hidden p-4.5"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="max-w-xs">
									<p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground/70">
										{stat.label}
									</p>
									<p className="mt-3 text-[1.7rem] font-semibold tracking-[-0.04em] text-foreground sm:text-[1.9rem]">
										{stat.value}
									</p>
								</div>
								<div className="flex size-9 items-center justify-center rounded-xl bg-background/60 text-primary">
									<Icon className="size-5" />
								</div>
							</div>
							<p className="mt-8 max-w-xs text-sm leading-6 text-muted-foreground">
								{stat.helper}
							</p>
						</article>
					);
				})}
				{featuredStats.length === 0 ? (
					<article className="feature-panel overflow-hidden p-4.5 xl:col-span-3">
						<p className="text-sm text-muted-foreground">
							{!isConnected
								? "Connect a wallet to load your escrow dashboard."
								: !contractsConfigured
									? "Export the deployed contracts into the web app to load live escrow data."
									: isLoading
										? "Loading escrow dashboard..."
										: "No live escrow data found yet."}
						</p>
					</article>
				) : null}
			</section>

			<section className="panel-surface p-5">
				{isConnected && !isOnDeploymentChain ? (
					<div className="mb-5 rounded-2xl border border-[rgba(255,209,102,0.22)] bg-[linear-gradient(180deg,rgba(255,209,102,0.12),rgba(255,209,102,0.04)),rgba(24,19,11,0.88)] px-4 py-3 text-sm text-[#fff0c9]">
						Switch the wallet to {networkLabel} to act on these escrows. Live data is synchronized from the deployed TrustBlock Soroban contract there.
					</div>
				) : null}
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Activity
						</p>
						<h2 className="mt-2 text-lg font-semibold text-foreground">
							Recent contracts
						</h2>
					</div>
					<ButtonLink label="New Escrow" onClick={() => onNavigate("create")} />
				</div>

				<div className="mt-5 grid gap-3.5 xl:grid-cols-[1.2fr_0.8fr]">
					<div className="rounded-xl border border-border/70 bg-background/25 p-3.5">
						<div className="space-y-1">
							{hasEscrows ? (
								escrows.map((deal, index) => (
									<button
										key={deal.id}
										type="button"
										onClick={() => onOpenEscrow(deal.id)}
										className="activity-row flex w-full items-start justify-between gap-4 rounded-xl px-3 py-3.5 text-left transition hover:bg-background/35"
									>
										<div className="flex min-w-0 gap-4">
											<div className="mt-1 flex size-6.5 items-center justify-center rounded-full bg-primary/16 text-xs font-semibold text-primary">
												{index + 1}
											</div>
											<div className="min-w-0">
												<p className="text-sm font-medium text-foreground">
													{deal.title}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													{deal.counterparties}
												</p>
												<p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
													{deal.category}
												</p>
											</div>
										</div>
										<div className="flex flex-col items-end gap-2 text-right">
											<span className={`status-pill ${deal.statusTone}`}>
												{deal.status}
											</span>
											<span className="text-sm font-medium text-foreground">
												{deal.amount}
											</span>
										</div>
									</button>
								))
							) : (
								<div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
									No escrows found for the connected wallet yet.
								</div>
							)}
						</div>
					</div>

					<div className="space-y-3.5">
						<div className="rounded-xl border border-border/70 bg-background/25 p-4.5">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Next action
							</p>
							<h3 className="mt-3 text-lg font-semibold text-foreground">
								{nextAction?.nextActionTitle ?? "Create your first escrow"}
							</h3>
							<p className="mt-3 text-sm leading-7 text-muted-foreground">
								{nextAction?.nextActionDescription ??
									"Draft and fund a milestone escrow to start tracking releases onchain."}
							</p>

							<div className="mt-5 space-y-3">
								<div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
										Pending release
									</p>
									<p className="mt-2 text-base font-semibold text-foreground">
										{nextAction?.pending ?? "0 XLM"}
									</p>
								</div>
								<div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
										Review window
									</p>
									<p className="mt-2 text-base font-semibold text-foreground">
										{nextAction?.reviewWindowLabel ?? "Not started"}
									</p>
								</div>
							</div>

							<button
								onClick={() => onNavigate("transactions")}
								className="ui-button-primary mt-5 w-full px-4 py-2.5 text-sm font-semibold"
							>
								Open Ledger
								<ArrowRight className="size-4" />
							</button>
						</div>

						<ActivityFeed />
					</div>
				</div>
			</section>
		</div>
	);
}

function ButtonLink({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className="ui-button-secondary px-4 py-2 text-sm font-semibold"
		>
			{label}
		</button>
	);
}
