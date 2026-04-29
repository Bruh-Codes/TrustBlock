"use client";

import type { ReactNode } from "react";
import {
	createContext,
	startTransition,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import {
	KitEventType,
	Networks,
	type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit/types";

type WalletStatus =
	| "idle"
	| "checking"
	| "connecting"
	| "connected"
	| "error";

type WalletOption = Pick<
	ISupportedWallet,
	"id" | "icon" | "isAvailable" | "name" | "url"
>;

type WalletContextValue = {
	address: string | null;
	error: string | null;
	network: string | null;
	networkPassphrase: string | null;
	selectedWalletId: string | null;
	selectedWalletName: string | null;
	status: WalletStatus;
	wallets: WalletOption[];
	connect: (walletId?: string) => Promise<void>;
	disconnect: () => Promise<void>;
	refresh: () => Promise<void>;
	reset: () => void;
	signTransaction: (
		xdr: string,
		opts?: {
			address?: string;
			networkPassphrase?: string;
			path?: string;
		},
	) => Promise<{
		signedTxXdr: string;
		signerAddress?: string;
	}>;
};

const SELECTED_WALLET_KEY = "trustblock:selected-stellar-wallet";
const DEFAULT_NETWORK = {
	name: "TESTNET",
	passphrase: Networks.TESTNET,
};

const WalletContext = createContext<WalletContextValue | null>(null);

function normalizeWalletError(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: typeof error === "object" && error !== null && "message" in error
				? String(error.message)
				: "Unable to connect to a Stellar wallet.";
	const lowered = message.toLowerCase();

	if (
		lowered.includes("rejected") ||
		lowered.includes("denied") ||
		lowered.includes("cancelled") ||
		lowered.includes("canceled")
	) {
		return "The wallet request was cancelled.";
	}

	if (
		lowered.includes("not detected") ||
		lowered.includes("not found") ||
		lowered.includes("not installed") ||
		lowered.includes("no wallet selected")
	) {
		return "No supported Stellar wallet was detected. Install or open one of the listed wallets first.";
	}

	if (lowered.includes("insufficient")) {
		return "The connected wallet does not have enough funds to complete this transaction.";
	}

	return message;
}

function readStoredWalletId() {
	if (typeof window === "undefined") {
		return null;
	}
	return window.localStorage.getItem(SELECTED_WALLET_KEY);
}

function persistWalletId(walletId: string | null) {
	if (typeof window === "undefined") {
		return;
	}
	if (walletId) {
		window.localStorage.setItem(SELECTED_WALLET_KEY, walletId);
		return;
	}
	window.localStorage.removeItem(SELECTED_WALLET_KEY);
}

export function WalletProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());
	const [status, setStatus] = useState<WalletStatus>("checking");
	const [address, setAddress] = useState<string | null>(null);
	const [network, setNetwork] = useState<string | null>(null);
	const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null);
	const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
	const [wallets, setWallets] = useState<WalletOption[]>([]);
	const [error, setError] = useState<string | null>(null);
	const kitInitialized = useRef(false);

	const selectedWalletName = useMemo(
		() => wallets.find((wallet) => wallet.id === selectedWalletId)?.name ?? null,
		[selectedWalletId, wallets],
	);

	const ensureKit = async () => {
		if (kitInitialized.current) {
			return;
		}

		StellarWalletsKit.init({
			modules: defaultModules(),
			network: Networks.TESTNET,
			selectedWalletId: readStoredWalletId() ?? undefined,
			authModal: {
				hideUnsupportedWallets: false,
				showInstallLabel: true,
			},
		});
		kitInitialized.current = true;
	};

	const syncWallet = async () => {
		setStatus("checking");
		setError(null);

		try {
			await ensureKit();
			const supportedWallets = await StellarWalletsKit.refreshSupportedWallets();
			const storedWalletId = readStoredWalletId();
			const chosenWalletId =
				storedWalletId && supportedWallets.some((wallet) => wallet.id === storedWalletId)
					? storedWalletId
					: null;

			if (chosenWalletId) {
				StellarWalletsKit.setWallet(chosenWalletId);
			}

			let nextAddress: string | null = null;
			let nextNetwork: string = DEFAULT_NETWORK.name;
			let nextNetworkPassphrase: string = DEFAULT_NETWORK.passphrase;
			let nextStatus: WalletStatus = chosenWalletId ? "idle" : "idle";

			if (chosenWalletId) {
				const networkResult = await StellarWalletsKit.getNetwork().catch(() => ({
					network: DEFAULT_NETWORK.name,
					networkPassphrase: DEFAULT_NETWORK.passphrase,
				}));
				nextNetwork = networkResult.network;
				nextNetworkPassphrase = networkResult.networkPassphrase;

				const addressResult = await StellarWalletsKit.getAddress().catch(() => null);
				nextAddress = addressResult?.address ?? null;
				nextStatus = nextAddress ? "connected" : "idle";
			}

			startTransition(() => {
				setWallets(supportedWallets);
				setSelectedWalletId(chosenWalletId);
				setAddress(nextAddress);
				setNetwork(nextNetwork);
				setNetworkPassphrase(nextNetworkPassphrase);
				setStatus(nextStatus);
			});
		} catch (syncError) {
			startTransition(() => {
				setError(normalizeWalletError(syncError));
				setStatus("error");
			});
		}
	};

	useEffect(() => {
		void syncWallet();
	}, []);

	useEffect(() => {
		if (!kitInitialized.current) {
			return;
		}

		const removeWalletSelected = StellarWalletsKit.on(
			KitEventType.WALLET_SELECTED,
			(event) => {
				const nextWalletId = event.payload.id ?? null;
				persistWalletId(nextWalletId);
				startTransition(() => {
					setSelectedWalletId(nextWalletId);
				});
			},
		);

		const removeStateUpdated = StellarWalletsKit.on(
			KitEventType.STATE_UPDATED,
			(event) => {
				startTransition(() => {
					setAddress(event.payload.address ?? null);
					setNetworkPassphrase(event.payload.networkPassphrase);
					setStatus(event.payload.address ? "connected" : "idle");
				});
			},
		);

		const removeDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
			persistWalletId(null);
			startTransition(() => {
				setAddress(null);
				setSelectedWalletId(null);
				setStatus("idle");
			});
		});

		return () => {
			removeWalletSelected();
			removeStateUpdated();
			removeDisconnect();
		};
	}, [status]);

	const connect = async (walletId?: string) => {
		setError(null);
		setStatus("connecting");

		try {
			await ensureKit();
			const supportedWallets =
				wallets.length > 0 ? wallets : await StellarWalletsKit.refreshSupportedWallets();
			const nextWalletId =
				walletId ??
				selectedWalletId ??
				supportedWallets.find((wallet) => wallet.isAvailable)?.id ??
				null;

			if (!nextWalletId) {
				throw new Error("No supported Stellar wallet was detected.");
			}

			StellarWalletsKit.setWallet(nextWalletId);
			persistWalletId(nextWalletId);

			const [{ address: nextAddress }, nextNetwork] = await Promise.all([
				StellarWalletsKit.fetchAddress(),
				StellarWalletsKit.getNetwork().catch(() => ({
					network: DEFAULT_NETWORK.name,
					networkPassphrase: DEFAULT_NETWORK.passphrase,
				})),
			]);

			startTransition(() => {
				setSelectedWalletId(nextWalletId);
				setAddress(nextAddress);
				setNetwork(nextNetwork.network);
				setNetworkPassphrase(nextNetwork.networkPassphrase);
				setStatus("connected");
			});

			await syncWallet();
		} catch (connectError) {
			startTransition(() => {
				setError(normalizeWalletError(connectError));
				setStatus("error");
			});
		}
	};

	const disconnect = async () => {
		await ensureKit();
		await StellarWalletsKit.disconnect();
		persistWalletId(null);
		startTransition(() => {
			setAddress(null);
			setSelectedWalletId(null);
			setStatus("idle");
			setError(null);
		});
	};

	const reset = () => {
		persistWalletId(null);
		setAddress(null);
		setSelectedWalletId(null);
		setNetwork(DEFAULT_NETWORK.name);
		setNetworkPassphrase(DEFAULT_NETWORK.passphrase);
		setError(null);
		setStatus("idle");
	};

	return (
		<QueryClientProvider client={queryClient}>
			<WalletContext.Provider
				value={{
					address,
					error,
					network,
					networkPassphrase,
					selectedWalletId,
					selectedWalletName,
					status,
					wallets,
					connect,
					disconnect,
					refresh: syncWallet,
					reset,
					signTransaction: StellarWalletsKit.signTransaction,
				}}
			>
				{children}
			</WalletContext.Provider>
		</QueryClientProvider>
	);
}

export function useWallet() {
	const value = useContext(WalletContext);
	if (!value) {
		throw new Error("useWallet must be used inside WalletProvider");
	}
	return value;
}
