// src/app/api/requests/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
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

    let sql = `
      SELECT 
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
      WHERE 1=1
    `;

    const params: any[] = [];

    // Role-based visibility: Faculty sees only own requests; Admin sees all
    if (user.role === "FACULTY") {
      params.push(user.id);
      sql += ` AND br.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND br.status = $${params.length}`;
    }

    sql += ` GROUP BY br.id, u.id, d.id, rt.id, r.id ORDER BY br.created_at DESC`;

    const res = await query(sql, params);
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

    const body = await req.json();
    const parsed = createRequestSchema.parse(body);

    // Dedicated-client transaction for multi-table insertion
    const createdRequest = await withTransaction(async (client) => {
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
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::TIMESTAMP, $7::TIMESTAMP, $8, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, status, title`,
        [
          user.id,
          parsed.resource_type_id,
          parsed.preferred_resource_id || null,
          parsed.title,
          parsed.description || null,
          parsed.start_time,
          parsed.end_time,
          parsed.expected_capacity,
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

      return reqRes.rows[0];
    });

    return apiSuccess(createdRequest, 201);
  } catch (error) {
    return apiError(error);
  }
}
