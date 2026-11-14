// src/app/api/admin/requests/[id]/approve/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { withUserContext } from "@/lib/db";
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

    const body = await req.text();
    const parsed = approveSchema.parse(body.trim() ? parseApprovalBody(body) : {});
    const assignedResourceId = parsed.assigned_resource_id ?? null;

    const bookingRes = await withUserContext(user!.id, "ADMIN", async (client) => {
      await client.query("CALL sp_approve_request($1, $2, $3)", [requestId, user!.id, assignedResourceId]);
      return client.query(
        `SELECT b.id, b.request_id, b.resource_id, r.code AS resource_code, r.name AS resource_name,
                b.start_time, b.end_time, b.status
         FROM booking b
         JOIN resource r ON r.id = b.resource_id
         WHERE b.request_id = $1`,
        [requestId]
      );
    });

    return apiSuccess({
      message: "Booking request approved and confirmed successfully",
      booking: bookingRes.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}

function parseApprovalBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
