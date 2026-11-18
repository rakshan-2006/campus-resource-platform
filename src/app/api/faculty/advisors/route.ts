// src/app/api/faculty/advisors/route.ts
// Faculty API to view assigned clubs and pending advisor nominations

import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getSessionUser();
    requireRole(user, "FACULTY");

    // Fetch all advisor assignments for the current faculty user
    const res = await query(
      `SELECT 
         ca.id AS assignment_id,
         ca.club_id,
         ca.status AS advisor_status,
         ca.assigned_at,
         ca.responded_at,
         ca.notes,
         cp.club_name,
         cp.lead_name,
         cp.lead_phone,
         cp.category AS club_category,
         cp.description AS club_description,
         cp.founded_year,
         u.email AS club_email,
         u.verification_status AS club_verification_status,
         (
           SELECT COUNT(*)::int 
           FROM booking_request br 
           WHERE br.club_id = cp.id AND br.advisor_review_status = 'PENDING_ADVISOR'
         ) AS pending_reviews_count
       FROM club_advisor ca
       JOIN club_profile cp ON ca.club_id = cp.id
       JOIN users u ON cp.user_id = u.id
       WHERE ca.faculty_user_id = $1
       ORDER BY 
         CASE ca.status 
           WHEN 'PENDING' THEN 1 
           WHEN 'ACCEPTED' THEN 2 
           ELSE 3 
         END,
         ca.assigned_at DESC`,
      [user!.id]
    );

    const pending = res.rows.filter((r) => r.advisor_status === "PENDING");
    const accepted = res.rows.filter((r) => r.advisor_status === "ACCEPTED");
    const other = res.rows.filter((r) => !["PENDING", "ACCEPTED"].includes(r.advisor_status));

    return apiSuccess({
      pending_invitations: pending,
      assigned_clubs: accepted,
      past_assignments: other,
      total_advised_count: accepted.length,
      total_pending_count: pending.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
