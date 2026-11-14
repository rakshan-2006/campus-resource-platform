// src/app/api/bookings/[id]/reschedule/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { queryAsUser } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

const rescheduleSchema = z.object({
  new_start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
  new_end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    const body = await req.json();
    const { new_start_time, new_end_time } = rescheduleSchema.parse(body);

    const bookingRes = await queryAsUser(user,
      "SELECT resource_id, booked_by_user_id, status FROM booking WHERE id = $1",
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Booking not found"));
    }

    const booking = bookingRes.rows[0];

    if (user.role === "FACULTY" && booking.booked_by_user_id !== user.id) {
      return apiError(new Error("FORBIDDEN: You can only reschedule your own bookings"));
    }

    if (booking.status !== "CONFIRMED") {
      return apiError(new Error("INVALID_STATE: Only confirmed bookings can be rescheduled"));
    }

    // Check availability for the new window (excluding current booking ID)
    const availRes = await queryAsUser(user,
      "SELECT fn_is_available($1, $2::TIMESTAMP, $3::TIMESTAMP, $4) AS is_available",
      [booking.resource_id, new_start_time, new_end_time, bookingId]
    );

    if (availRes.rows[0]?.is_available !== true) {
      return apiError(new Error("CONFLICT: The selected new time slot conflicts with an existing booking or maintenance"));
    }

    // Update times. Protected by GiST exclusion constraint at DB level as well!
    const res = await queryAsUser(user,
      `UPDATE booking 
       SET start_time = $1::TIMESTAMP, 
           end_time = $2::TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND status = 'CONFIRMED'
       RETURNING id, resource_id, start_time, end_time, status`,
      [new_start_time, new_end_time, bookingId]
    );

    if (res.rowCount === 0) throw new Error("INVALID_STATE: Booking is no longer confirmed");
    return apiSuccess({
      message: "Booking rescheduled successfully",
      booking: res.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
