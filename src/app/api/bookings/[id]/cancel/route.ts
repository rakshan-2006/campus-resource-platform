// src/app/api/bookings/[id]/cancel/route.ts
import { NextRequest } from "next/server";
import { withUserContext } from "@/lib/db";
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

    return await withUserContext(user.id, user.role, async (client) => {
      const { rows: [booking] } = await client.query(
        "SELECT request_id, booked_by_user_id, status FROM booking WHERE id = $1",
        [bookingId]
      );
      if (!booking) throw new Error("NOT_FOUND: Booking not found");
      if (user.role === "FACULTY" && booking.booked_by_user_id !== user.id) {
        throw new Error("FORBIDDEN: You can only cancel your own bookings");
      }
      if (booking.status !== "CONFIRMED") throw new Error("INVALID_STATE: Booking is already cancelled");

      const cancelled = await client.query(
        "UPDATE booking_request SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'APPROVED' RETURNING id",
        [booking.request_id]
      );
      if (cancelled.rowCount === 0) throw new Error("INVALID_STATE: This booking cannot be cancelled");
      return apiSuccess({
        message: "Booking cancelled successfully",
        booking: { id: bookingId, status: "CANCELLED" },
      });
    });
  } catch (error) {
    return apiError(error);
  }
}
