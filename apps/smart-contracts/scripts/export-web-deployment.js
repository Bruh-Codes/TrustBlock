import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const deploymentsRoot = path.join(cwd, "ignition", "deployments");
const webHelpersDir = path.join(cwd, "..", "web", "helpers");
const outputFile = path.join(webHelpersDir, "deployments.generated.json");

function readArg(flag) {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function inferLatestDeploymentId() {
	if (!fs.existsSync(deploymentsRoot)) {
		throw new Error("No ignition deployment folder exists yet.");
	}

	const candidates = fs
		.readdirSync(deploymentsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => ({
			name: entry.name,
			mtimeMs: fs.statSync(path.join(deploymentsRoot, entry.name)).mtimeMs,
		}))
		.sort((left, right) => right.mtimeMs - left.mtimeMs);

	if (candidates.length === 0) {
		throw new Error("No ignition deployment directories were found.");
	}

	return candidates[0].name;
}

function inferChainId(deploymentId) {
	const explicit = readArg("--chain-id");
	if (explicit) {
		return Number(explicit);
	}

	if (deploymentId.startsWith("chain-")) {
		return Number(deploymentId.replace("chain-", ""));
	}

	return 421614;
}

function inferDeploymentKey(chainId) {
	const explicit = readArg("--deployment-key");
	if (explicit) {
		return explicit;
	}

	if (chainId === 42161) {
		return "arbitrum";
	}

	if (chainId === 421614) {
		return "arbitrumSepolia";
	}

	return `chain${chainId}`;
}

function readDeployedAddresses(deploymentId) {
	const filePath = path.join(
		deploymentsRoot,
		deploymentId,
		"deployed_addresses.json",
	);

	if (!fs.existsSync(filePath)) {
		throw new Error(
			`Deployment addresses file not found for "${deploymentId}".`,
		);
	}

	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pickAddress(deployedAddresses, suffixes) {
	const entry = Object.entries(deployedAddresses).find(([key]) =>
		suffixes.some(
			(suffix) => key === suffix || key.endsWith(suffix) || key.includes(suffix),
		),
	);

	return entry?.[1] ?? "";
}

function readExistingDeployments() {
	if (!fs.existsSync(outputFile)) {
		return {};
	}

	return JSON.parse(fs.readFileSync(outputFile, "utf8"));
}

function main() {
	const deploymentId = readArg("--deployment-id") ?? inferLatestDeploymentId();
	const deployedAddresses = readDeployedAddresses(deploymentId);
	const chainId = inferChainId(deploymentId);
	const deploymentKey = inferDeploymentKey(chainId);
	const escrowAddress = pickAddress(deployedAddresses, [
		"EscrowModule#Escrow",
		"ProxyModule#TransparentUpgradeableProxy",
		"#TransparentUpgradeableProxy",
		"#proxy",
		"#EscrowProxy",
	]);
	const escrowReaderAddress = pickAddress(deployedAddresses, [
		"EscrowModule#EscrowReader",
		"#EscrowReader",
	]);
	const tokenAddress = readArg("--token-address") ?? "";
	const tokenSymbol = readArg("--token-symbol") ?? "USDC";
	const tokenDecimals = Number(readArg("--token-decimals") ?? "6");

	if (!escrowAddress || !escrowReaderAddress) {
		throw new Error(
			`Could not infer escrow addresses from deployment "${deploymentId}".`,
		);
	}

	fs.mkdirSync(webHelpersDir, { recursive: true });
	const existingDeployments = readExistingDeployments();
	const nextDeployments = {
		...existingDeployments,
		[deploymentKey]: {
			deploymentId,
			chainId,
			escrowAddress,
			escrowReaderAddress,
			tokenAddress,
			tokenSymbol,
			tokenDecimals,
		},
	};

	fs.writeFileSync(outputFile, `${JSON.stringify(nextDeployments, null, 2)}\n`);

	const escrowArtifactSourcePath = path.join(cwd, "artifacts", "contracts", "Escrow.sol", "Escrow.json");
	const escrowReaderArtifactSourcePath = path.join(cwd, "artifacts", "contracts", "EscrowReader.sol", "EscrowReader.json");
	
	const escrowArtifactDestPath = path.join(webHelpersDir, "Escrow.json");
	const escrowReaderArtifactDestPath = path.join(webHelpersDir, "EscrowReader.json");
	
	if (fs.existsSync(escrowArtifactSourcePath)) {
		fs.copyFileSync(escrowArtifactSourcePath, escrowArtifactDestPath);
	}
	if (fs.existsSync(escrowReaderArtifactSourcePath)) {
		fs.copyFileSync(escrowReaderArtifactSourcePath, escrowReaderArtifactDestPath);
	}

	console.log(
		`Updated frontend deployment registry for "${deploymentKey}" at ${outputFile}`,
	);
}

main();
