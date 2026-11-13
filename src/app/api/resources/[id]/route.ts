// src/app/api/resources/[id]/route.ts
import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getResourceProfile } from "@/lib/mongo";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const resourceId = parseInt(id);

    if (isNaN(resourceId)) {
      return apiError(new Error("VALIDATION_ERROR: Invalid resource ID"));
    }

    // 1. Authoritative PostgreSQL Resource Record
    const res = await query(
      `SELECT 
        r.id,
        r.code,
        r.name,
        r.capacity,
        r.location,
        r.status,
        r.resource_type_id,
        rt.name AS resource_type_name,
        rt.code AS resource_type_code,
        r.department_id,
        d.name AS department_name,
        r.created_at,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'facility_id', f.id,
              'facility_name', f.name,
              'facility_code', f.code,
              'quantity', rf.quantity
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::JSONB
        ) AS facilities
      FROM resource r
      JOIN resource_type rt ON r.resource_type_id = rt.id
      JOIN department d ON r.department_id = d.id
      LEFT JOIN resource_facility rf ON r.id = rf.resource_id
      LEFT JOIN facility f ON rf.facility_id = f.id
      WHERE r.id = $1
      GROUP BY r.id, rt.id, d.id`,
      [resourceId]
    );

    if (res.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Resource not found"));
    }

    const resource = res.rows[0];

    // 2. Fetch optional extended specifications profile from MongoDB
    const mongoProfile = await getResourceProfile(resourceId);

    return apiSuccess({
      ...resource,
      profile: mongoProfile,
    });
  } catch (error) {
    return apiError(error);
  }
}
