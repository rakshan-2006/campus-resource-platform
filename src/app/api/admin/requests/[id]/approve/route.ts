// src/app/api/admin/requests/[id]/approve/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const approveSchema = z.object({
  assigned_resource_id: z.number().int().positive().optional().nullable(),
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

    let assignedResourceId: number | null = null;
    try {
      const body = await req.json();
      const parsed = approveSchema.parse(body);
      assignedResourceId = parsed.assigned_resource_id || null;
    } catch {
      // Body is optional
    }

    // Call stored procedure sp_approve_request
    // This executes FOR UPDATE row locking, re-checks fn_is_available, updates status, and inserts booking!
    await query(
      "CALL sp_approve_request($1, $2, $3)",
      [requestId, user!.id, assignedResourceId]
    );

    // Fetch confirmed booking details
    const bookingRes = await query(
      `SELECT b.id, b.request_id, b.resource_id, r.code AS resource_code, r.name AS resource_name,
              b.start_time, b.end_time, b.status
       FROM booking b
       JOIN resource r ON b.resource_id = r.id
       WHERE b.request_id = $1`,
      [requestId]
    );

    return apiSuccess({
      message: "Booking request approved and confirmed successfully",
      booking: bookingRes.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
