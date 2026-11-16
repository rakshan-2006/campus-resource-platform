// src/app/api/auth/register/route.ts
// Institutional self-registration for Faculty and Clubs with admin verification & advisor nomination

import { NextRequest } from "next/server";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const registrationSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("FACULTY"),
    name: z.string().min(2, "Full name must be at least 2 characters").max(100),
    email: z.string().email("Valid institutional email required").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    department_id: z.number().int().positive("Department selection is required"),
  }),
  z.object({
    role: z.literal("CLUB"),
    club_name: z.string().min(2, "Club name must be at least 2 characters").max(150),
    email: z.string().email("Valid institutional contact email required").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    lead_name: z.string().min(2, "Lead / President name is required").max(100),
    lead_phone: z.string().max(30).optional().nullable(),
    category: z.enum(["Technical", "Cultural", "Sports", "Literary", "Social", "Academic", "Other"]).default("Technical"),
    description: z.string().max(1000).optional().nullable(),
    founded_year: z.number().int().min(1900).max(2100).optional().nullable(),
    faculty_advisor_id: z.number().int().positive("A verified faculty advisor must be selected"),
    department_id: z.number().int().positive().optional().nullable(),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registrationSchema.parse(body);
    const cleanEmail = parsed.email.toLowerCase().trim();

    // 1. Prevent duplicate emails
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = $1", [cleanEmail]);
    if (existing.rows.length > 0) {
      return apiError(new Error("CONFLICT: An institutional account with this email address already exists."));
    }

    const hashedPassword = await hashPassword(parsed.password);

    if (parsed.role === "FACULTY") {
      // 2. Validate department exists
      const deptCheck = await query("SELECT id FROM department WHERE id = $1", [parsed.department_id]);
      if (deptCheck.rows.length === 0) {
        return apiError(new Error("VALIDATION_ERROR: Selected department does not exist"));
      }

      const newUser = await query(
        `INSERT INTO users (
           department_id, email, password_hash, name, role, verification_status, created_at
         ) VALUES ($1, $2, $3, $4, 'FACULTY', 'PENDING', CURRENT_TIMESTAMP)
         RETURNING id, email, name, role, verification_status, created_at`,
        [parsed.department_id, cleanEmail, hashedPassword, parsed.name.trim()]
      );

      return apiSuccess(
        {
          user: newUser.rows[0],
          message: "Faculty registration submitted successfully. Institutional administrator verification is required before faculty features are enabled.",
        },
        201
      );
    }

    // 3. CLUB Registration Flow
    // Verify faculty advisor exists, is a verified FACULTY member
    const advisorCheck = await query(
      `SELECT u.id, u.name, u.email, u.role, u.verification_status, u.department_id
       FROM users u
       WHERE u.id = $1 AND u.role = 'FACULTY' AND u.verification_status = 'APPROVED'`,
      [parsed.faculty_advisor_id]
    );

    if (advisorCheck.rows.length === 0) {
      return apiError(new Error("VALIDATION_ERROR: Nominated faculty advisor must be an active, verified faculty member"));
    }

    const advisorRow = advisorCheck.rows[0];
    // Default club department to advisor's department or Student Affairs (SA)
    let clubDeptId = parsed.department_id;
    if (!clubDeptId) {
      const saDept = await query("SELECT id FROM department WHERE code = 'SA' LIMIT 1");
      clubDeptId = saDept.rows.length > 0 ? saDept.rows[0].id : advisorRow.department_id;
    }

    const result = await withTransaction(async (client) => {
      // 3.1 Create user entry with role = 'CLUB' and verification_status = 'PENDING'
      const userRes = await client.query(
        `INSERT INTO users (
           department_id, email, password_hash, name, role, verification_status, created_at
         ) VALUES ($1, $2, $3, $4, 'CLUB', 'PENDING', CURRENT_TIMESTAMP)
         RETURNING id, email, name, role, verification_status, created_at`,
        [clubDeptId, cleanEmail, hashedPassword, parsed.club_name.trim()]
      );
      const newUserId = userRes.rows[0].id;

      // 3.2 Create club_profile entry
      const profileRes = await client.query(
        `INSERT INTO club_profile (
           user_id, club_name, lead_name, lead_phone, category, description, founded_year, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, club_name, category`,
        [
          newUserId,
          parsed.club_name.trim(),
          parsed.lead_name.trim(),
          parsed.lead_phone?.trim() || null,
          parsed.category,
          parsed.description?.trim() || null,
          parsed.founded_year || null,
        ]
      );
      const newClubId = profileRes.rows[0].id;

      // 3.3 Create club_advisor nomination with status = 'PENDING'
      await client.query(
        `INSERT INTO club_advisor (
           club_id, faculty_user_id, status, assigned_at, notes
         ) VALUES ($1, $2, 'PENDING', CURRENT_TIMESTAMP, 'Nominated during institutional self-registration')`,
        [newClubId, parsed.faculty_advisor_id]
      );

      return {
        user: userRes.rows[0],
        club: profileRes.rows[0],
      };
    });

    return apiSuccess(
      {
        user: result.user,
        club: result.club,
        message: "Club registration submitted successfully. Requires institutional administrator verification and faculty advisor acceptance before event requests can be submitted.",
      },
      201
    );
  } catch (error) {
    return apiError(error);
  }
}
