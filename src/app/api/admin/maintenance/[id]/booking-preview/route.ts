// src/app/api/admin/maintenance/[id]/booking-preview/route.ts
import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { id } = await params;
    const maintenanceId = parseInt(id);
    if (isNaN(maintenanceId)) {
      return apiError(new Error("Invalid maintenance ID"));
    }

    // Fetch maintenance record for time window and resource
    const maintRes = await query(
      "SELECT id, resource_id, start_time, end_time, status FROM maintenance WHERE id = $1",
      [maintenanceId]
    );
    if (maintRes.rows.length === 0) {
      return apiError(new Error("Maintenance record not found"));
    }

    const maint = maintRes.rows[0];

    // Find confirmed bookings whose window intersects the maintenance window
    const bookings = await query(
      `SELECT
         b.id,
         b.resource_id,
         r.name AS resource_name,
         r.code AS resource_code,
         b.start_time,
         b.end_time,
         b.status,
         u.id AS faculty_id,
         u.name AS faculty_name,
         u.role AS faculty_role
       FROM booking b
       JOIN resource r ON b.resource_id = r.id
       LEFT JOIN users u ON b.booked_by_user_id = u.id
       WHERE b.resource_id = $1
         AND b.status = 'CONFIRMED'
         AND b.start_time < $3
         AND b.end_time > $2`,
      [maint.resource_id, maint.start_time, maint.end_time]
    );

    return apiSuccess({
      maintenance_id: maintenanceId,
      resource_id: maint.resource_id,
      start_time: maint.start_time,
      end_time: maint.end_time,
      affected_bookings: bookings.rows,
      count: bookings.rows.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
