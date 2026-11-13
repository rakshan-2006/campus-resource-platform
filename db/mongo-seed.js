// db/mongo-seed.js
// Inserts deterministic variable resource profiles referencing PostgreSQL resource IDs

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campus_profiles";
const dbName = process.env.MONGODB_DB_NAME || "campus_profiles";

async function seedMongo() {
  const client = new MongoClient(uri);

  try {
    console.log(`Connecting to MongoDB for seeding at ${uri}...`);
    await client.connect();

    const db = client.db(dbName);
    const coll = db.collection("campus_resource_profiles");

    // Clean existing profiles for deterministic seed
    console.log("Cleaning existing profiles in 'campus_resource_profiles'...");
    await coll.deleteMany({});

    const now = new Date().toISOString();

    const deterministicProfiles = [
      {
        pg_resource_id: 3, // LAB-CS1 (Alan Kay Computing Lab)
        resource_type: "COMPUTER_LAB",
        updated_at: now,
        specifications: {
          computer_count: 40,
          cpu: "Intel Core i9-14900K (24 cores)",
          ram: "64 GB DDR5 5600MHz",
          gpu: "NVIDIA GeForce RTX 4080 16GB",
          storage: "1 TB NVMe Gen4 SSD per terminal",
          os: "Ubuntu 24.04 LTS & Windows 11 Dual Boot",
          network_speed_mbps: 1000,
          software: [
            "Docker",
            "PostgreSQL 16 Client",
            "VS Code",
            "Node.js 22",
            "Python 3.12",
            "MATLAB R2024b",
            "Wireshark",
            "Git"
          ],
          lab_assistant: "Mr. Ramesh Kumar (Ext 4012)",
          ups_backup_minutes: 120
        }
      },
      {
        pg_resource_id: 4, // LAB-CS2 (Ada Lovelace Systems Lab)
        resource_type: "COMPUTER_LAB",
        updated_at: now,
        specifications: {
          computer_count: 35,
          cpu: "AMD Ryzen 9 7900X (12 cores / 24 threads)",
          ram: "32 GB DDR5 5200MHz",
          gpu: "NVIDIA GeForce RTX 4070 12GB",
          storage: "512 GB NVMe SSD",
          os: "Ubuntu 24.04 LTS (Kernel 6.8)",
          network_speed_mbps: 1000,
          software: [
            "Docker",
            "Kubernetes Minikube",
            "Go 1.23",
            "Rust 1.82",
            "GCC/G++ 13",
            "IntelliJ IDEA Ultimate",
            "Postman"
          ],
          special_equipment: "10x FPGA Development Boards (Xilinx Artix-7)"
        }
      },
      {
        pg_resource_id: 5, // SEM-HALL-A (Sir C.V. Raman Seminar Hall)
        resource_type: "SEMINAR_HALL",
        updated_at: now,
        specifications: {
          seating_type: "Tiered executive lecture chairs with integrated writing tablets",
          acoustics: "Acoustically damped fabric wall paneling, STC 48 rating",
          stage: {
            width_meters: 8.5,
            depth_meters: 4.2,
            podium: true,
            presenter_confidence_monitor: true
          },
          microphones: {
            wireless_handheld: 4,
            wireless_lapel: 2,
            podium_gooseneck: 1
          },
          video_conferencing: {
            codec: "Cisco Room Kit Pro",
            screens: "Dual 85-inch 4K Commercial Displays",
            cameras: "Dual PTZ with active speaker voice tracking"
          },
          accessibility_features: [
            "ADA-compliant wheelchair ramp to primary aisle",
            "Designated front-row companion wheelchair spaces",
            "Inductive hearing loop system installed"
          ]
        }
      },
      {
        pg_resource_id: 7, // AUD-CENTRAL (Campus Grand Auditorium)
        resource_type: "AUDITORIUM",
        updated_at: now,
        specifications: {
          seating_type: "Cushioned plush theatrical seats with staggered sightlines",
          total_tiers: 2, // Ground floor & Balcony
          stage: {
            width_meters: 16.0,
            depth_meters: 10.5,
            height_meters: 1.2,
            motorized_curtain: true,
            lighting_rig: "DMX-controlled 32-spot theatrical wash and profile array",
            green_rooms: 2
          },
          microphones: {
            wireless_handheld: 8,
            wireless_lapel: 4,
            podium_gooseneck: 2,
            boundary_stage_mics: 4
          },
          acoustics: "Custom wooden diffusion baffles, Reverberation time RT60 = 1.1s",
          power_backup: "Dedicated 250 kVA DG set automatic failover",
          accessibility_features: [
            "Dedicated elevator to balcony level",
            "Bilateral stage access ramps",
            "Tactile paving along main access path"
          ]
        }
      }
    ];

    console.log(`Inserting ${deterministicProfiles.length} deterministic profiles...`);
    const result = await coll.insertMany(deterministicProfiles);
    console.log(`✓ Inserted ${result.insertedCount} resource profiles into MongoDB.`);
  } catch (error) {
    console.error("MongoDB seed error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMongo();
