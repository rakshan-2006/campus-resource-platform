// src/app/api/dashboard/route.ts
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    if (user.role === "FACULTY") {
      // Faculty Dashboard: Own stats and upcoming reservations
      const [statsRes, requestsRes, bookingsRes] = await Promise.all([
        query(
          `SELECT 
            COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_requests_count,
            COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved_requests_count,
            COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_requests_count
           FROM booking_request
           WHERE user_id = $1`,
          [user.id]
        ),
        query(
          `SELECT br.id, br.title, br.start_time, br.end_time, br.status, br.expected_capacity,
                  rt.name AS resource_type_name, r.name AS preferred_resource_name
           FROM booking_request br
           JOIN resource_type rt ON br.resource_type_id = rt.id
           LEFT JOIN resource r ON br.preferred_resource_id = r.id
           WHERE br.user_id = $1
           ORDER BY br.created_at DESC
           LIMIT 5`,
          [user.id]
        ),
        query(
          `SELECT b.id, b.start_time, b.end_time, b.status, br.title, r.code AS resource_code, r.name AS resource_name, r.location
           FROM booking b
           JOIN booking_request br ON b.request_id = br.id
           JOIN resource r ON b.resource_id = r.id
           WHERE b.booked_by_user_id = $1 AND b.status = 'CONFIRMED' AND b.end_time >= CURRENT_TIMESTAMP
           ORDER BY b.start_time ASC
           LIMIT 5`,
          [user.id]
        ),
      ]);

      return apiSuccess({
        role: "FACULTY",
        stats: statsRes.rows[0],
        recent_requests: requestsRes.rows,
        upcoming_bookings: bookingsRes.rows,
      });
    }

    // Admin Dashboard: System-wide triage and analytical overview
    const [pendingRes, statsRes, utilRes, peakRes] = await Promise.all([
      query("SELECT * FROM v_pending_requests LIMIT 10"),
      query(`
        SELECT 
          (SELECT COUNT(*) FROM resource WHERE status = 'AVAILABLE') AS available_resources_count,
          (SELECT COUNT(*) FROM resource WHERE status = 'MAINTENANCE') AS maintenance_resources_count,
          (SELECT COUNT(*) FROM booking_request WHERE status = 'PENDING') AS pending_triage_count,
          (SELECT COUNT(*) FROM booking WHERE status = 'CONFIRMED' AND start_time >= CURRENT_TIMESTAMP) AS upcoming_bookings_count
      `),
      query("SELECT * FROM v_resource_utilization ORDER BY utilization_percentage DESC LIMIT 5"),
      query("SELECT * FROM v_peak_hours ORDER BY hour_of_day ASC"),
    ]);

    return apiSuccess({
      role: "ADMIN",
      stats: statsRes.rows[0],
      pending_requests: pendingRes.rows,
      top_utilized_resources: utilRes.rows,
      peak_hours: peakRes.rows,
    });
  } catch (error) {
    return apiError(error);
  }
}
