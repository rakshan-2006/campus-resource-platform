// src/app/api/metadata/route.ts
import { query } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const [deptRes, typeRes, facRes, facultyRes] = await Promise.all([
      query("SELECT id, code, name FROM department ORDER BY name ASC"),
      query("SELECT id, code, name, description FROM resource_type ORDER BY id ASC"),
      query("SELECT id, code, name, description FROM facility ORDER BY name ASC"),
      query(`
        SELECT u.id, u.name, u.email, d.name AS department_name 
        FROM users u 
        JOIN department d ON u.department_id = d.id 
        WHERE u.role = 'FACULTY' AND u.verification_status = 'APPROVED'
        ORDER BY u.name ASC
      `),
    ]);

    return apiSuccess({
      departments: deptRes.rows,
      resource_types: typeRes.rows,
      facilities: facRes.rows,
      faculty_advisors: facultyRes.rows,
    });
  } catch (error) {
    return apiError(error);
  }
}
