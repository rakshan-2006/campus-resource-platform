// src/app/api/requests/[id]/route.ts
// Single request retrieval, update, and cancellation with role isolation and review history

import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const updateRequestSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional().nullable(),
  expected_capacity: z.number().int().positive().optional(),
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/).optional(),
  event_type: z.string().max(50).optional().nullable(),
  expected_guests: z.string().max(500).optional().nullable(),
  equipment_notes: z.string().max(500).optional().nullable(),
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

    if (isNaN(requestId)) {
      return apiError(new Error("VALIDATION_ERROR: Invalid request ID"));
    }

    const res = await query(
      `SELECT 
        br.id,
        br.user_id,
        u.name AS faculty_name,
        u.email AS faculty_email,
        u.role AS applicant_role,
        COALESCE(d.name, 'Student Affairs & Campus Clubs') AS department_name,
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
        br.request_type,
        br.club_id,
        cp.club_name,
        br.advisor_review_status,
        br.event_type,
        br.expected_guests,
        br.equipment_notes,
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
        ) AS requested_facilities,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', rrh.id,
                'action', rrh.action,
                'comments', rrh.comments,
                'reviewer_id', rrh.reviewer_user_id,
                'reviewer_name', ru.name,
                'reviewer_role', ru.role,
                'created_at', rrh.created_at
              ) ORDER BY rrh.created_at ASC
            )
            FROM request_review_history rrh
            JOIN users ru ON rrh.reviewer_user_id = ru.id
            WHERE rrh.request_id = br.id
          ),
          '[]'::JSONB
        ) AS review_history
      FROM booking_request br
      JOIN users u ON br.user_id = u.id
      LEFT JOIN department d ON u.department_id = d.id
      JOIN resource_type rt ON br.resource_type_id = rt.id
      LEFT JOIN resource r ON br.preferred_resource_id = r.id
      LEFT JOIN club_profile cp ON br.club_id = cp.id
      LEFT JOIN resource_request_facility rrf ON br.id = rrf.request_id
      LEFT JOIN facility f ON rrf.facility_id = f.id
      WHERE br.id = $1
      GROUP BY br.id, u.id, d.id, rt.id, r.id, cp.id`,
      [requestId]
    );

    if (res.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Request not found"));
    }

    const requestRow = res.rows[0];

    // Authorization check:
    // Admin: can view all
    // Owner: can view own request
    // Faculty Advisor: can view if they advise the requesting club
    let isAuthorized = false;
    if (user.role === "ADMIN" || requestRow.user_id === user.id) {
      isAuthorized = true;
    } else if (user.role === "FACULTY" && requestRow.request_type === "CLUB" && requestRow.club_id) {
      const advCheck = await query(
        "SELECT 1 FROM club_advisor WHERE club_id = $1 AND faculty_user_id = $2 AND status = 'ACCEPTED'",
        [requestRow.club_id, user.id]
      );
      if (advCheck.rows.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
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

    const existingRes = await query(
      "SELECT user_id, status FROM booking_request WHERE id = $1",
      [requestId]
    );

    if (existingRes.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Request not found"));
    }

    const existing = existingRes.rows[0];

    if (user.role !== "ADMIN" && existing.user_id !== user.id) {
      return apiError(new Error("FORBIDDEN: You cannot edit another user's request"));
    }

    if (existing.status !== "PENDING") {
      return apiError(new Error(`INVALID_STATE: Cannot edit a request in '${existing.status}' state`));
    }

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
    if (parsed.event_type !== undefined) {
      values.push(parsed.event_type);
      updates.push(`event_type = $${values.length}`);
    }
    if (parsed.expected_guests !== undefined) {
      values.push(parsed.expected_guests);
      updates.push(`expected_guests = $${values.length}`);
    }
    if (parsed.equipment_notes !== undefined) {
      values.push(parsed.equipment_notes);
      updates.push(`equipment_notes = $${values.length}`);
    }

    if (updates.length === 0) {
      return apiError(new Error("VALIDATION_ERROR: No fields to update"));
    }

    values.push(requestId);
    const updateSql = `
      UPDATE booking_request 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${values.length} 
      RETURNING *
    `;

    const result = await query(updateSql, values);
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

    const existingRes = await query(
      "SELECT user_id, status FROM booking_request WHERE id = $1",
      [requestId]
    );

    if (existingRes.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Request not found"));
    }

    const existing = existingRes.rows[0];

    if (user.role !== "ADMIN" && existing.user_id !== user.id) {
      return apiError(new Error("FORBIDDEN: You cannot cancel another user's request"));
    }

    const result = await query(
      "UPDATE booking_request SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, status",
      [requestId]
    );

    return apiSuccess({
      message: "Request cancelled successfully",
      request: result.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
