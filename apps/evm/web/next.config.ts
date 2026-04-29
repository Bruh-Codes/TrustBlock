import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	experimental: {
		externalDir: true,
	},

	turbopack: {},
	typescript: {
		ignoreBuildErrors: false,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "picsum.photos",
				port: "",
				pathname: "/**",
			},
		],
	},
	output: "standalone",
	transpilePackages: ["motion"],
	webpack: (config, { dev }) => {
		config.resolve ??= {};
		config.resolve.alias = {
			...(config.resolve.alias ?? {}),
			"@react-native-async-storage/async-storage": path.resolve(
				__dirname,
				"lib/shims/async-storage.ts",
			),
		};

		if (dev && process.env.DISABLE_HMR === "true") {
			config.watchOptions = {
				ignored: /.*/,
			};
		}

		return config;
	},
};

export default nextConfig;
