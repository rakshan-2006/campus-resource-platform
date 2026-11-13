// src/app/api/admin/resource-types/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const createSchema = z.object({
  code: z.string().min(1).max(32).toUpperCase(),
  name: z.string().min(1).max(128),
  description: z.string().max(500).optional().nullable(),
});

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const result = await query(
      `SELECT id, code, name, description FROM resource_type ORDER BY name ASC`
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

    const result = await query(
      `INSERT INTO resource_type (code, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, description`,
      [data.code, data.name, data.description ?? null]
    );

    return apiSuccess(result.rows[0], 201);
  } catch (error) {
    return apiError(error);
  }
}
