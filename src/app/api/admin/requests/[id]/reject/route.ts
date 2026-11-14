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

    return apiSuccess({
      message: "Request rejected",
      request: updateRes.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
