// scripts/test-integration.ts
// End-to-end integration test exercising database features and MongoDB profile integration

import { query } from "@/lib/db";
import { getResourceProfile } from "@/lib/mongo";
import { signSessionToken, verifySessionToken } from "@/lib/auth";

async function runIntegrationTests() {
  console.log("=== RUNNING INTEGRATION & NO-SQL BOUNDARY SUITE ===\n");

  // 1. Auth JWT Lifecycle
  console.log("TEST 1: JWT Session Sign & Verify");
  const testPayload = {
    sub: "2",
    id: 2,
    email: "faculty1@campus.edu",
    name: "Dr. Grace Hopper",
    role: "FACULTY" as const,
    department_id: 1,
    department_name: "Computer Science & Engineering",
  };
  const token = await signSessionToken(testPayload);
  const decoded = await verifySessionToken(token);
  if (!decoded || decoded.id !== 2 || decoded.role !== "FACULTY") {
    throw new Error("FAILED: JWT session verification failed");
  }
  console.log("  ✓ JWT signed and verified with HS256 claims successfully.");

  // 2. MongoDB Extended Profile Read & Fallback
  console.log("\nTEST 2: MongoDB Variable Resource Profiles & Fallback");
  // Lab CS1 has an extended profile
  const labProfile = await getResourceProfile(3);
  if (!labProfile || !labProfile.specifications.software) {
    throw new Error("FAILED: Expected Mongo profile for LAB-CS1 (ID 3)");
  }
  console.log(`  ✓ LAB-CS1 profile retrieved: CPU=${labProfile.specifications.cpu}, Software count=${labProfile.specifications.software.length}`);

  // Lecture Hall 101 has NO profile in Mongo
  const lhProfile = await getResourceProfile(1);
  if (lhProfile !== null) {
    throw new Error("FAILED: LH-101 should return null profile");
  }
  console.log("  ✓ LH-101 correctly returned null profile (Graceful fallback validated).");

  // 3. Operational Views
  console.log("\nTEST 3: Operational Views (v_resource_utilization & v_peak_hours)");
  const utilRes = await query("SELECT * FROM v_resource_utilization LIMIT 3");
  console.log(`  ✓ v_resource_utilization returned ${utilRes.rows.length} rows.`);
  for (const r of utilRes.rows) {
    console.log(`    - ${r.resource_code}: Utilization=${r.utilization_percentage}% (Booked: ${r.booked_hours_last_30_days}h / Max: ${r.max_operating_hours_last_30_days}h)`);
  }

  const peakRes = await query("SELECT * FROM v_peak_hours WHERE booking_count > 0");
  console.log(`  ✓ v_peak_hours returned ${peakRes.rows.length} active time slots.`);

  console.log("\n=======================================================");
  console.log("✓ ALL INTEGRATION & CROSS-STORE TESTS PASSED CLEANLY!");
  console.log("=======================================================\n");
}

runIntegrationTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Integration test failed:", err);
    process.exit(1);
  });
