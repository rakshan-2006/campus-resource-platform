// src/app/api/advisor/requests/[id]/review/route.ts
// Faculty Advisor Decision API: Endorse or Reject a club event request

import { NextRequest } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const reviewSchema = z.object({
  action: z.enum(["ENDORSE", "REJECT"]),
  comments: z.string().min(3, "Review comments/feedback must be at least 3 characters").max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    requireRole(user, "FACULTY");

    const { id } = await params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      return apiError(new Error("VALIDATION_ERROR: Invalid request ID"));
    }

    const body = await req.json();
    const parsed = reviewSchema.parse(body);

    const result = await withTransaction(async (client) => {
      // 1. Lock the booking request row FOR UPDATE to guard against concurrent decisions
      const reqRes = await client.query(
        `SELECT br.id, br.title, br.status, br.request_type, br.club_id, br.advisor_review_status, cp.club_name
         FROM booking_request br
         JOIN club_profile cp ON br.club_id = cp.id
         WHERE br.id = $1
         FOR UPDATE OF br`,
        [requestId]
      );

      if (reqRes.rows.length === 0) {
        throw new Error("NOT_FOUND: Club event request not found");
      }

      const reqRow = reqRes.rows[0];

      if (reqRow.request_type !== "CLUB") {
        throw new Error("VALIDATION_ERROR: Only club event requests require faculty advisor endorsement");
      }

      // 2. Validate advisor ownership: current user must be the active accepted advisor for this club
      const advisorCheck = await client.query(
        `SELECT id, status 
         FROM club_advisor 
         WHERE club_id = $1 AND faculty_user_id = $2 AND status = 'ACCEPTED'`,
        [reqRow.club_id, user!.id]
      );

      if (advisorCheck.rows.length === 0) {
        throw new Error("FORBIDDEN: You are not the authorized faculty advisor for this club");
      }

      // 3. Guard state transitions against duplicate decisions
      if (reqRow.status !== "PENDING" || reqRow.advisor_review_status !== "PENDING_ADVISOR") {
        throw new Error(
          `CONFLICT: Request has already been reviewed (Status: ${reqRow.status}, Advisor Status: ${reqRow.advisor_review_status})`
        );
      }

      if (parsed.action === "ENDORSE") {
        // Endorse request: Advances to Admin Triage desk for final resource allocation
        await client.query(
          `UPDATE booking_request
           SET advisor_review_status = 'ENDORSED',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [requestId]
        );

        // Record history
        await client.query(
          `INSERT INTO request_review_history (
             request_id, reviewer_user_id, action, comments, created_at
           ) VALUES ($1, $2, 'ENDORSED', $3, CURRENT_TIMESTAMP)`,
          [requestId, user!.id, parsed.comments.trim()]
        );

        return {
          id: requestId,
          title: reqRow.title,
          status: "PENDING",
          advisor_review_status: "ENDORSED",
          message: `Event request '${reqRow.title}' successfully endorsed! It has been forwarded to campus administrators for final venue allocation.`,
        };
      } else {
        // Reject request: Sets status to REJECTED with advisor reason
        await client.query(
          `UPDATE booking_request
           SET status = 'REJECTED',
               advisor_review_status = 'REJECTED',
               rejection_reason = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [parsed.comments.trim(), requestId]
        );

        // Record history
        await client.query(
          `INSERT INTO request_review_history (
             request_id, reviewer_user_id, action, comments, created_at
           ) VALUES ($1, $2, 'REJECTED_BY_ADVISOR', $3, CURRENT_TIMESTAMP)`,
          [requestId, user!.id, parsed.comments.trim()]
        );

        return {
          id: requestId,
          title: reqRow.title,
          status: "REJECTED",
          advisor_review_status: "REJECTED",
          message: `Event request '${reqRow.title}' returned/rejected with feedback.`,
        };
      }
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
