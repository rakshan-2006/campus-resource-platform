// src/app/api/admin/facilities/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { NextResponse } from "next/server";

const patchSchema = z.object({
  code: z.string().min(1).max(32).toUpperCase().optional(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { id } = await params;
    const facilityId = parseInt(id);
    if (isNaN(facilityId)) {
      return apiError(new Error("Invalid facility ID"));
    }

    const result = await query(
      `SELECT id, code, name, description FROM facility WHERE id = $1`,
      [facilityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { message: "Facility not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
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
    const facilityId = parseInt(id);
    if (isNaN(facilityId)) {
      return apiError(new Error("Invalid facility ID"));
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (data.code !== undefined) {
      setClauses.push(`code = $${paramIdx++}`);
      values.push(data.code);
    }
    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      values.push(data.description);
    }

    if (setClauses.length === 0) {
      return apiError(new Error("No fields to update"));
    }

    values.push(facilityId);
    const result = await query(
      `UPDATE facility SET ${setClauses.join(", ")} WHERE id = $${paramIdx}
       RETURNING id, code, name, description`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { message: "Facility not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

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
    requireRole(user, "ADMIN");

    const { id } = await params;
    const facilityId = parseInt(id);
    if (isNaN(facilityId)) {
      return apiError(new Error("Invalid facility ID"));
    }

    // Refuse if any resource_facility references this facility
    const refCheck = await query(
      `SELECT COUNT(*)::int AS cnt FROM resource_facility WHERE facility_id = $1`,
      [facilityId]
    );

    if (refCheck.rows[0].cnt > 0) {
      return NextResponse.json(
        {
          error: {
            message: `Cannot delete: ${refCheck.rows[0].cnt} resource(s) reference this facility.`,
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    const result = await query(
      `DELETE FROM facility WHERE id = $1 RETURNING id`,
      [facilityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { message: "Facility not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return apiSuccess({ deleted: true, id: facilityId });
  } catch (error) {
    return apiError(error);
  }
}
