// db/mongo-init.js
// MongoDB 7+ collection creation, JSON Schema validation and indexes
// Clean, re-runnable script

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campus_profiles";
const dbName = process.env.MONGODB_DB_NAME || "campus_profiles";

async function initMongo() {
  const client = new MongoClient(uri);

  try {
    console.log(`Connecting to MongoDB at ${uri}...`);
    await client.connect();
    console.log("Connected to MongoDB.");

    const db = client.db(dbName);
    const collectionName = "campus_resource_profiles";

    // JSON Schema validator definition
    const jsonSchemaValidator = {
      $jsonSchema: {
        bsonType: "object",
        required: ["pg_resource_id", "resource_type", "updated_at", "specifications"],
        properties: {
          pg_resource_id: {
            bsonType: "int",
            description: "Foreign key reference to PostgreSQL resource.id - must be an integer"
          },
          resource_type: {
            bsonType: "string",
            description: "Resource type identifier (e.g. COMPUTER_LAB, AUDITORIUM) - must be a string"
          },
          updated_at: {
            bsonType: ["date", "string"],
            description: "Last modified timestamp - date or ISO string"
          },
          specifications: {
            bsonType: "object",
            description: "Dynamic variable specifications tailored to resource profile",
            additionalProperties: true
          }
        }
      }
    };

    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();

    if (collections.length === 0) {
      console.log(`Creating collection '${collectionName}' with JSON schema validation...`);
      await db.createCollection(collectionName, {
        validator: jsonSchemaValidator,
        validationLevel: "strict",
        validationAction: "error"
      });
    } else {
      console.log(`Collection '${collectionName}' exists. Updating schema validator...`);
      await db.command({
        collMod: collectionName,
        validator: jsonSchemaValidator,
        validationLevel: "strict",
        validationAction: "error"
      });
    }

    const coll = db.collection(collectionName);

    // Indexes
    console.log("Ensuring indexes on 'campus_resource_profiles'...");
    // 1. Unique index on pg_resource_id (ensures strict 1:1 cross-store relationship)
    await coll.createIndex({ pg_resource_id: 1 }, { unique: true, name: "idx_pg_resource_id_unique" });
    // 2. Index on resource_type for profile filtering
    await coll.createIndex({ resource_type: 1 }, { name: "idx_resource_type" });
    // 3. Multikey index on software array in specifications
    await coll.createIndex({ "specifications.software": 1 }, { name: "idx_specifications_software" });

    console.log("✓ MongoDB collection schema validation and indexes configured successfully.");
  } catch (error) {
    console.error("MongoDB init error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initMongo();
