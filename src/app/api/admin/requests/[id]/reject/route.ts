// src/app/api/admin/requests/[id]/reject/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { queryAsUser } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const rejectSchema = z.object({
  reason: z.string().min(3, "Rejection reason must be at least 3 characters").max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { id } = await params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      return apiError(new Error("VALIDATION_ERROR: Invalid request ID"));
    }

    const body = await req.json();
    const { reason } = rejectSchema.parse(body);

    const updateRes = await queryAsUser(user!,
      `UPDATE booking_request
       SET status = 'REJECTED',
           rejection_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'PENDING'
       RETURNING id, status, rejection_reason`,
      [reason, requestId]
    );

    if (updateRes.rows.length === 0) {
      return apiError(new Error("INVALID_STATE: Request not found or is no longer pending"));
    }

    // Record rejection in review history
    await queryAsUser(user!,
      `INSERT INTO request_review_history (
         request_id, reviewer_user_id, action, comments, created_at
       ) VALUES ($1, $2, 'REJECTED_BY_ADMIN', $3, CURRENT_TIMESTAMP)`,
      [requestId, user!.id, reason]
    );

    return apiSuccess({
      message: "Request rejected",
      request: updateRes.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
