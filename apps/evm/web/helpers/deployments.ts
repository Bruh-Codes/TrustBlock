import escrowArtifact from "./Escrow.json";
import escrowReaderArtifact from "./EscrowReader.json";
import generatedDeployments from "./deployments.generated.json";

type DeploymentKey = "arbitrum" | "arbitrumSepolia";

type DeploymentConfig = {
	deploymentId: string;
	chainId: number;
	escrowAddress: string;
	escrowReaderAddress: string;
	tokenAddress: string;
	tokenSymbol: string;
	tokenDecimals: number;
};

const defaultDeployments: Record<DeploymentKey, DeploymentConfig> = {
	arbitrum: {
		deploymentId: "",
		chainId: 42161,
		escrowAddress: "",
		escrowReaderAddress: "",
		tokenAddress: "",
		tokenSymbol: "USDC",
		tokenDecimals: 6,
	},
	arbitrumSepolia: {
		deploymentId: "",
		chainId: 421614,
		escrowAddress: "",
		escrowReaderAddress: "",
		tokenAddress: "",
		tokenSymbol: "USDC",
		tokenDecimals: 6,
	},
};

function resolveDeploymentKey(value: string | undefined): DeploymentKey {
	switch (value?.trim().toLowerCase()) {
		case "mainnet":
		case "arb":
		case "arbmain":
		case "arbitrum":
			return "arbitrum";
		case "testnet":
		case "sepolia":
		case "arbsepolia":
		case "arbitrumsepolia":
		default:
			return "arbitrumSepolia";
	}
}

export const selectedDeploymentKey = resolveDeploymentKey(
	process.env.NEXT_PUBLIC_ESCROW_DEPLOYMENT,
);

export const deployments = {
	...defaultDeployments,
	...generatedDeployments,
} as const satisfies Record<DeploymentKey, DeploymentConfig>;

export const deployment = deployments[selectedDeploymentKey];

export const contractAddresses = {
	escrow: deployment.escrowAddress,
	escrowReader: deployment.escrowReaderAddress,
	token: deployment.tokenAddress,
} as const;

export const escrowAbi = escrowArtifact;
export const escrowReaderAbi = escrowReaderArtifact;
