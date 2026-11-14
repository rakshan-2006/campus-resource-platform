// src/app/api/bookings/route.ts
import { NextRequest } from "next/server";
import { queryAsUser } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get("resource_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const status = searchParams.get("status") || "CONFIRMED";

    if (user.role === "FACULTY" && searchParams.get("view") === "schedule" && startDate && endDate) {
      // Shared timeline shows room occupancy without other users' request or account details.
      const slots = await queryAsUser(user, `
        SELECT id, resource_id, start_time, end_time, status
        FROM v_confirmed_occupancy
        WHERE status = 'CONFIRMED'
          AND start_time < $2::date + INTERVAL '1 day'
          AND end_time > $1::date
          AND ($3::int IS NULL OR resource_id = $3::int)
        ORDER BY start_time
      `, [startDate, endDate, resourceId]);
      return apiSuccess(slots.rows);
    }

    let sql = `
      SELECT 
        b.id,
        b.request_id,
        br.title,
        b.resource_id,
        r.code AS resource_code,
        r.name AS resource_name,
        r.location AS resource_location,
        b.booked_by_user_id,
        u.name AS faculty_name,
        u.email AS faculty_email,
        d.name AS department_name,
        b.start_time,
        b.end_time,
        b.status,
        b.created_at,
        b.updated_at
      FROM booking b
      JOIN booking_request br ON b.request_id = br.id
      JOIN resource r ON b.resource_id = r.id
      JOIN users u ON b.booked_by_user_id = u.id
      JOIN department d ON u.department_id = d.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (user.role === "FACULTY") {
      params.push(user.id);
      sql += ` AND b.booked_by_user_id = $${params.length}`;
    }

    if (status && status !== "ALL") {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }

    if (resourceId) {
      params.push(parseInt(resourceId));
      sql += ` AND b.resource_id = $${params.length}`;
    }

    if (startDate) {
      params.push(`${startDate} 00:00:00`);
      sql += ` AND b.end_time >= $${params.length}::TIMESTAMP`;
    }

    if (endDate) {
      params.push(`${endDate} 23:59:59`);
      sql += ` AND b.start_time <= $${params.length}::TIMESTAMP`;
    }

    sql += ` ORDER BY b.start_time ASC`;

    const res = await queryAsUser(user, sql, params);
    return apiSuccess(res.rows);
  } catch (error) {
    return apiError(error);
  }
}
