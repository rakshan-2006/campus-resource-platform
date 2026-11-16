// src/app/api/admin/registrations/route.ts
// Protected Admin API to review pending, approved, and rejected faculty & club registrations

import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // PENDING, APPROVED, REJECTED
    const roleFilter = searchParams.get("role"); // FACULTY, CLUB

    const conditions: string[] = ["u.role IN ('FACULTY', 'CLUB')"];
    const params: any[] = [];

    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter.toUpperCase())) {
      params.push(statusFilter.toUpperCase());
      conditions.push(`u.verification_status = $${params.length}`);
    }

    if (roleFilter && ["FACULTY", "CLUB"].includes(roleFilter.toUpperCase())) {
      params.push(roleFilter.toUpperCase());
      conditions.push(`u.role = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        u.role,
        u.verification_status,
        u.verified_at,
        u.verified_by_user_id,
        u.verification_notes,
        u.created_at,
        d.id AS department_id,
        COALESCE(d.name, 'Student Affairs & Campus Clubs') AS department_name,
        cp.id AS club_id,
        cp.club_name,
        cp.lead_name,
        cp.lead_phone,
        cp.category AS club_category,
        cp.description AS club_description,
        cp.founded_year,
        ca.id AS advisor_assignment_id,
        ca.status AS advisor_status,
        ca.assigned_at AS advisor_assigned_at,
        ca.responded_at AS advisor_responded_at,
        adv_u.id AS advisor_user_id,
        adv_u.name AS advisor_name,
        adv_u.email AS advisor_email
      FROM users u
      LEFT JOIN department d ON u.department_id = d.id
      LEFT JOIN club_profile cp ON u.id = cp.user_id
      LEFT JOIN club_advisor ca ON cp.id = ca.club_id
      LEFT JOIN users adv_u ON ca.faculty_user_id = adv_u.id
      ${whereClause}
      ORDER BY 
        CASE u.verification_status 
          WHEN 'PENDING' THEN 1 
          WHEN 'APPROVED' THEN 2 
          ELSE 3 
        END,
        u.created_at DESC
    `;

    const res = await query(sql, params);
    return apiSuccess(res.rows);
  } catch (error) {
    return apiError(error);
  }
}
