import { Abi, parseAbi } from "viem";
import {
	deployment,
	contractAddresses,
	escrowAbi,
	escrowReaderAbi,
} from "@/helpers/deployments";

export const zeroAddress =
	"0x0000000000000000000000000000000000000000" as const;

export const escrowContractAddress =
	(contractAddresses.escrow || zeroAddress) as `0x${string}`;

export const escrowReaderContractAddress =
	(contractAddresses.escrowReader || zeroAddress) as `0x${string}`;

export const fundingTokenAddress =
	(contractAddresses.token || zeroAddress) as `0x${string}`;

export const contractsConfigured = Boolean(
	contractAddresses.escrow && contractAddresses.escrowReader,
);

export const fundingTokenConfigured = Boolean(contractAddresses.token);

export const fundingTokenSymbol = deployment.tokenSymbol;
export const fundingTokenDecimals = deployment.tokenDecimals;
export const deploymentChainId = deployment.chainId;

const fundingTokenAbi = parseAbi([
	"function allowance(address owner, address spender) view returns (uint256)",
	"function approve(address spender, uint256 amount) returns (bool)",
]);

type FundingTokenFunctionName = "allowance" | "approve";

export const getEscrowConfig = (functionName: string, args?: readonly unknown[]) => {
	return {
		abi: escrowAbi.abi as Abi,
		address: escrowContractAddress,
		chainId: deploymentChainId,
		functionName,
		...(args ? { args } : {}),
	};
};

export const getEscrowReaderConfig = (
	functionName: string,
	args?: readonly unknown[],
) => {
	return {
		abi: escrowReaderAbi.abi as Abi,
		address: escrowReaderContractAddress,
		chainId: deploymentChainId,
		functionName,
		...(args ? { args } : {}),
	};
};

export function getFundingTokenConfig(
	functionName: "allowance",
	args: readonly [`0x${string}`, `0x${string}`],
): {
	abi: typeof fundingTokenAbi;
	address: `0x${string}`;
	chainId: number;
	functionName: "allowance";
	args: readonly [`0x${string}`, `0x${string}`];
};
export function getFundingTokenConfig(
	functionName: "approve",
	args: readonly [`0x${string}`, bigint],
): {
	abi: typeof fundingTokenAbi;
	address: `0x${string}`;
	chainId: number;
	functionName: "approve";
	args: readonly [`0x${string}`, bigint];
};
export function getFundingTokenConfig(
	functionName: FundingTokenFunctionName,
	args: readonly unknown[],
) {
	return {
		abi: fundingTokenAbi,
		address: fundingTokenAddress,
		chainId: deploymentChainId,
		functionName,
		args,
	};
}
