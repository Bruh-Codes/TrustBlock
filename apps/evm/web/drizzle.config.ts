import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
const requiresDatabaseConnection = process.argv.some((arg) =>
	["push", "migrate", "studio"].includes(arg),
);

if (requiresDatabaseConnection && !connectionString) {
	throw new Error(
		"DATABASE_URL is required for Drizzle push, migrate, and studio commands. Set it in your shell before running them.",
	);
}

export default defineConfig({
	out: "./drizzle",
	schema: "./db/schema.ts",
	dialect: "postgresql",
	...(connectionString
		? {
				dbCredentials: {
					url: connectionString,
				},
			}
		: {}),
	verbose: true,
	strict: true,
});
