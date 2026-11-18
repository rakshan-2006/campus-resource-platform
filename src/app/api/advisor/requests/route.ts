// src/app/api/advisor/requests/route.ts
// Faculty Advisor Inbox API: Fetch club requests strictly scoped to clubs advised by current faculty

import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "FACULTY");

    const { searchParams } = new URL(req.url);
    const reviewStatusFilter = searchParams.get("review_status"); // PENDING_ADVISOR, ENDORSED, REJECTED

    const conditions: string[] = [
      "br.request_type = 'CLUB'",
      "ca.faculty_user_id = $1",
      "ca.status = 'ACCEPTED'",
    ];
    const params: any[] = [user!.id];

    if (reviewStatusFilter) {
      params.push(reviewStatusFilter.toUpperCase());
      conditions.push(`br.advisor_review_status = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const sql = `
      SELECT 
        br.id,
        br.title,
        br.description,
        br.event_type,
        br.expected_capacity,
        br.start_time,
        br.end_time,
        br.status,
        br.request_type,
        br.club_id,
        br.advisor_review_status,
        br.expected_guests,
        br.equipment_notes,
        br.rejection_reason,
        br.created_at,
        br.updated_at,
        cp.club_name,
        cp.category AS club_category,
        cp.lead_name AS club_lead_name,
        cp.lead_phone AS club_lead_phone,
        u.email AS club_email,
        rt.id AS resource_type_id,
        rt.name AS resource_type_name,
        r.id AS preferred_resource_id,
        r.code AS preferred_resource_code,
        r.name AS preferred_resource_name,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'facility_id', f.id,
              'facility_name', f.name,
              'min_quantity', rrf.min_quantity
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::JSONB
        ) AS requested_facilities
      FROM booking_request br
      JOIN club_profile cp ON br.club_id = cp.id
      JOIN club_advisor ca ON cp.id = ca.club_id
      JOIN users u ON cp.user_id = u.id
      JOIN resource_type rt ON br.resource_type_id = rt.id
      LEFT JOIN resource r ON br.preferred_resource_id = r.id
      LEFT JOIN resource_request_facility rrf ON br.id = rrf.request_id
      LEFT JOIN facility f ON rrf.facility_id = f.id
      ${whereClause}
      GROUP BY br.id, cp.id, u.id, rt.id, r.id
      ORDER BY 
        CASE br.advisor_review_status 
          WHEN 'PENDING_ADVISOR' THEN 1 
          WHEN 'ENDORSED' THEN 2 
          ELSE 3 
        END,
        br.created_at DESC
    `;

    const res = await query(sql, params);
    return apiSuccess(res.rows);
  } catch (error) {
    return apiError(error);
  }
}
