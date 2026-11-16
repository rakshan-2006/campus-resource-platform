// src/app/api/admin/registrations/[id]/verify/route.ts
// Protected Admin API to approve or reject a pending faculty or club registration

import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const verifySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { id } = await params;
    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
      return apiError(new Error("VALIDATION_ERROR: Invalid registration user ID"));
    }

    const body = await req.json();
    const parsed = verifySchema.parse(body);

    const targetUser = await query(
      "SELECT id, email, name, role, verification_status FROM users WHERE id = $1",
      [targetUserId]
    );

    if (targetUser.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: User registration record not found"));
    }

    const target = targetUser.rows[0];

    if (target.role === "ADMIN") {
      return apiError(new Error("FORBIDDEN: Administrative accounts cannot be modified via registration verification"));
    }

    const newStatus = parsed.action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updateRes = await query(
      `UPDATE users
       SET verification_status = $1,
           verified_at = CURRENT_TIMESTAMP,
           verified_by_user_id = $2,
           verification_notes = $3
       WHERE id = $4
       RETURNING id, name, email, role, verification_status, verified_at`,
      [newStatus, user!.id, parsed.notes?.trim() || null, targetUserId]
    );

    return apiSuccess({
      message: `Registration for ${target.name} (${target.role}) has been ${newStatus.toLowerCase()}.`,
      user: updateRes.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
