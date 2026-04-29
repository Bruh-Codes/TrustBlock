import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const attachmentsBucketName =
	process.env.NEXT_PUBLIC_SUPABASE_ATTACHMENTS_BUCKET ??
	"trustblock-attachments";

export const isSupabaseBrowserConfigured = Boolean(
	supabaseUrl && supabasePublishableKey,
);

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
	if (!isSupabaseBrowserConfigured) {
		return null;
	}

	if (!cachedClient) {
		cachedClient = createClient(supabaseUrl!, supabasePublishableKey!, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		});
	}

	return cachedClient;
}

export function getSupabaseBrowserConfigError() {
	if (isSupabaseBrowserConfigured) {
		return null;
	}

	return "Supabase browser env is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, then restart the dev server.";
}
