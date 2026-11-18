// src/app/api/faculty/advisors/[id]/respond/route.ts
// Faculty API to Accept or Decline a club advisor assignment

import { NextRequest } from "next/server";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const respondSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "FACULTY");

    const { id } = await params;
    const assignmentId = parseInt(id);

    if (isNaN(assignmentId)) {
      return apiError(new Error("VALIDATION_ERROR: Invalid advisor assignment ID"));
    }

    const body = await req.json();
    const parsed = respondSchema.parse(body);

    // Verify ownership: This assignment MUST be for the logged-in faculty user!
    const assignmentCheck = await query(
      `SELECT ca.id, ca.club_id, ca.faculty_user_id, ca.status, cp.club_name
       FROM club_advisor ca
       JOIN club_profile cp ON ca.club_id = cp.id
       WHERE ca.id = $1`,
      [assignmentId]
    );

    if (assignmentCheck.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Advisor assignment invitation not found"));
    }

    const assignment = assignmentCheck.rows[0];

    if (assignment.faculty_user_id !== user!.id) {
      return apiError(new Error("FORBIDDEN: You do not have permission to respond to this advisor invitation"));
    }

    if (assignment.status !== "PENDING") {
      return apiError(new Error(`CONFLICT: Invitation has already been responded to with status ${assignment.status}`));
    }

    const newStatus = parsed.action === "ACCEPT" ? "ACCEPTED" : "DECLINED";

    const updated = await withTransaction(async (client) => {
      // If ACCEPTING, replace any prior active advisor for this club
      if (newStatus === "ACCEPTED") {
        await client.query(
          `UPDATE club_advisor 
           SET status = 'REPLACED'
           WHERE club_id = $1 AND status = 'ACCEPTED' AND id != $2`,
          [assignment.club_id, assignmentId]
        );
      }

      const updateRes = await client.query(
        `UPDATE club_advisor
         SET status = $1,
             responded_at = CURRENT_TIMESTAMP,
             notes = COALESCE($2, notes)
         WHERE id = $3
         RETURNING id, club_id, faculty_user_id, status, assigned_at, responded_at, notes`,
        [newStatus, parsed.notes?.trim() || null, assignmentId]
      );

      return updateRes.rows[0];
    });

    return apiSuccess({
      message: `You have successfully ${newStatus.toLowerCase()}ed the faculty advisor appointment for ${assignment.club_name}.`,
      assignment: updated,
    });
  } catch (error) {
    return apiError(error);
  }
}
