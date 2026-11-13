// src/app/api/recommendations/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

const recommendationSchema = z.object({
  resource_type_id: z.number().int().positive("Resource type is required"),
  expected_capacity: z.number().int().positive("Capacity must be positive"),
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Timestamp format must be YYYY-MM-DD HH:mm"),
  required_facilities: z
    .array(
      z.object({
        facility_id: z.number().int().positive(),
        min_quantity: z.number().int().positive().default(1),
      })
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = recommendationSchema.parse(body);

    const res = await query(
      `SELECT * FROM fn_recommend_resources(
        $1, 
        $2, 
        $3::TIMESTAMP, 
        $4::TIMESTAMP, 
        $5::JSONB
      )`,
      [
        parsed.resource_type_id,
        parsed.expected_capacity,
        parsed.start_time,
        parsed.end_time,
        JSON.stringify(parsed.required_facilities),
      ]
    );

    return apiSuccess(res.rows);
  } catch (error) {
    return apiError(error);
  }
}
