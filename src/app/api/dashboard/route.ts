// src/app/api/dashboard/route.ts
// Comprehensive role-specific dashboard telemetry for Admin, Faculty (with Advisor Desk), and Clubs

import { queryAsUser } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    // =========================================================================
    // 1. CLUB DASHBOARD VIEW
    // =========================================================================
    if (user.role === "CLUB") {
      const [clubRes, statsRes, requestsRes, bookingsRes] = await Promise.all([
        queryAsUser(user,
          `SELECT 
             cp.id, cp.club_name, cp.category, cp.lead_name, cp.lead_phone, cp.description,
             u.verification_status,
             ca.id AS advisor_assignment_id,
             ca.status AS advisor_status,
             adv_u.name AS advisor_name,
             adv_u.email AS advisor_email
           FROM club_profile cp
           JOIN users u ON cp.user_id = u.id
           LEFT JOIN club_advisor ca ON cp.id = ca.club_id AND ca.status IN ('ACCEPTED', 'PENDING')
           LEFT JOIN users adv_u ON ca.faculty_user_id = adv_u.id
           WHERE cp.user_id = $1
           ORDER BY 
             CASE ca.status WHEN 'ACCEPTED' THEN 1 WHEN 'PENDING' THEN 2 ELSE 3 END
           LIMIT 1`,
          [user.id]
        ),
        queryAsUser(user,
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'PENDING' AND advisor_review_status = 'PENDING_ADVISOR') AS pending_advisor_count,
             COUNT(*) FILTER (WHERE status = 'PENDING' AND advisor_review_status = 'ENDORSED') AS endorsed_pending_admin_count,
             COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved_events_count,
             COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_events_count
           FROM booking_request
           WHERE user_id = $1`,
          [user.id]
        ),
        queryAsUser(user,
          `SELECT 
             br.id, br.title, br.start_time, br.end_time, br.status, br.expected_capacity,
             br.advisor_review_status, br.event_type,
             rt.name AS resource_type_name, r.name AS preferred_resource_name
           FROM booking_request br
           JOIN resource_type rt ON br.resource_type_id = rt.id
           LEFT JOIN resource r ON br.preferred_resource_id = r.id
           WHERE br.user_id = $1
           ORDER BY br.created_at DESC
           LIMIT 5`,
          [user.id]
        ),
        queryAsUser(user,
          `SELECT 
             b.id, b.start_time, b.end_time, b.status, br.title, 
             r.code AS resource_code, r.name AS resource_name, r.location
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
        role: "CLUB",
        club: clubRes.rows[0] || null,
        stats: statsRes.rows[0],
        recent_requests: requestsRes.rows,
        upcoming_bookings: bookingsRes.rows,
      });
    }

    // =========================================================================
    // 2. FACULTY DASHBOARD VIEW (With Advisor Desk)
    // =========================================================================
    if (user.role === "FACULTY") {
      const [statsRes, requestsRes, bookingsRes, advisorRes, pendingReviewsRes] = await Promise.all([
        queryAsUser(user,
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_requests_count,
             COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved_requests_count,
             COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_requests_count
           FROM booking_request
           WHERE user_id = $1`,
          [user.id]
        ),
        queryAsUser(user,
          `SELECT 
             br.id, br.title, br.start_time, br.end_time, br.status, br.expected_capacity,
             rt.name AS resource_type_name, r.name AS preferred_resource_name
           FROM booking_request br
           JOIN resource_type rt ON br.resource_type_id = rt.id
           LEFT JOIN resource r ON br.preferred_resource_id = r.id
           WHERE br.user_id = $1
           ORDER BY br.created_at DESC
           LIMIT 5`,
          [user.id]
        ),
        queryAsUser(user,
          `SELECT 
             b.id, b.start_time, b.end_time, b.status, br.title, 
             r.code AS resource_code, r.name AS resource_name, r.location
           FROM booking b
           JOIN booking_request br ON b.request_id = br.id
           JOIN resource r ON b.resource_id = r.id
           WHERE b.booked_by_user_id = $1 AND b.status = 'CONFIRMED' AND b.end_time >= CURRENT_TIMESTAMP
           ORDER BY b.start_time ASC
           LIMIT 5`,
          [user.id]
        ),
        // Advisor Desk: clubs advised and pending invitations
        queryAsUser(user,
          `SELECT 
             ca.id AS assignment_id,
             ca.club_id,
             ca.status AS advisor_status,
             ca.assigned_at,
             cp.club_name,
             cp.category AS club_category,
             cp.lead_name AS club_lead_name,
             u.email AS club_email
           FROM club_advisor ca
           JOIN club_profile cp ON ca.club_id = cp.id
           JOIN users u ON cp.user_id = u.id
           WHERE ca.faculty_user_id = $1
           ORDER BY 
             CASE ca.status WHEN 'PENDING' THEN 1 WHEN 'ACCEPTED' THEN 2 ELSE 3 END,
             ca.assigned_at DESC`,
          [user.id]
        ),
        // Club event requests awaiting this faculty advisor's review
        queryAsUser(user,
          `SELECT 
             br.id, br.title, br.start_time, br.end_time, br.expected_capacity,
             br.event_type, br.created_at,
             cp.club_name, cp.category AS club_category,
             rt.name AS resource_type_name,
             r.name AS preferred_resource_name
           FROM booking_request br
           JOIN club_profile cp ON br.club_id = cp.id
           JOIN club_advisor ca ON cp.id = ca.club_id
           JOIN resource_type rt ON br.resource_type_id = rt.id
           LEFT JOIN resource r ON br.preferred_resource_id = r.id
           WHERE ca.faculty_user_id = $1
             AND ca.status = 'ACCEPTED'
             AND br.request_type = 'CLUB'
             AND br.advisor_review_status = 'PENDING_ADVISOR'
             AND br.status = 'PENDING'
           ORDER BY br.created_at ASC`,
          [user.id]
        ),
      ]);

      const pendingInvitations = advisorRes.rows.filter((r) => r.advisor_status === "PENDING");
      const activeClubs = advisorRes.rows.filter((r) => r.advisor_status === "ACCEPTED");

      return apiSuccess({
        role: "FACULTY",
        verification_status: user.verification_status,
        stats: statsRes.rows[0],
        recent_requests: requestsRes.rows,
        upcoming_bookings: bookingsRes.rows,
        advisor_desk: {
          is_advisor: activeClubs.length > 0 || pendingInvitations.length > 0,
          pending_invitations: pendingInvitations,
          active_clubs: activeClubs,
          pending_reviews: pendingReviewsRes.rows,
          pending_reviews_count: pendingReviewsRes.rows.length,
        },
      });
    }

    // =========================================================================
    // 3. ADMIN DASHBOARD VIEW
    // =========================================================================
    const [pendingRes, statsRes, utilRes, peakRes, pendingRegsRes] = await Promise.all([
      // Triage requests ready for allocation (Faculty requests OR Endorsed Club requests)
      queryAsUser(user, `
        SELECT * FROM v_pending_requests 
        WHERE request_type = 'FACULTY' OR advisor_review_status = 'ENDORSED'
        ORDER BY created_at ASC
        LIMIT 10
      `),
      queryAsUser(user, `
        SELECT 
          (SELECT COUNT(*) FROM resource WHERE status = 'AVAILABLE') AS available_resources_count,
          (SELECT COUNT(*) FROM resource WHERE status = 'MAINTENANCE') AS maintenance_resources_count,
          (SELECT COUNT(*) FROM booking_request WHERE status = 'PENDING') AS total_pending_requests_count,
          (SELECT COUNT(*) FROM booking_request WHERE status = 'PENDING' AND (request_type = 'FACULTY' OR advisor_review_status = 'ENDORSED')) AS ready_for_allocation_count,
          (SELECT COUNT(*) FROM users WHERE verification_status = 'PENDING') AS pending_registrations_count,
          (SELECT COUNT(*) FROM booking WHERE status = 'CONFIRMED' AND start_time >= CURRENT_TIMESTAMP) AS upcoming_bookings_count
      `),
      queryAsUser(user, "SELECT * FROM v_resource_utilization ORDER BY utilization_percentage DESC LIMIT 5"),
      queryAsUser(user, "SELECT * FROM v_peak_hours ORDER BY hour_of_day ASC"),
      // Pending account registrations needing review
      queryAsUser(user, `
        SELECT 
          u.id, u.name, u.email, u.role, u.created_at,
          COALESCE(d.name, 'Student Affairs & Campus Clubs') AS department_name,
          cp.club_name, cp.category AS club_category
        FROM users u
        LEFT JOIN department d ON u.department_id = d.id
        LEFT JOIN club_profile cp ON u.id = cp.user_id
        WHERE u.verification_status = 'PENDING'
        ORDER BY u.created_at ASC
        LIMIT 5
      `),
    ]);

    return apiSuccess({
      role: "ADMIN",
      stats: statsRes.rows[0],
      pending_requests: pendingRes.rows,
      pending_registrations: pendingRegsRes.rows,
      top_utilized_resources: utilRes.rows,
      peak_hours: peakRes.rows,
    });
  } catch (error) {
    return apiError(error);
  }
}
