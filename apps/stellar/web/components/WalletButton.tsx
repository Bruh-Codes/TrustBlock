"use client";

import { useMemo, useState } from "react";
import {
	ChevronRight,
	LoaderCircle,
	LogOut,
	RefreshCcw,
	Wallet,
} from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { shortenAddress } from "@/lib/stellar";

export function WalletButton() {
	const [open, setOpen] = useState(false);
	const {
		address,
		connect,
		disconnect,
		error,
		refresh,
		selectedWalletId,
		selectedWalletName,
		status,
		wallets,
	} = useWallet();

	const availableWallets = useMemo(
		() => wallets.filter((wallet) => wallet.isAvailable),
		[wallets],
	);

	const buttonLabel =
		address && selectedWalletName
			? `${selectedWalletName} ${shortenAddress(address)}`
			: address
				? shortenAddress(address)
				: availableWallets.length > 0
					? "Connect Wallet"
					: "Install Wallet";

	return (
		<>
			<Button
				variant={address ? "outline" : "default"}
				size="default"
				className="h-10 px-4.5 text-sm font-semibold"
				onClick={() => setOpen(true)}
				title={error ?? "Connect a Stellar wallet"}
			>
				{status === "checking" || status === "connecting" ? (
					<LoaderCircle className="animate-spin" data-icon="inline-start" />
				) : status === "connected" ? (
					<RefreshCcw data-icon="inline-start" />
				) : (
					<Wallet data-icon="inline-start" />
				)}
				{status === "checking"
					? "Checking wallet"
					: status === "connecting"
						? "Connecting wallet"
						: buttonLabel}
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-md overflow-hidden border-border/70 bg-[rgba(8,12,8,0.96)] p-0 text-foreground">
					<div className="max-h-[85vh] overflow-y-auto p-5">
						<DialogHeader>
							<DialogTitle>Stellar wallets</DialogTitle>
							<DialogDescription>
								Connect with Freighter or any supported Stellar wallet without
								changing the existing TrustBlock flow.
							</DialogDescription>
						</DialogHeader>

						<div className="mt-5 space-y-2.5">
							{wallets.map((wallet) => {
								const isSelected = wallet.id === selectedWalletId;
								return (
									<button
										key={wallet.id}
										type="button"
										onClick={() => {
											if (wallet.isAvailable) {
												void connect(wallet.id);
												setOpen(false);
												return;
											}
											if (typeof window !== "undefined") {
												window.open(
													wallet.url,
													"_blank",
													"noopener,noreferrer",
												);
											}
										}}
										className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-left transition hover:bg-background/55"
									>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-foreground">
												{wallet.name}
											</p>
											<p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
												{wallet.isAvailable
													? isSelected
														? "Selected"
														: "Available"
													: "Install required"}
											</p>
										</div>
										<ChevronRight className="size-4 text-muted-foreground" />
									</button>
								);
							})}
						</div>

						{error ? (
							<div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
								{error}
							</div>
						) : null}

						{address ? (
							<div className="mt-4 rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
								<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									Connected account
								</p>
								<p className="mt-2 text-sm font-semibold text-foreground">
									{selectedWalletName ?? "Wallet"} | {shortenAddress(address)}
								</p>
							</div>
						) : null}

						<div className="mt-5 flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => void refresh()}
							>
								Refresh
							</Button>
							{address ? (
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => {
										void disconnect();
										setOpen(false);
									}}
								>
									<LogOut data-icon="inline-start" />
									Disconnect
								</Button>
							) : null}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
