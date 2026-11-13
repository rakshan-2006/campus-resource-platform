// src/app/api/admin/resources/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const facilityInputSchema = z.object({
  facility_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createSchema = z.object({
  resource_type_id: z.number().int().positive(),
  department_id: z.number().int().positive(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
  capacity: z.number().int().positive(),
  location: z.string().max(256).optional().nullable(),
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]).default("AVAILABLE"),
  facilities: z.array(facilityInputSchema).optional().default([]),
});

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const result = await query(
      `SELECT
         r.id,
         r.code,
         r.name,
         r.capacity,
         r.location,
         r.status,
         r.resource_type_id,
         rt.name AS resource_type_name,
         r.department_id,
         d.name AS department_name,
         COALESCE(
           (
             SELECT json_agg(json_build_object(
               'facility_id', rf.facility_id,
               'facility_name', f.name,
               'facility_code', f.code,
               'quantity', rf.quantity
             ) ORDER BY f.name)
             FROM resource_facility rf
             JOIN facility f ON f.id = rf.facility_id
             WHERE rf.resource_id = r.id
           ), '[]'::json
         ) AS facilities,
         COALESCE(
           (
             SELECT COUNT(*)::int
             FROM booking b
             WHERE b.resource_id = r.id
               AND b.status NOT IN ('CANCELLED')
           ), 0
         ) AS usage_count
       FROM resource r
       JOIN resource_type rt ON rt.id = r.resource_type_id
       JOIN department d ON d.id = r.department_id
       ORDER BY r.code ASC`
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
    const data = createSchema.parse(body);

    // Refuse MAINTENANCE on creation
    if ((data.status as string) === "MAINTENANCE") {
      return apiError(new Error("Cannot create a resource with MAINTENANCE status. Use maintenance management."));
    }

    // Refuse duplicate facility_ids
    const facilityIds = data.facilities.map((f) => f.facility_id);
    if (facilityIds.length !== new Set(facilityIds).size) {
      return apiError(new Error("Duplicate facility IDs supplied."));
    }

    const resource = await withTransaction(async (client) => {
      const ins = await client.query(
        `INSERT INTO resource (resource_type_id, department_id, code, name, capacity, location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, resource_type_id, department_id, code, name, capacity, location, status`,
        [
          data.resource_type_id,
          data.department_id,
          data.code,
          data.name,
          data.capacity,
          data.location ?? null,
          data.status,
        ]
      );

      const newResource = ins.rows[0];

      for (const fac of data.facilities) {
        await client.query(
          `INSERT INTO resource_facility (resource_id, facility_id, quantity)
           VALUES ($1, $2, $3)`,
          [newResource.id, fac.facility_id, fac.quantity]
        );
      }

      return newResource;
    });

    return apiSuccess(resource, 201);
  } catch (error) {
    return apiError(error);
  }
}
