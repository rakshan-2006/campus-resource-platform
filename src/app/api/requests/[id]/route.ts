// src/app/api/requests/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { queryAsUser } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const updateRequestSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional().nullable(),
  expected_capacity: z.number().int().positive().optional(),
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    const { id } = await params;
    const requestId = parseInt(id);

    const res = await queryAsUser(user,
      `SELECT 
        br.id,
        br.user_id,
        u.name AS faculty_name,
        u.email AS faculty_email,
        d.name AS department_name,
        br.resource_type_id,
        rt.name AS resource_type_name,
        br.preferred_resource_id,
        r.name AS preferred_resource_name,
        r.code AS preferred_resource_code,
        br.title,
        br.description,
        br.start_time,
        br.end_time,
        br.expected_capacity,
        br.status,
        br.rejection_reason,
        br.created_at,
        br.updated_at,
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
      JOIN users u ON br.user_id = u.id
      JOIN department d ON u.department_id = d.id
      JOIN resource_type rt ON br.resource_type_id = rt.id
      LEFT JOIN resource r ON br.preferred_resource_id = r.id
      LEFT JOIN resource_request_facility rrf ON br.id = rrf.request_id
      LEFT JOIN facility f ON rrf.facility_id = f.id
      WHERE br.id = $1
      GROUP BY br.id, u.id, d.id, rt.id, r.id`,
      [requestId]
    );

    if (res.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Request not found"));
    }

    const requestRow = res.rows[0];

    // Authorization check
    if (user.role === "FACULTY" && requestRow.user_id !== user.id) {
      return apiError(new Error("FORBIDDEN: You do not have permission to view this request"));
    }

    return apiSuccess(requestRow);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    const { id } = await params;
    const requestId = parseInt(id);

    const body = await req.json();
    const parsed = updateRequestSchema.parse(body);

    const existingRes = await queryAsUser(user,
      "SELECT user_id, status FROM booking_request WHERE id = $1",
      [requestId]
    );

    if (existingRes.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Request not found"));
    }

    const existing = existingRes.rows[0];

    if (user.role === "FACULTY" && existing.user_id !== user.id) {
      return apiError(new Error("FORBIDDEN: You cannot edit another faculty member's request"));
    }

    if (existing.status !== "PENDING") {
      return apiError(new Error(`INVALID_STATE: Cannot edit a request in '${existing.status}' state`));
    }

    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];

    if (parsed.title !== undefined) {
      values.push(parsed.title);
      updates.push(`title = $${values.length}`);
    }
    if (parsed.description !== undefined) {
      values.push(parsed.description);
      updates.push(`description = $${values.length}`);
    }
    if (parsed.expected_capacity !== undefined) {
      values.push(parsed.expected_capacity);
      updates.push(`expected_capacity = $${values.length}`);
    }
    if (parsed.start_time !== undefined) {
      values.push(parsed.start_time);
      updates.push(`start_time = $${values.length}::TIMESTAMP`);
    }
    if (parsed.end_time !== undefined) {
      values.push(parsed.end_time);
      updates.push(`end_time = $${values.length}::TIMESTAMP`);
    }

    values.push(requestId);
    const updateSql = `
      UPDATE booking_request 
      SET ${[...updates, "updated_at = CURRENT_TIMESTAMP"].join(", ")}
      WHERE id = $${values.length} AND status = 'PENDING'
      RETURNING *
    `;

    const result = await queryAsUser(user, updateSql, values);
    if (result.rowCount === 0) throw new Error("INVALID_STATE: Request is no longer pending");
    return apiSuccess(result.rows[0]);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    const { id } = await params;
    const requestId = parseInt(id);

    const existingRes = await queryAsUser(user,
      "SELECT user_id, status FROM booking_request WHERE id = $1",
      [requestId]
    );

    if (existingRes.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Request not found"));
    }

    const existing = existingRes.rows[0];

    if (user.role === "FACULTY" && existing.user_id !== user.id) {
      return apiError(new Error("FORBIDDEN: You cannot cancel another faculty member's request"));
    }

    // Update status to CANCELLED.
    // PostgreSQL Trigger trg_request_cancelled automatically updates any confirmed booking to CANCELLED!
    const result = await queryAsUser(user,
      "UPDATE booking_request SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status IN ('PENDING', 'APPROVED') RETURNING id, status",
      [requestId]
    );

    if (result.rowCount === 0) throw new Error("INVALID_STATE: Only pending or approved requests can be cancelled");
    return apiSuccess({
      message: "Request cancelled successfully",
      request: result.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
