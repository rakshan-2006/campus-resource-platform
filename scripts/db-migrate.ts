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
    const sql = fs.readFileSync(schemaPath, "utf-8");

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
