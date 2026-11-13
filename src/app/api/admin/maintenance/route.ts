// src/app/api/admin/maintenance/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const createSchema = z.object({
  resource_id: z.number().int().positive(),
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "Format must be YYYY-MM-DD HH:mm"),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "Format must be YYYY-MM-DD HH:mm"),
  reason: z.string().min(1).max(255),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const resourceIdFilter = searchParams.get("resource_id");

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (statusFilter) {
      conditions.push(`m.status = $${idx++}`);
      params.push(statusFilter);
    }
    if (resourceIdFilter) {
      conditions.push(`m.resource_id = $${idx++}`);
      params.push(parseInt(resourceIdFilter));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
       ${where}
       ORDER BY m.start_time DESC`,
      params
    );

    return apiSuccess(result.rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const body = await req.json();
    const parsed = createSchema.parse(body);

    const startDt = new Date(parsed.start_time.replace(" ", "T"));
    const endDt = new Date(parsed.end_time.replace(" ", "T"));

    if (endDt <= startDt) {
      return apiError(new Error("end_time must be after start_time"));
    }

    // Verify resource exists
    const resourceRes = await query("SELECT id FROM resource WHERE id = $1", [parsed.resource_id]);
    if (resourceRes.rows.length === 0) {
      return apiError(new Error("Resource not found"));
    }

    const result = await query(
      `INSERT INTO maintenance
         (resource_id, scheduled_by_user_id, start_time, end_time, status, reason, notes)
       VALUES ($1, $2, $3, $4, 'SCHEDULED', $5, $6)
       RETURNING *`,
      [
        parsed.resource_id,
        user!.id,
        parsed.start_time,
        parsed.end_time,
        parsed.reason,
        parsed.notes ?? null,
      ]
    );

    return apiSuccess(result.rows[0], 201);
  } catch (error) {
    return apiError(error);
  }
}
