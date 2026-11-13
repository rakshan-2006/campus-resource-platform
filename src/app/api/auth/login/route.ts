// src/app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const loginSchema = z.object({
  email: z.string().email("Valid institutional email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const userRes = await query(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.department_id, d.name AS department_name
       FROM users u
       JOIN department d ON u.department_id = d.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return apiError(new Error("UNAUTHORIZED: Invalid email or password"));
    }

    const userRow = userRes.rows[0];
    const passwordMatch = await verifyPassword(password, userRow.password_hash);

    if (!passwordMatch) {
      return apiError(new Error("UNAUTHORIZED: Invalid email or password"));
    }

    const sessionPayload = {
      sub: userRow.id.toString(),
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      department_id: userRow.department_id,
      department_name: userRow.department_name,
    };

    await setSessionCookie(sessionPayload);

    // Return user without password_hash
    const { password_hash, ...safeUser } = userRow;
    return apiSuccess({ user: safeUser });
  } catch (error) {
    return apiError(error);
  }
}
