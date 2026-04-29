import {
	type AppKitNetwork,
	arbitrum,
	arbitrumSepolia,
} from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createConfig, http } from "wagmi";
import {
	arbitrum as wagmiArbitrum,
	arbitrumSepolia as wagmiArbitrumSepolia,
} from "wagmi/chains";
import { deployment } from "@/helpers/deployments";

const walletNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
	arbitrum,
	arbitrumSepolia,
];

const defaultWalletNetwork =
	Number(deployment.chainId) === arbitrum.id ? arbitrum : arbitrumSepolia;

export const reownProjectId =
	process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() ?? "";

export const walletConfigured = reownProjectId.length > 0;

const walletMetadata = {
	name: "TrustBlock",
	description:
		"Milestone escrow interface for secure contract payments on Arbitrum.",
	url: "https://trustblock.app",
	icons: ["https://trustblock.app/favicon.ico"],
};

export const walletAdapter = walletConfigured
	? new WagmiAdapter({
			projectId: reownProjectId,
			networks: walletNetworks,
		})
	: null;

const fallbackWagmiConfig = createConfig({
	chains: [wagmiArbitrum, wagmiArbitrumSepolia],
	transports: {
		[wagmiArbitrum.id]: http(),
		[wagmiArbitrumSepolia.id]: http(),
	},
	ssr: true,
});

export const walletWagmiConfig = walletAdapter?.wagmiConfig ?? fallbackWagmiConfig;

export const walletConfig = walletAdapter
	? {
			projectId: reownProjectId,
			metadata: walletMetadata,
			networks: walletNetworks,
			defaultNetwork: defaultWalletNetwork,
			themeMode: "dark" as const,
			adapters: [walletAdapter],
		}
	: null;
