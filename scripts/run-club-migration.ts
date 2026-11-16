// scripts/run-club-migration.ts
// Runner for db/migration-club-workflow.sql and db/seed-clubs.sql

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function runClubMigration() {
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

    const migrationPath = path.join(process.cwd(), "db", "migration-club-workflow.sql");
    console.log(`Executing migration from ${migrationPath}...`);
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    await client.query(migrationSql);
    console.log("✓ Club workflow schema migration executed successfully.");

    const seedPath = path.join(process.cwd(), "db", "seed-clubs.sql");
    if (fs.existsSync(seedPath)) {
      console.log(`Executing club seeds from ${seedPath}...`);
      const seedSql = fs.readFileSync(seedPath, "utf-8");
      await client.query(seedSql);
      console.log("✓ Club demo accounts and event requests seeded successfully.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runClubMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
