import { PostgrestClient } from "@supabase/postgrest-js";

function requireEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY") {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} is required to use the Supabase PostgREST client.`);
	}

	return value;
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabasePublishableKey = requireEnv(
	"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
);

const postgrestUrl = new URL("/rest/v1", supabaseUrl).toString();

export function createPostgrestClient() {
	return new PostgrestClient(postgrestUrl, {
		headers: {
			apikey: supabasePublishableKey,
			Authorization: `Bearer ${supabasePublishableKey}`,
		},
		schema: "public",
	});
}

export const supabase = createPostgrestClient();
