import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function runSeed() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "campus_db",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
  });

  try {
    console.log("Connecting to PostgreSQL for seed...");
    await client.connect();
    console.log("Connected successfully.");

    const seedPath = path.join(process.cwd(), "db", "seed.sql");
    console.log(`Reading seed data from ${seedPath}...`);
    const sql = fs.readFileSync(seedPath, "utf-8");

    console.log("Executing seed SQL...");
    await client.query(sql);
    console.log("✓ PostgreSQL seed completed successfully.");
  } catch (error) {
    console.error("Seed execution failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
