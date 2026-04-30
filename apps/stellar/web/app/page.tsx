"use client";

import { Suspense, useMemo, useTransition } from "react";
import { Bell, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateEscrow } from "@/components/CreateEscrow";
import { EscrowDetailView } from "@/components/EscrowDetailView";
import { Overview } from "@/components/Overview";
import { AppSidebar } from "@/components/Sidebar";
import { MobileSidebarToggle } from "@/components/SidebarToggle";
import { TrustBlockLogoMark } from "@/components/TrustBlockLogo";
import { Transactions } from "@/components/Transactions";
import { WalletButton } from "@/components/WalletButton";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export type ViewState = "overview" | "create" | "transactions" | "escrow";

function resolveViewState(value: string | null): ViewState {
	switch (value) {
		case "create":
			return "create";
		case "transactions":
			return "transactions";
		case "escrow":
			return "escrow";
		case "overview":
		default:
			return "overview";
	}
}

const titles: Record<ViewState, { title: string; subtitle: string }> = {
	overview: {
		title: "Overview",
		subtitle: "Monitor contract value, milestones, and releases.",
	},
	create: {
		title: "New escrow",
		subtitle: "Prepare counterparties, funding terms, and milestones.",
	},
	transactions: {
		title: "Ledger",
		subtitle: "Review release history and contract status.",
	},
	escrow: {
		title: "Escrow",
		subtitle: "Track milestones, approvals, refunds, and live escrow progress.",
	},
};

function PageContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();
	const currentView = useMemo(
		() => resolveViewState(searchParams.get("view")),
		[searchParams],
	);
	const currentEscrowId = searchParams.get("escrow");
	const current = titles[currentView];

	const setCurrentView = (view: ViewState) => {
		const nextParams = new URLSearchParams(searchParams.toString());
		nextParams.set("view", view);
		if (view !== "transactions" && view !== "escrow") {
			nextParams.delete("escrow");
		}

		startTransition(() => {
			router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
		});
	};

	const openEscrowView = (escrowId: string) => {
		const nextParams = new URLSearchParams(searchParams.toString());
		nextParams.set("view", "escrow");
		nextParams.set("escrow", escrowId);

		startTransition(() => {
			router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
		});
	};

	return (
		<SidebarProvider>
			<div className="app-shell min-h-screen w-full">
				<div className="pointer-events-none fixed inset-0 overflow-hidden">
					<div className="app-ambient-1 absolute left-[-10%] top-[-8rem] h-80 w-80 rounded-full blur-3xl" />
					<div className="app-ambient-2 absolute right-[-5%] top-[20%] h-96 w-96 rounded-full blur-3xl" />
					<div className="app-ambient-3 absolute bottom-[-10%] left-[25%] h-72 w-72 rounded-full blur-3xl" />
					<div className="bg-noise absolute inset-0" />
				</div>

				<div className="relative flex min-h-screen w-full overflow-visible">
					<AppSidebar
						currentView={
							currentView === "escrow" ? "transactions" : currentView
						}
						setCurrentView={setCurrentView}
					/>
					<SidebarInset className="bg-transparent shadow-none">
						<MobileSidebarToggle />
						<main className="flex-1 px-4 pb-6 pt-5 sm:px-5">
							<section className="mx-auto mb-8 max-w-6xl pt-3 sm:mb-10 sm:pt-4">
								<div className="flex flex-wrap items-start justify-between gap-5">
									<div className="min-w-0">
										<div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
											<TrustBlockLogoMark className="h-4 w-4" />
											TrustBlock
										</div>
										<h1 className="text-[1.85rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.35rem]">
											{current.title}
										</h1>
										<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
											{current.subtitle}
										</p>
									</div>

									<div className="flex items-center gap-2">
										<WalletButton />
										<Button
											size="default"
											className="h-10 px-4.5 text-sm font-semibold"
											onClick={() => setCurrentView("create")}
										>
											<Plus data-icon="inline-start" />
											New Escrow
										</Button>
										<Button
											variant="outline"
											size="icon-lg"
											className="h-10 w-10"
											aria-label="Notifications"
										>
											<Bell />
										</Button>
									</div>
								</div>
							</section>
							{currentView === "overview" && (
								<Overview
									onNavigate={setCurrentView}
									onOpenEscrow={openEscrowView}
								/>
							)}
							{currentView === "create" && (
								<CreateEscrow onNavigate={setCurrentView} />
							)}
							{currentView === "transactions" && (
								<Transactions onNavigate={setCurrentView} />
							)}
							{currentView === "escrow" && (
								<EscrowDetailView
									escrowId={currentEscrowId}
									onNavigate={setCurrentView}
								/>
							)}
						</main>
					</SidebarInset>
				</div>
			</div>
		</SidebarProvider>
	);
}

export default function Page() {
	return (
		<Suspense fallback={null}>
			<PageContent />
		</Suspense>
	);
}
