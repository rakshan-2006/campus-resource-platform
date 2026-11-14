// src/app/api/admin/maintenance/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { NextResponse } from "next/server";

const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};

const patchSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

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

    const result = await query(
      `SELECT
         m.id,
         m.resource_id,
         r.name AS resource_name,
         r.code AS resource_code,
         r.status AS resource_status,
         m.scheduled_by_user_id,
         u.name AS scheduler_name,
         m.start_time,
         m.end_time,
         m.status,
         m.reason,
         m.notes,
         m.created_at
       FROM maintenance m
       JOIN resource r ON m.resource_id = r.id
       LEFT JOIN users u ON m.scheduled_by_user_id = u.id
       WHERE m.id = $1`,
      [maintenanceId]
    );

    if (result.rows.length === 0) {
      return apiError(new Error("Maintenance record not found"));
    }

    return apiSuccess(result.rows[0]);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
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

    const body = await req.json();
    const parsed = patchSchema.parse(body);
    const newStatus = parsed.status;

    // Fetch current status
    const current = await query(
      "SELECT id, status FROM maintenance WHERE id = $1",
      [maintenanceId]
    );
    if (current.rows.length === 0) {
      return apiError(new Error("Maintenance record not found"));
    }

    const currentStatus: string = current.rows[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: {
            message: `Invalid status transition: ${currentStatus} cannot transition to ${newStatus}`,
            code: "INVALID_TRANSITION",
          },
        },
        { status: 409 }
      );
    }

    // Plain UPDATE so trg_maintenance_status fires
    await query(
      "UPDATE maintenance SET status = $1 WHERE id = $2",
      [newStatus, maintenanceId]
    );

    // Fetch updated record with resource info
    const updated = await query(
      `SELECT
         m.id,
         m.resource_id,
         r.name AS resource_name,
         r.code AS resource_code,
         r.status AS resource_status,
         m.scheduled_by_user_id,
         u.name AS scheduler_name,
         m.start_time,
         m.end_time,
         m.status,
         m.reason,
         m.notes,
         m.created_at
       FROM maintenance m
       JOIN resource r ON m.resource_id = r.id
       LEFT JOIN users u ON m.scheduled_by_user_id = u.id
       WHERE m.id = $1`,
      [maintenanceId]
    );

    return apiSuccess(updated.rows[0]);
  } catch (error) {
    return apiError(error);
  }
}
