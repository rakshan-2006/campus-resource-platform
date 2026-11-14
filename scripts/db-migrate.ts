import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "campus_db",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
  });

  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    console.log("Connected successfully.");

    const schemaPath = path.join(process.cwd(), "db", "schema.sql");
    console.log(`Reading schema from ${schemaPath}...`);
    const schema = fs.readFileSync(schemaPath, "utf-8");
    const upgrade = process.argv.includes("--upgrade-level-3");
    // Reuse the schema's functions and grants while leaving all rows and tables intact.
    const sql = upgrade ? [
      "BEGIN;",
      "ALTER FUNCTION fn_set_current_user_id(INT) SECURITY INVOKER;",
      ...["AVAILABILITY RULES", "ALLOCATION RULES", "CANCELLATION FUNCTION", "ACCESS RULES"].map((name) => {
        const start = schema.indexOf(`-- BEGIN ${name}`);
        const end = schema.indexOf(`-- END ${name}`);
        if (start < 0 || end <= start) throw new Error(`Missing schema section: ${name}`);
        return schema.slice(start, end);
      }),
      "COMMIT;",
    ].join("\n") : schema;

    console.log("Executing schema DDL...");
    await client.query(sql);
    console.log("✓ Schema migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
