// src/app/api/resources/route.ts
import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeId = searchParams.get("type_id");
    const minCapacity = searchParams.get("min_capacity");
    const departmentId = searchParams.get("department_id");
    const status = searchParams.get("status");

    let sql = `
      SELECT 
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
      WHERE 1=1
    `;

    const params: any[] = [];

    if (typeId) {
      params.push(parseInt(typeId));
      sql += ` AND r.resource_type_id = $${params.length}`;
    }

    if (minCapacity) {
      params.push(parseInt(minCapacity));
      sql += ` AND r.capacity >= $${params.length}`;
    }

    if (departmentId) {
      params.push(parseInt(departmentId));
      sql += ` AND r.department_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }

    sql += ` GROUP BY r.id, rt.id, d.id ORDER BY r.code ASC`;

    const res = await query(sql, params);
    return apiSuccess(res.rows);
  } catch (error) {
    return apiError(error);
  }
}
