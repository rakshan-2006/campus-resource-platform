// scripts/test-db-features.ts
// Verification script exercising PostgreSQL functions, triggers, GiST constraints, procedures, and RLS

import { Client } from "pg";

async function runTests() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "campus_db",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
  });

  await client.connect();
  console.log("=== RUNNING POSTGRESQL ADVANCED FEATURES SUITE ===\n");

  try {
    // ------------------------------------------------------------------------
    // TEST 1: GiST Exclusion Constraint (Double Booking Prevention)
    // ------------------------------------------------------------------------
    console.log("TEST 1: GiST Exclusion Constraint on booking table");
    let exclusionCaught = false;
    try {
      // LH-101 has confirmed booking on 2026-11-20 09:00 - 11:00 (Booking 1)
      // Attempt overlapping booking: 2026-11-20 09:30 - 10:30
      await client.query(
        `INSERT INTO booking (request_id, resource_id, booked_by_user_id, start_time, end_time, status)
         VALUES (999, 1, 2, '2026-11-20 09:30:00'::TIMESTAMP, '2026-11-20 10:30:00'::TIMESTAMP, 'CONFIRMED')`
      );
    } catch (err: any) {
      if (err.code === "23P01") {
        exclusionCaught = true;
        console.log("  ✓ Correctly caught 23P01 (exclusion_violation): Double-booking blocked!");
      } else {
        throw err;
      }
    }
    if (!exclusionCaught) {
      throw new Error("FAILED: GiST exclusion constraint failed to block overlapping booking!");
    }

    // ------------------------------------------------------------------------
    // TEST 2: fn_is_available Stored Function
    // ------------------------------------------------------------------------
    console.log("\nTEST 2: fn_is_available function");
    // Conflicting window for LH-101
    const resConflict = await client.query(
      "SELECT fn_is_available(1, '2026-11-20 09:30:00'::TIMESTAMP, '2026-11-20 10:30:00'::TIMESTAMP) AS avail"
    );
    const isAvailConflict = resConflict.rows[0].avail;
    console.log(`  Checking LH-101 during booked slot: is_available = ${isAvailConflict}`);
    if (isAvailConflict !== false) throw new Error("FAILED: fn_is_available should return FALSE for booked slot");

    // Free window for LH-101
    const resFree = await client.query(
      "SELECT fn_is_available(1, '2026-11-20 11:30:00'::TIMESTAMP, '2026-11-20 13:00:00'::TIMESTAMP) AS avail"
    );
    const isAvailFree = resFree.rows[0].avail;
    console.log(`  Checking LH-101 during free slot: is_available = ${isAvailFree}`);
    if (isAvailFree !== true) throw new Error("FAILED: fn_is_available should return TRUE for free slot");
    console.log("  ✓ fn_is_available logic verified successfully.");

    // ------------------------------------------------------------------------
    // TEST 3: fn_recommend_resources Stored Function
    // ------------------------------------------------------------------------
    console.log("\nTEST 3: Explainable Recommendations (fn_recommend_resources)");
    const recRes = await client.query(
      `SELECT resource_id, resource_name, capacity, total_score, capacity_score, facilities_score, facility_breakdown
       FROM fn_recommend_resources(
         2, -- COMPUTER_LAB
         30, -- Capacity requested
         '2026-11-20 11:00:00'::TIMESTAMP,
         '2026-11-20 13:00:00'::TIMESTAMP,
         '[{"facility_id": 4, "min_quantity": 30}]'::JSONB
       )`
    );
    console.log(`  Found ${recRes.rows.length} candidate computer labs.`);
    for (const row of recRes.rows) {
      console.log(`  - ${row.resource_name} (Cap: ${row.capacity}): Total=${row.total_score}%, Cap=${row.capacity_score}%, Fac=${row.facilities_score}%`);
    }
    if (recRes.rows.length === 0 || recRes.rows[0].total_score <= 0) {
      throw new Error("FAILED: Recommendations did not return scored candidates");
    }
    console.log("  ✓ Recommendation calculation & score breakdown verified.");

    // ------------------------------------------------------------------------
    // TEST 4: sp_approve_request Stored Procedure
    // ------------------------------------------------------------------------
    console.log("\nTEST 4: sp_approve_request atomic approval");
    // Admin 1 approves Request 4 (LH-101 for workshop)
    await client.query("CALL sp_approve_request(4, 1, 1)");
    const verifyBooking = await client.query(
      "SELECT id, request_id, resource_id, status FROM booking WHERE request_id = 4"
    );
    if (verifyBooking.rows.length === 0 || verifyBooking.rows[0].status !== "CONFIRMED") {
      throw new Error("FAILED: Stored procedure did not create confirmed booking");
    }
    console.log(`  ✓ Successfully approved request 4, created confirmed booking ID ${verifyBooking.rows[0].id}`);

    // Test conflict prevention: Attempt to approve another request for the same slot
    // Create a temporary conflicting request
    const tempReqRes = await client.query(
      `INSERT INTO booking_request (user_id, resource_type_id, preferred_resource_id, title, start_time, end_time, expected_capacity, status)
       VALUES (3, 1, 1, 'Conflicting Session', '2026-11-20 13:30:00'::TIMESTAMP, '2026-11-20 14:30:00'::TIMESTAMP, 30, 'PENDING')
       RETURNING id`
    );
    const tempReqId = tempReqRes.rows[0].id;

    let conflictCaught = false;
    try {
      await client.query(`CALL sp_approve_request(${tempReqId}, 1, 1)`);
    } catch (err: any) {
      conflictCaught = true;
      console.log(`  ✓ Conflicting approval correctly rejected: ${err.message}`);
    }
    if (!conflictCaught) throw new Error("FAILED: sp_approve_request allowed conflicting approval!");

    // Clean up temp request
    await client.query(`DELETE FROM booking_request WHERE id = ${tempReqId}`);

    // ------------------------------------------------------------------------
    // TEST 5: Maintenance Trigger trg_maintenance_status
    // ------------------------------------------------------------------------
    console.log("\nTEST 5: Maintenance Status Trigger (trg_maintenance_status)");
    // Insert ongoing maintenance for Resource 8 (LAB-EC1)
    const maintRes = await client.query(
      `INSERT INTO maintenance (resource_id, scheduled_by_user_id, start_time, end_time, status, reason)
       VALUES (8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '4 hours', 'IN_PROGRESS', 'Network switch upgrade')
       RETURNING id`
    );
    const maintId = maintRes.rows[0].id;

    // Check that resource status automatically changed to MAINTENANCE
    const resMaint = await client.query("SELECT status FROM resource WHERE id = 8");
    console.log(`  Resource 8 status with active maintenance: ${resMaint.rows[0].status}`);
    if (resMaint.rows[0].status !== "MAINTENANCE") throw new Error("FAILED: trg_maintenance_status did not set MAINTENANCE status");

    // Complete maintenance
    await client.query(`UPDATE maintenance SET status = 'COMPLETED' WHERE id = ${maintId}`);
    const resRestored = await client.query("SELECT status FROM resource WHERE id = 8");
    console.log(`  Resource 8 status after maintenance completion: ${resRestored.rows[0].status}`);
    if (resRestored.rows[0].status !== "AVAILABLE") throw new Error("FAILED: trg_maintenance_status did not restore AVAILABLE status");
    console.log("  ✓ Maintenance automatic state synchronization verified.");

    // Clean up test maintenance record
    await client.query(`DELETE FROM maintenance WHERE id = ${maintId}`);

    // ------------------------------------------------------------------------
    // TEST 6: Request Cancellation Trigger trg_request_cancelled
    // ------------------------------------------------------------------------
    console.log("\nTEST 6: Request Cancellation Cascade Trigger (trg_request_cancelled)");
    // Request 4 was approved in Test 4 and has a confirmed booking
    await client.query("UPDATE booking_request SET status = 'CANCELLED' WHERE id = 4");
    const checkBookingCancel = await client.query("SELECT status FROM booking WHERE request_id = 4");
    console.log(`  Booking status after request cancelled: ${checkBookingCancel.rows[0].status}`);
    if (checkBookingCancel.rows[0].status !== "CANCELLED") {
      throw new Error("FAILED: trg_request_cancelled did not cascade cancellation to booking");
    }
    console.log("  ✓ Cancellation cascade verified.");

    // ------------------------------------------------------------------------
    // TEST 7: Row-Level Security (RLS) Isolation
    // ------------------------------------------------------------------------
    console.log("\nTEST 7: Row Level Security (RLS) & Faculty Isolation");
    const rlsClient = new Client({
      host: process.env.POSTGRES_HOST || "127.0.0.1",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "campus_db",
      user: "postgres",
      password: "postgres",
    });
    await rlsClient.connect();

    // Begin transaction and switch to campus_faculty role for Faculty 2 (ID 3)
    await rlsClient.query("BEGIN");
    await rlsClient.query("SET LOCAL ROLE campus_faculty");
    await rlsClient.query("SELECT fn_set_current_user_id(3)");

    // Query requests: Faculty 2 should NOT see requests for user 2 (Grace Hopper)
    const facultyReqs = await rlsClient.query("SELECT id, user_id, title FROM booking_request");
    console.log(`  Requests visible to Faculty 2 (ID 3): ${facultyReqs.rows.length}`);
    for (const r of facultyReqs.rows) {
      if (r.user_id !== 3) {
        throw new Error(`FAILED: Faculty 2 saw request ID ${r.id} belonging to user ${r.user_id}!`);
      }
    }

    // Attempting to update user 2's request should update 0 rows
    const hackUpdate = await rlsClient.query(
      "UPDATE booking_request SET title = 'Hacked' WHERE id = 1"
    );
    if (hackUpdate.rowCount !== 0) {
      throw new Error("FAILED: RLS allowed faculty to update another user's request!");
    }
    console.log("  ✓ RLS successfully isolated faculty records. Direct queries cannot breach boundary.");
    await rlsClient.query("ROLLBACK");
    await rlsClient.end();

    console.log("\n=======================================================");
    console.log("✓ ALL POSTGRESQL ADVANCED DATABASE TESTS PASSED CLEANLY!");
    console.log("=======================================================\n");
  } finally {
    await client.end();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
