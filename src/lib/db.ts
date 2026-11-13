// src/lib/db.ts
// PostgreSQL Connection Pool, Parameterized Queries, Dedicated Client Transactions & RLS Helpers

import { Pool, PoolClient, QueryResult, QueryResultRow, types } from "pg";

// Guardrail: Campus timestamps are TIMESTAMP WITHOUT TIME ZONE (OID 1114).
// Parse as raw ISO/formatted string directly without JavaScript Date zone conversion.
types.setTypeParser(1114, (val: string) => val);

// Primary Pool (Superuser/Application Owner for management & admin operations)
const primaryPool = new Pool({
  host: process.env.POSTGRES_HOST || "127.0.0.1",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB || "campus_db",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

primaryPool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

/**
 * Execute a parameterized query using the connection pool.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await primaryPool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 200) {
    console.warn(`[Slow Query] ${duration}ms: ${text}`);
  }
  return res;
}

/**
 * Acquire a dedicated client from the pool.
 * Caller MUST call client.release() in a finally block.
 */
export async function getClient(): Promise<PoolClient> {
  return await primaryPool.connect();
}

/**
 * Execute a callback within an atomic dedicated-client transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await primaryPool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction under a specific trusted user context for Row Level Security (RLS).
 * Sets transaction-local variable `app.current_user_id` inside BEGIN ... COMMIT block.
 */
export async function withUserContext<T>(
  userId: number,
  role: "ADMIN" | "FACULTY",
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await primaryPool.connect();
  try {
    await client.query("BEGIN");

    // Set transaction-local session context safely
    await client.query("SELECT fn_set_current_user_id($1)", [userId]);

    // If faculty, optionally switch session role to campus_faculty for RLS enforcement
    if (role === "FACULTY") {
      await client.query("SET LOCAL ROLE campus_faculty");
    } else {
      await client.query("SET LOCAL ROLE campus_admin");
    }

    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Database health check.
 */
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    const res = await query("SELECT 1 AS healthy");
    return res.rows.length > 0 && res.rows[0].healthy === 1;
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);
    return false;
  }
}
