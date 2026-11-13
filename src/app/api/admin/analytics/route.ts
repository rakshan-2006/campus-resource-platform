// src/app/api/admin/analytics/route.ts
// Admin Analytics API — queries v_resource_utilization, v_peak_hours, booking, booking_request, users, department
// Assumption: 30-day window, 10 operating hours/day => 300 max hours capacity (defined in v_resource_utilization)

import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser, requireRole } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireRole(user, "ADMIN");

    const { searchParams } = new URL(req.url);
    const threshold = parseFloat(searchParams.get("threshold") || "30");

    // 1. Summary totals
    const totalsRes = await query<{
      total_resources: number;
      total_bookings_last_30d: number;
      confirmed_bookings: number;
      pending_requests: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM resource) AS total_resources,
        (SELECT COUNT(*)::int FROM booking
          WHERE start_time >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS total_bookings_last_30d,
        (SELECT COUNT(*)::int FROM booking
          WHERE status = 'CONFIRMED'
            AND start_time >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS confirmed_bookings,
        (SELECT COUNT(*)::int FROM booking_request WHERE status = 'PENDING') AS pending_requests
    `);

    // 2. Full resource utilization from view
    const utilizationRes = await query<{
      resource_id: number;
      resource_code: string;
      resource_name: string;
      resource_type_name: string;
      department_name: string;
      capacity: number;
      status: string;
      booked_hours_last_30_days: number;
      max_operating_hours_last_30_days: number;
      utilization_percentage: number;
    }>(`
      SELECT
        resource_id::int,
        resource_code,
        resource_name,
        resource_type_name,
        department_name,
        capacity::int,
        status,
        booked_hours_last_30_days::float AS booked_hours_last_30_days,
        max_operating_hours_last_30_days::float AS max_operating_hours_last_30_days,
        utilization_percentage::float AS utilization_percentage
      FROM v_resource_utilization
      ORDER BY utilization_percentage DESC, resource_name ASC
    `);

    // 3. Peak hours from view (all operating hours 07:00-20:00 included via LEFT JOIN in view)
    const peakHoursRes = await query<{
      hour_of_day: number;
      time_label: string;
      booking_count: number;
    }>(`
      SELECT
        hour_of_day::int,
        time_label,
        booking_count::int
      FROM v_peak_hours
      ORDER BY hour_of_day ASC
    `);

    // 4. Underutilized resources (below threshold)
    const underutilizedRes = await query<{
      resource_id: number;
      resource_code: string;
      resource_name: string;
      resource_type_name: string;
      department_name: string;
      capacity: number;
      status: string;
      booked_hours_last_30_days: number;
      max_operating_hours_last_30_days: number;
      utilization_percentage: number;
    }>(`
      SELECT
        resource_id::int,
        resource_code,
        resource_name,
        resource_type_name,
        department_name,
        capacity::int,
        status,
        booked_hours_last_30_days::float AS booked_hours_last_30_days,
        max_operating_hours_last_30_days::float AS max_operating_hours_last_30_days,
        utilization_percentage::float AS utilization_percentage
      FROM v_resource_utilization
      WHERE utilization_percentage < $1
      ORDER BY utilization_percentage ASC, resource_name ASC
    `, [threshold]);

    // 5. Bookings by department (confirmed bookings joined to users and department)
    const byDepartmentRes = await query<{
      department_name: string;
      booking_count: number;
    }>(`
      SELECT
        d.name AS department_name,
        COUNT(b.id)::int AS booking_count
      FROM booking b
      JOIN users u ON b.booked_by_user_id = u.id
      JOIN department d ON u.department_id = d.id
      GROUP BY d.name
      ORDER BY booking_count DESC, d.name ASC
    `);

    // 6. Booking requests grouped by status
    const byStatusRes = await query<{
      status: string;
      count: number;
    }>(`
      SELECT
        status,
        COUNT(*)::int AS count
      FROM booking_request
      GROUP BY status
      ORDER BY count DESC
    `);

    return apiSuccess({
      totals: totalsRes.rows[0],
      utilization: utilizationRes.rows,
      peak_hours: peakHoursRes.rows,
      underutilized: underutilizedRes.rows,
      by_department: byDepartmentRes.rows,
      by_status: byStatusRes.rows,
    });
  } catch (error) {
    return apiError(error);
  }
}
