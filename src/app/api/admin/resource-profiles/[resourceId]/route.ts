// src/app/api/admin/resource-profiles/[resourceId]/route.ts
// MongoDB extended specifications CRUD for campus resources
// PostgreSQL remains authoritative for all bookings, requests, and inventory.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getProfilesCollection } from "@/lib/mongo";

// Safe key validator: prevent MongoDB operator injection ($) or nested path traversal (.)
function sanitizeSpecifications(specs: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(specs)) {
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    // Allow primitives, arrays of strings/numbers/objects, and plain objects
    clean[key] = val;
  }
  return clean;
}

const postProfileSchema = z.object({
  resource_type: z.string().min(1).optional(),
  specifications: z.record(z.any()),
});

const patchProfileSchema = z.object({
  specifications: z.record(z.any()),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { resourceId } = await params;
    const resId = parseInt(resourceId);
    if (isNaN(resId)) {
      return apiError(new Error("Invalid resource ID"));
    }

    const coll = await getProfilesCollection();
    const profile = await coll.findOne({ pg_resource_id: resId });

    // Returns null when no profile recorded — this is a valid state, not an error
    return apiSuccess(profile || null);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { resourceId } = await params;
    const resId = parseInt(resourceId);
    if (isNaN(resId)) {
      return apiError(new Error("Invalid resource ID"));
    }

    const body = await req.json();
    const data = postProfileSchema.parse(body);

    // 1. Verify resource exists in PostgreSQL and retrieve its canonical type
    const pgRes = await query(
      `SELECT r.id, r.resource_type_id, rt.code AS type_code
       FROM resource r
       JOIN resource_type rt ON rt.id = r.resource_type_id
       WHERE r.id = $1`,
      [resId]
    );

    if (pgRes.rows.length === 0) {
      return NextResponse.json(
        { error: { message: "Referenced PostgreSQL resource does not exist", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const canonicalTypeCode = pgRes.rows[0].type_code;

    // 2. Validate type match if supplied
    if (data.resource_type && data.resource_type !== canonicalTypeCode) {
      return NextResponse.json(
        {
          error: {
            message: `Resource type mismatch: profile specifies '${data.resource_type}', but PostgreSQL resource is '${canonicalTypeCode}'`,
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const coll = await getProfilesCollection();

    // 3. Refuse duplicate profile (unique 1:0..1 mapping)
    const existing = await coll.findOne({ pg_resource_id: resId });
    if (existing) {
      return NextResponse.json(
        {
          error: {
            message: "A profile already exists for this resource. Use PATCH to update existing specifications.",
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    const safeSpecs = sanitizeSpecifications(data.specifications);
    const newDoc = {
      pg_resource_id: resId,
      resource_type: canonicalTypeCode,
      updated_at: new Date().toISOString(),
      specifications: safeSpecs,
    };

    try {
      const insertResult = await coll.insertOne(newDoc);
      return apiSuccess({ _id: insertResult.insertedId, ...newDoc }, 201);
    } catch (mongoErr: any) {
      if (mongoErr.code === 11000) {
        return NextResponse.json(
          {
            error: {
              message: "A profile already exists for this resource (duplicate key).",
              code: "CONFLICT",
            },
          },
          { status: 409 }
        );
      }
      throw mongoErr;
    }
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { resourceId } = await params;
    const resId = parseInt(resourceId);
    if (isNaN(resId)) {
      return apiError(new Error("Invalid resource ID"));
    }

    const body = await req.json();
    const data = patchProfileSchema.parse(body);
    const safeSpecs = sanitizeSpecifications(data.specifications);

    const coll = await getProfilesCollection();
    const existing = await coll.findOne({ pg_resource_id: resId });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "No extended profile found for this resource. Use POST to create one.", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    // Merge specifications: keep existing keys that weren't supplied, update supplied ones
    const mergedSpecs = {
      ...(existing.specifications || {}),
      ...safeSpecs,
    };

    const updatedDoc = {
      $set: {
        specifications: mergedSpecs,
        updated_at: new Date().toISOString(), // Server-generated timestamp only
      },
    };

    await coll.updateOne({ pg_resource_id: resId }, updatedDoc);

    const refreshed = await coll.findOne({ pg_resource_id: resId });
    return apiSuccess(refreshed);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { resourceId } = await params;
    const resId = parseInt(resourceId);
    if (isNaN(resId)) {
      return apiError(new Error("Invalid resource ID"));
    }

    const coll = await getProfilesCollection();
    const result = await coll.deleteOne({ pg_resource_id: resId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: { message: "No extended profile found for this resource", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    // Note: PostgreSQL resource record remains completely untouched
    return apiSuccess({ deleted: true, pg_resource_id: resId });
  } catch (error) {
    return apiError(error);
  }
}
