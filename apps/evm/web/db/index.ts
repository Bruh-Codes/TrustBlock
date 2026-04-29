import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error(
		"DATABASE_URL is not configured. Set it before using the server-side workroom database helpers.",
	);
}

const createDatabase = (sqlClient: ReturnType<typeof postgres>) =>
	drizzle(sqlClient, {
		schema,
	});

type Database = ReturnType<typeof createDatabase>;

declare global {
	var __trustblockSql: ReturnType<typeof postgres> | undefined;
	var __trustblockDb: Database | undefined;
}

const sql =
	globalThis.__trustblockSql ??
	postgres(connectionString, {
		prepare: false,
		max: 1,
	});

if (process.env.NODE_ENV !== "production") {
	globalThis.__trustblockSql = sql;
}

export const db =
	globalThis.__trustblockDb ??
	createDatabase(sql);

if (process.env.NODE_ENV !== "production") {
	globalThis.__trustblockDb = db;
}

export { schema };
