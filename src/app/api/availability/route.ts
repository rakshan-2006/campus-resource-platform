// src/app/api/availability/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

const availabilityQuerySchema = z.object({
  resource_id: z.coerce.number().positive(),
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
  exclude_booking_id: z.coerce.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = availabilityQuerySchema.parse({
      resource_id: searchParams.get("resource_id"),
      start_time: searchParams.get("start_time"),
      end_time: searchParams.get("end_time"),
      exclude_booking_id: searchParams.get("exclude_booking_id") || undefined,
    });

    const res = await query(
      "SELECT fn_is_available($1, $2::TIMESTAMP, $3::TIMESTAMP, $4) AS is_available",
      [
        parsed.resource_id,
        parsed.start_time,
        parsed.end_time,
        parsed.exclude_booking_id || null,
      ]
    );

    const isAvailable = res.rows[0]?.is_available === true;

    return apiSuccess({
      resource_id: parsed.resource_id,
      start_time: parsed.start_time,
      end_time: parsed.end_time,
      is_available: isAvailable,
    });
  } catch (error) {
    return apiError(error);
  }
}
