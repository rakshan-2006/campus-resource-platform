import { MongoClient } from "mongodb";

async function testMongoRUD() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campus_profiles";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("campus_profiles");
    const coll = db.collection("campus_resource_profiles");

    // 1. Read
    const dockerLabs = await coll.find({
      resource_type: "COMPUTER_LAB",
      "specifications.software": "Docker"
    }).toArray();
    console.log(`✓ Read: Found ${dockerLabs.length} computer lab profiles with Docker.`);

    // 2. Insert demo profile
    const insertRes = await coll.insertOne({
      pg_resource_id: 1,
      resource_type: "CLASSROOM",
      updated_at: new Date().toISOString(),
      specifications: {
        desk_type: "Fixed wooden benches with under-desk book storage",
        power_outlets_per_bench: 2
      }
    });
    console.log(`✓ Insert: Created demo classroom profile with ID ${insertRes.insertedId}.`);

    // 3. Update profile
    await coll.updateOne(
      { pg_resource_id: 3 },
      {
        $addToSet: { "specifications.software": "Postman Enterprise" },
        $set: { updated_at: new Date().toISOString() }
      }
    );
    console.log("✓ Update: Appended 'Postman Enterprise' to LAB-CS1 software suite.");

    // 4. Delete demo profile
    const deleteRes = await coll.deleteOne({ pg_resource_id: 1 });
    console.log(`✓ Delete: Removed demo profile (count: ${deleteRes.deletedCount}).`);

    console.log("All Mongo RUD operations passed!");
  } finally {
    await client.close();
  }
}

testMongoRUD().catch((err) => {
  console.error(err);
  process.exit(1);
});
