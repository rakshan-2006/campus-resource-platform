// src/app/api/admin/resources/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getProfilesCollection } from "@/lib/mongo";

const facilityInputSchema = z.object({
  facility_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const patchSchema = z.object({
  resource_type_id: z.number().int().positive().optional(),
  department_id: z.number().int().positive().optional(),
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(128).optional(),
  capacity: z.number().int().positive().optional(),
  location: z.string().max(256).nullable().optional(),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"]).optional(),
  facilities: z.array(facilityInputSchema).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { id } = await params;
    const resourceId = parseInt(id);
    if (isNaN(resourceId)) {
      return apiError(new Error("Invalid resource ID"));
    }

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
         rt.code AS resource_type_code,
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
       WHERE r.id = $1`,
      [resourceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { message: "Resource not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const resource = result.rows[0];

    // Fetch MongoDB profile if available
    let profile = null;
    try {
      const coll = await getProfilesCollection();
      profile = await coll.findOne({ pg_resource_id: resourceId });
    } catch (err) {
      console.warn("Could not fetch Mongo profile for resource", resourceId, err);
    }

    return apiSuccess({ ...resource, profile });
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
    const resourceId = parseInt(id);
    if (isNaN(resourceId)) {
      return apiError(new Error("Invalid resource ID"));
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    // Refuse manual MAINTENANCE status
    if (data.status === "MAINTENANCE") {
      return NextResponse.json(
        {
          error: {
            message: "Cannot manually set status to MAINTENANCE. Use the Maintenance module to schedule servicing.",
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    // Refuse AVAILABLE while ongoing maintenance exists
    if (data.status === "AVAILABLE") {
      const ongoingMaint = await query(
        `SELECT 1 FROM maintenance WHERE resource_id = $1 AND status = 'IN_PROGRESS' LIMIT 1`,
        [resourceId]
      );
      if (ongoingMaint.rows.length > 0) {
        return NextResponse.json(
          {
            error: {
              message: "Cannot mark resource AVAILABLE while active maintenance is ongoing. Complete or cancel the active maintenance window first.",
              code: "CONFLICT",
            },
          },
          { status: 409 }
        );
      }
    }

    // Validate no duplicate facilities
    if (data.facilities) {
      const facilityIds = data.facilities.map((f) => f.facility_id);
      if (facilityIds.length !== new Set(facilityIds).size) {
        return apiError(new Error("Duplicate facility IDs supplied."));
      }
    }

    const updatedResource = await withTransaction(async (client) => {
      // Check resource exists
      const existing = await client.query("SELECT * FROM resource WHERE id = $1 FOR UPDATE", [resourceId]);
      if (existing.rows.length === 0) {
        throw new Error("NOT_FOUND: Resource not found");
      }

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (data.resource_type_id !== undefined) {
        setClauses.push(`resource_type_id = $${paramIdx++}`);
        values.push(data.resource_type_id);
      }
      if (data.department_id !== undefined) {
        setClauses.push(`department_id = $${paramIdx++}`);
        values.push(data.department_id);
      }
      if (data.code !== undefined) {
        setClauses.push(`code = $${paramIdx++}`);
        values.push(data.code);
      }
      if (data.name !== undefined) {
        setClauses.push(`name = $${paramIdx++}`);
        values.push(data.name);
      }
      if (data.capacity !== undefined) {
        setClauses.push(`capacity = $${paramIdx++}`);
        values.push(data.capacity);
      }
      if (data.location !== undefined) {
        setClauses.push(`location = $${paramIdx++}`);
        values.push(data.location);
      }
      if (data.status !== undefined) {
        setClauses.push(`status = $${paramIdx++}`);
        values.push(data.status);
      }

      if (setClauses.length > 0) {
        values.push(resourceId);
        await client.query(
          `UPDATE resource SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
          values
        );
      }

      // Replace facility assignments transactionally if facilities was provided
      if (data.facilities !== undefined) {
        await client.query("DELETE FROM resource_facility WHERE resource_id = $1", [resourceId]);
        for (const fac of data.facilities) {
          await client.query(
            "INSERT INTO resource_facility (resource_id, facility_id, quantity) VALUES ($1, $2, $3)",
            [resourceId, fac.facility_id, fac.quantity]
          );
        }
      }

      // Return refreshed record
      const res = await client.query(
        `SELECT
           r.id, r.code, r.name, r.capacity, r.location, r.status,
           r.resource_type_id, rt.name AS resource_type_name,
           r.department_id, d.name AS department_name
         FROM resource r
         JOIN resource_type rt ON rt.id = r.resource_type_id
         JOIN department d ON d.id = r.department_id
         WHERE r.id = $1`,
        [resourceId]
      );
      return res.rows[0];
    });

    return apiSuccess(updatedResource);
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
    requireRole(user, "ADMIN");

    const { id } = await params;
    const resourceId = parseInt(id);
    if (isNaN(resourceId)) {
      return apiError(new Error("Invalid resource ID"));
    }

    // Refuse deleting a referenced resource: check booking, booking_request, maintenance
    const bookingCheck = await query(
      `SELECT COUNT(*)::int AS cnt FROM booking WHERE resource_id = $1`,
      [resourceId]
    );
    if (bookingCheck.rows[0].cnt > 0) {
      return NextResponse.json(
        {
          error: {
            message: `Cannot delete: resource is referenced by ${bookingCheck.rows[0].cnt} existing booking(s). Mark it UNAVAILABLE instead.`,
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    const requestCheck = await query(
      `SELECT COUNT(*)::int AS cnt FROM booking_request WHERE preferred_resource_id = $1`,
      [resourceId]
    );
    if (requestCheck.rows[0].cnt > 0) {
      return NextResponse.json(
        {
          error: {
            message: `Cannot delete: resource is referenced by ${requestCheck.rows[0].cnt} booking request(s). Mark it UNAVAILABLE instead.`,
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    const maintCheck = await query(
      `SELECT COUNT(*)::int AS cnt FROM maintenance WHERE resource_id = $1`,
      [resourceId]
    );
    if (maintCheck.rows[0].cnt > 0) {
      return NextResponse.json(
        {
          error: {
            message: `Cannot delete: resource has ${maintCheck.rows[0].cnt} maintenance record(s). Mark it UNAVAILABLE instead.`,
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    await withTransaction(async (client) => {
      await client.query("DELETE FROM resource_facility WHERE resource_id = $1", [resourceId]);
      const del = await client.query("DELETE FROM resource WHERE id = $1 RETURNING id", [resourceId]);
      if (del.rows.length === 0) {
        throw new Error("NOT_FOUND: Resource not found");
      }
    });

    // Clean up MongoDB profile if it existed
    try {
      const coll = await getProfilesCollection();
      await coll.deleteOne({ pg_resource_id: resourceId });
    } catch (e) {
      console.warn("Could not remove Mongo profile on resource delete", e);
    }

    return apiSuccess({ deleted: true, id: resourceId });
  } catch (error) {
    return apiError(error);
  }
}
