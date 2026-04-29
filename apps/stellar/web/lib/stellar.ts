import { signTransaction } from "@stellar/freighter-api";
import {
	Asset,
	BASE_FEE,
	Horizon,
	Memo,
	Networks,
	Operation,
	TransactionBuilder,
} from "@stellar/stellar-sdk";

const NETWORKS = {
	FUTURENET: {
		explorerBase: "https://stellar.expert/explorer/testnet",
		friendbot: "https://friendbot-futurenet.stellar.org",
		horizon: "https://horizon-futurenet.stellar.org",
		passphrase: "Test SDF Future Network ; October 2022",
		rpc: "https://rpc-futurenet.stellar.org",
	},
	PUBLIC: {
		explorerBase: "https://stellar.expert/explorer/public",
		friendbot: null,
		horizon: "https://horizon.stellar.org",
		passphrase: Networks.PUBLIC,
		rpc: "https://mainnet.sorobanrpc.com",
	},
	TESTNET: {
		explorerBase: "https://stellar.expert/explorer/testnet",
		friendbot: "https://friendbot.stellar.org",
		horizon: "https://horizon-testnet.stellar.org",
		passphrase: Networks.TESTNET,
		rpc: "https://soroban-testnet.stellar.org",
	},
} as const;

type WalletNetwork = keyof typeof NETWORKS;

function parseWalletNetwork(
	network?: string | null,
	networkPassphrase?: string | null,
): WalletNetwork | null {
	if (network === "TESTNET" || network === "PUBLIC" || network === "FUTURENET") {
		return network;
	}

	for (const [candidate, config] of Object.entries(NETWORKS)) {
		if (config.passphrase === networkPassphrase) {
			return candidate as WalletNetwork;
		}
	}

	return null;
}

function getNetworkConfig(
	network?: string | null,
	networkPassphrase?: string | null,
) {
	const parsed = parseWalletNetwork(network, networkPassphrase) ?? "TESTNET";
	return NETWORKS[parsed];
}

export async function buildPaymentTransactionXdr({
	amount,
	destination,
	memo,
	networkPassphrase,
	source,
}: {
	amount: string;
	destination: string;
	memo?: string;
	networkPassphrase: string;
	source: string;
}) {
	if (!source.startsWith("G")) {
		throw new Error("Source address must be a Stellar public key.");
	}
	if (!destination.startsWith("G")) {
		throw new Error("Destination must be a Stellar public key.");
	}
	if (Number(amount) <= 0) {
		throw new Error("Amount must be greater than zero.");
	}

	const network = getNetworkConfig(null, networkPassphrase);
	const server = new Horizon.Server(network.horizon);
	const sourceAccount = await server.loadAccount(source);
	const builder = new TransactionBuilder(sourceAccount, {
		fee: BASE_FEE,
		networkPassphrase,
	})
		.addOperation(
			Operation.payment({
				amount,
				asset: Asset.native(),
				destination,
			}),
		)
		.setTimeout(300);

	if (memo?.trim()) {
		builder.addMemo(Memo.text(memo.trim().slice(0, 28)));
	}

	return builder.build().toXDR();
}

export async function signAndSubmitTransaction({
	network,
	networkPassphrase,
	source,
	xdr,
}: {
	network?: string | null;
	networkPassphrase: string;
	source: string;
	xdr: string;
}) {
	const signed = await signTransaction(xdr, {
		address: source,
		networkPassphrase,
	});

	if ("error" in signed && signed.error) {
		throw new Error(String(signed.error));
	}
	if (!("signedTxXdr" in signed) || !signed.signedTxXdr) {
		throw new Error("Freighter did not return a signed transaction.");
	}

	const networkConfig = getNetworkConfig(network, networkPassphrase);
	const server = new Horizon.Server(networkConfig.horizon);
	const transaction = TransactionBuilder.fromXDR(
		signed.signedTxXdr,
		networkPassphrase,
	);
	const response = await server.submitTransaction(transaction);

	return {
		hash: response.hash,
	};
}

export function isSupportedWalletNetwork(
	network?: string | null,
	networkPassphrase?: string | null,
) {
	return Boolean(parseWalletNetwork(network, networkPassphrase));
}

export function getHorizonUrl(
	network?: string | null,
	networkPassphrase?: string | null,
) {
	return getNetworkConfig(network, networkPassphrase).horizon;
}

export function getRpcUrl(network?: string | null, networkPassphrase?: string | null) {
	return getNetworkConfig(network, networkPassphrase).rpc;
}

export function getFriendbotUrl(address: string, network?: string | null) {
	const config = getNetworkConfig(network, null);
	if (!config.friendbot) {
		return "";
	}

	return `${config.friendbot}?addr=${encodeURIComponent(address)}`;
}

export function getExplorerUrl(hash: string, network?: string | null) {
	const config = getNetworkConfig(network, null);
	return `${config.explorerBase}/tx/${hash}`;
}

export function shortenAddress(address: string) {
	if (address.length < 12) {
		return address;
	}
	return `${address.slice(0, 6)}...${address.slice(-6)}`;
}
