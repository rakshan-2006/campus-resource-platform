// src/lib/mongo.ts
// MongoDB 7+ Official Driver Integration, Connection Caching, Typed Profiles & Error Wrappers

import { MongoClient, Db, Collection, Document } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campus_profiles";
const dbName = process.env.MONGODB_DB_NAME || "campus_profiles";

export interface ResourceProfileDocument extends Document {
  _id?: any;
  pg_resource_id: number;
  resource_type: string;
  updated_at: string;
  specifications: Record<string, any>;
}

// Global cached client across hot reloads in development
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  });

  cachedClient = await client.connect();
  return cachedClient;
}

export async function getMongoDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }
  const client = await getMongoClient();
  cachedDb = client.db(dbName);
  return cachedDb;
}

export async function getProfilesCollection(): Promise<Collection<ResourceProfileDocument>> {
  const db = await getMongoDb();
  return db.collection<ResourceProfileDocument>("campus_resource_profiles");
}

/**
 * Fetch a resource's extended specifications profile by its PostgreSQL ID.
 * Returns null if not recorded (graceful fallback).
 */
export async function getResourceProfile(
  pgResourceId: number
): Promise<ResourceProfileDocument | null> {
  try {
    const coll = await getProfilesCollection();
    const doc = await coll.findOne({ pg_resource_id: pgResourceId });
    return doc;
  } catch (error) {
    console.error(`Failed to fetch Mongo profile for pg_resource_id ${pgResourceId}:`, error);
    // Graceful fallback: return null so PostgreSQL core operational flow is never blocked
    return null;
  }
}

/**
 * MongoDB Health Check
 */
export async function checkMongoHealth(): Promise<boolean> {
  try {
    const db = await getMongoDb();
    const ping = await db.command({ ping: 1 });
    return ping.ok === 1;
  } catch (error) {
    console.error("MongoDB health check failed:", error);
    return false;
  }
}
