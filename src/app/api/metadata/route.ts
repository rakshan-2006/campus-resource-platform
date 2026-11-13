// src/app/api/metadata/route.ts
import { query } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const [deptRes, typeRes, facRes] = await Promise.all([
      query("SELECT id, code, name FROM department ORDER BY name ASC"),
      query("SELECT id, code, name, description FROM resource_type ORDER BY id ASC"),
      query("SELECT id, code, name, description FROM facility ORDER BY name ASC"),
    ]);

    return apiSuccess({
      departments: deptRes.rows,
      resource_types: typeRes.rows,
      facilities: facRes.rows,
    });
  } catch (error) {
    return apiError(error);
  }
}
