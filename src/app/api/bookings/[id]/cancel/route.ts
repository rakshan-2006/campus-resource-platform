// src/app/api/bookings/[id]/cancel/route.ts
import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Authentication required"));
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    const bookingRes = await query(
      "SELECT booked_by_user_id, status FROM booking WHERE id = $1",
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return apiError(new Error("NOT_FOUND: Booking not found"));
    }

    const booking = bookingRes.rows[0];

    // Only booking owner or admin can cancel
    if (user.role === "FACULTY" && booking.booked_by_user_id !== user.id) {
      return apiError(new Error("FORBIDDEN: You can only cancel your own bookings"));
    }

    if (booking.status === "CANCELLED") {
      return apiError(new Error("INVALID_STATE: Booking is already cancelled"));
    }

    const res = await query(
      "UPDATE booking SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, status",
      [bookingId]
    );

    return apiSuccess({
      message: "Booking cancelled successfully",
      booking: res.rows[0],
    });
  } catch (error) {
    return apiError(error);
  }
}
