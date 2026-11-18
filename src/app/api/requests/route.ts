// src/app/api/requests/route.ts
// Handles resource and event requests for Faculty and Clubs with multi-stage review history

import { NextRequest } from "next/server";
import { z } from "zod";
import { query, queryAsUser, withUserContext } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const createRequestSchema = z.object({
  resource_type_id: z.number().int().positive(),
  preferred_resource_id: z.number().int().positive().nullable().optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().max(1000).optional().nullable(),
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
  expected_capacity: z.number().int().positive("Capacity must be positive"),
  event_type: z.string().max(50).optional().nullable(),
  expected_guests: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().int().nonnegative().optional().nullable()
  ),
  equipment_notes: z.string().max(500).optional().nullable(),
  required_facilities: z
    .array(
      z.object({
        facility_id: z.number().int().positive(),
        min_quantity: z.number().int().positive().default(1),
      })
    )
    .default([]),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const requestType = searchParams.get("request_type");

    let sql = `
      SELECT 
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
      WHERE 1=1
    `;

    const params: any[] = [];

    // Role-based visibility: Club and Faculty see only their own requests; Admin sees all
    if (user.role === "FACULTY" || user.role === "CLUB") {
      params.push(user.id);
      sql += ` AND br.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND br.status = $${params.length}`;
    }

    if (requestType) {
      params.push(requestType.toUpperCase());
      sql += ` AND br.request_type = $${params.length}`;
    }

    sql += ` GROUP BY br.id, u.id, d.id, rt.id, r.id, cp.id ORDER BY br.created_at DESC`;

    const res = await queryAsUser(user, sql, params);
    return apiSuccess(res.rows);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    // Check account verification
    const userRow = await query(
      "SELECT id, role, verification_status FROM users WHERE id = $1",
      [user.id]
    );

    if (userRow.rows.length === 0 || userRow.rows[0].verification_status !== "APPROVED") {
      return apiError(
        new Error("FORBIDDEN: Your institutional account is currently pending administrator verification. You cannot submit venue requests until your account is approved.")
      );
    }

    const body = await req.json();
    const parsed = createRequestSchema.parse(body);

    let requestType = "FACULTY";
    let clubId: number | null = null;
    let advisorReviewStatus = "NOT_APPLICABLE";

    if (user.role === "CLUB") {
      requestType = "CLUB";
      // Fetch club profile
      const clubRes = await query("SELECT id FROM club_profile WHERE user_id = $1", [user.id]);
      if (clubRes.rows.length === 0) {
        return apiError(new Error("NOT_FOUND: Club profile not found for this account"));
      }
      clubId = clubRes.rows[0].id;

      // Verify club has an active accepted faculty advisor
      const advisorRes = await query(
        "SELECT id FROM club_advisor WHERE club_id = $1 AND status = 'ACCEPTED'",
        [clubId]
      );

      if (advisorRes.rows.length === 0) {
        return apiError(
          new Error("FORBIDDEN: Your club does not currently have an accepted faculty advisor. An active faculty advisor endorsement is required before submitting venue requests.")
        );
      }

      advisorReviewStatus = "PENDING_ADVISOR";
    }

    // Dedicated-client transaction for multi-table insertion
    const createdRequest = await withUserContext(user.id, user.role, async (client) => {
      const reqRes = await client.query(
        `INSERT INTO booking_request (
          user_id,
          resource_type_id,
          preferred_resource_id,
          title,
          description,
          start_time,
          end_time,
          expected_capacity,
          status,
          request_type,
          club_id,
          advisor_review_status,
          event_type,
          expected_guests,
          equipment_notes,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6::TIMESTAMP, $7::TIMESTAMP, $8, 
          'PENDING', $9, $10, $11, $12, $13, $14, 
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, status, title, request_type, advisor_review_status`,
        [
          user.id,
          parsed.resource_type_id,
          parsed.preferred_resource_id || null,
          parsed.title,
          parsed.description || null,
          parsed.start_time,
          parsed.end_time,
          parsed.expected_capacity,
          requestType,
          clubId,
          advisorReviewStatus,
          parsed.event_type || null,
          parsed.expected_guests || null,
          parsed.equipment_notes || null,
        ]
      );

      const requestId = reqRes.rows[0].id;

      if (parsed.required_facilities.length > 0) {
        for (const fac of parsed.required_facilities) {
          await client.query(
            `INSERT INTO resource_request_facility (request_id, facility_id, min_quantity)
             VALUES ($1, $2, $3)`,
            [requestId, fac.facility_id, fac.min_quantity]
          );
        }
      }

      // Record initial history
      await client.query(
        `INSERT INTO request_review_history (
           request_id, reviewer_user_id, action, comments, created_at
         ) VALUES ($1, $2, 'SUBMITTED', $3, CURRENT_TIMESTAMP)`,
        [
          requestId,
          user.id,
          requestType === "CLUB"
            ? "Club event request submitted for faculty advisor review"
            : "Faculty resource request submitted for administrator triage",
        ]
      );

      return reqRes.rows[0];
    });

    return apiSuccess(createdRequest, 201);
  } catch (error) {
    return apiError(error);
  }
}
