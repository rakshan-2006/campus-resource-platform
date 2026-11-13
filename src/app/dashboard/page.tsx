"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { 
  Building2, 
  Calendar, 
  Clock, 
  FileText, 
  PlusCircle, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Wrench
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load dashboard data");
        return res.json();
      })
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-xs text-slate-500 font-mono animate-pulse">Loading dashboard telemetry...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-700">
        Error loading operational dashboard: {error}
      </div>
    );
  }

  // ==========================================================================
  // FACULTY DASHBOARD VIEW
  // ==========================================================================
  if (data.role === "FACULTY") {
    return (
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Faculty Workspace</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit resource requests, review recommendations, and track reservation statuses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/request/new">
              <Button size="sm" className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>New Resource Request</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Requests</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
              {data.stats.pending_requests_count}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Awaiting admin review & allocation</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Reservations</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
              {data.stats.approved_requests_count}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Successfully allocated and confirmed</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected / Resolved</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
              {data.stats.rejected_requests_count}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Resolved with feedback notes</span>
          </div>
        </div>

        {/* Two-Column Grid: Upcoming Bookings & Recent Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Confirmed Reservations */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Upcoming Confirmed Bookings</span>
              </h2>
              <Link href="/bookings" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data.upcoming_bookings.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No upcoming confirmed reservations.</p>
            ) : (
              <div className="space-y-2.5">
                {data.upcoming_bookings.map((booking: any) => (
                  <div key={booking.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{booking.title}</span>
                      <Badge variant="CONFIRMED" className="text-[10px] py-0 px-1">CONFIRMED</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <span className="font-mono text-blue-700 font-semibold">{booking.resource_code}</span>
                      <span>{booking.resource_name}</span>
                      <span>({booking.location})</span>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-slate-500">
                      {booking.start_time.replace("T", " ")} to {booking.end_time.replace("T", " ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Submitted Requests */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-700" />
                <span>Recent Booking Requests</span>
              </h2>
              <Link href="/requests" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data.recent_requests.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No requests submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recent_requests.map((req: any) => (
                  <div key={req.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{req.title}</span>
                      <Badge variant={req.status} className="text-[10px] py-0 px-1">{req.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600">
                      <span>Type: {req.resource_type_name}</span>
                      <span>Expected: {req.expected_capacity} seats</span>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-slate-500">
                      {req.start_time.replace("T", " ")} to {req.end_time.replace("T", " ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ADMIN DASHBOARD VIEW
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Administrative Operations Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Campus-wide resource triage, allocation management, and conflict supervision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/requests">
            <Button size="sm" className="gap-1.5">
              <span>Go to Request Triage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Triage</span>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-2">
            {data.stats.pending_triage_count}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Requests awaiting approval</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Rooms</span>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            {data.stats.available_resources_count}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Ready for allocation</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">In Maintenance</span>
          <p className="text-2xl font-bold font-mono text-orange-600 mt-2">
            {data.stats.maintenance_resources_count}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Active servicing locks</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upcoming Confirmed</span>
          <p className="text-2xl font-bold font-mono text-blue-600 mt-2">
            {data.stats.upcoming_bookings_count}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Campus bookings scheduled</span>
        </div>
      </div>

      {/* Pending Triage Table */}
      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Requests Awaiting Action (v_pending_requests)</span>
          </h2>
          <Link href="/admin/requests" className="text-xs text-blue-600 hover:underline">
            Open Triage Desk
          </Link>
        </div>

        {data.pending_requests.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No pending requests in queue.</p>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Title / Purpose</Th>
                <Th>Faculty Applicant</Th>
                <Th>Type & Capacity</Th>
                <Th>Requested Slot</Th>
                <Th>Wait Time</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.pending_requests.map((r: any) => (
                <Tr key={r.request_id}>
                  <Td className="font-mono text-xs text-slate-500">#{r.request_id}</Td>
                  <Td className="font-semibold text-xs text-slate-900">{r.title}</Td>
                  <Td className="text-xs">
                    <div>{r.faculty_name}</div>
                    <div className="text-[10px] text-slate-500">{r.department_name}</div>
                  </Td>
                  <Td className="text-xs">
                    <div>{r.resource_type_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.expected_capacity} seats</div>
                  </Td>
                  <Td className="text-xs font-mono text-slate-600">
                    <div>{r.start_time.replace("T", " ")}</div>
                    <div>{r.end_time.replace("T", " ")}</div>
                  </Td>
                  <Td className="text-xs text-slate-500 font-mono">{r.wait_hours}h</Td>
                  <Td className="text-right">
                    <Link href="/admin/requests">
                      <Button size="sm" variant="outline" className="text-xs py-0.5 px-2">
                        Triage
                      </Button>
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Utilization Snapshot from View v_resource_utilization */}
      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-700" />
            <span>Campus Resource Utilization (v_resource_utilization)</span>
          </h2>
          <span className="text-[11px] text-slate-500">Based on 30-day operating baseline (300h)</span>
        </div>

        <Table>
          <Thead>
            <Tr>
              <Th>Code</Th>
              <Th>Resource Name</Th>
              <Th>Type</Th>
              <Th>Department</Th>
              <Th>Capacity</Th>
              <Th>Status</Th>
              <Th>30-Day Booked</Th>
              <Th>Utilization %</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.top_utilized_resources.map((item: any) => (
              <Tr key={item.resource_id}>
                <Td className="font-mono text-xs font-semibold text-blue-700">{item.resource_code}</Td>
                <Td className="text-xs font-medium text-slate-900">{item.resource_name}</Td>
                <Td className="text-xs text-slate-600">{item.resource_type_name}</Td>
                <Td className="text-xs text-slate-600">{item.department_name}</Td>
                <Td className="text-xs font-mono">{item.capacity}</Td>
                <Td><Badge status={item.status} className="text-[10px] py-0 px-1" /></Td>
                <Td className="text-xs font-mono">{item.booked_hours_last_30_days} hrs</Td>
                <Td className="text-xs font-mono font-bold text-slate-900">{item.utilization_percentage}%</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
