"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@/components/ui/table";

// ── Types ────────────────────────────────────────────────────────────────────

interface ResourceUtilization {
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
}

interface PeakHour {
  hour_of_day: number;
  time_label: string;
  booking_count: number;
}

interface DepartmentStat {
  department_name: string;
  booking_count: number;
}

interface StatusStat {
  status: string;
  count: number;
}

interface AnalyticsTotals {
  total_resources: number;
  total_bookings_last_30d: number;
  confirmed_bookings: number;
  pending_requests: number;
}

interface AnalyticsData {
  totals: AnalyticsTotals;
  utilization: ResourceUtilization[];
  peak_hours: PeakHour[];
  underutilized: ResourceUtilization[];
  by_department: DepartmentStat[];
  by_status: StatusStat[];
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <Tr>
      {Array.from({ length: cols }).map((_, i) => (
        <Td key={i}>
          <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
        </Td>
      ))}
    </Tr>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="border border-slate-200 rounded-md p-4 bg-white animate-pulse">
      <div className="h-3 bg-slate-200 rounded w-2/3 mb-2" />
      <div className="h-6 bg-slate-200 rounded w-1/3" />
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-slate-200 rounded-md p-4 bg-white">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 font-mono">{value}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [threshold, setThreshold] = useState<number>(30);
  const [inputValue, setInputValue] = useState<string>("30");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (t: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?threshold=${t}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to load analytics");
        setData(null);
      } else {
        setData(json.data);
      }
    } catch {
      setError("Network error: could not reach analytics API");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when threshold changes (debounced 400ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(threshold);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [threshold, fetchData]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0 && v <= 100) {
      setThreshold(v);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Analytics &amp; Utilization
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational dashboards powered by{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">
              v_resource_utilization
            </code>{" "}
            and{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">
              v_peak_hours
            </code>
            .{" "}
            <span className="text-slate-400">
              Utilization assumes 30-day window, 10 operating hours/day (300
              hours capacity).
            </span>
          </p>
        </div>

        {/* Threshold control */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="threshold"
            className="text-xs text-slate-600 font-medium whitespace-nowrap"
          >
            Underutilization threshold (%)
          </label>
          <input
            id="threshold"
            type="number"
            min={0}
            max={100}
            step={1}
            value={inputValue}
            onChange={handleInputChange}
            className="w-20 border border-slate-300 rounded px-2 py-1 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="border border-rose-200 bg-rose-50 rounded-md px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Summary (last 30 days)
        </h2>
        {loading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SummaryCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Resources"
              value={data.totals.total_resources}
            />
            <SummaryCard
              label="Bookings (30d)"
              value={data.totals.total_bookings_last_30d}
            />
            <SummaryCard
              label="Confirmed Bookings"
              value={data.totals.confirmed_bookings}
            />
            <SummaryCard
              label="Pending Requests"
              value={data.totals.pending_requests}
            />
          </div>
        )}
      </section>

      {/* Utilization Table */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Resource Utilization
        </h2>
        <Table>
          <Thead>
            <Tr>
              <Th>Resource</Th>
              <Th>Type</Th>
              <Th>Department</Th>
              <Th>Capacity</Th>
              <Th>Status</Th>
              <Th className="text-right">Booked Hrs</Th>
              <Th className="text-right">Max Hrs</Th>
              <Th className="text-right">Utilization %</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading || !data ? (
              [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} cols={8} />)
            ) : data.utilization.length === 0 ? (
              <Tr>
                <Td colSpan={8} className="text-center text-slate-400 py-6">
                  No resources found.
                </Td>
              </Tr>
            ) : (
              data.utilization.map((r) => {
                const isLow = r.utilization_percentage < threshold;
                return (
                  <Tr key={r.resource_id}>
                    <Td>
                      <div className="font-medium text-slate-800">
                        {r.resource_name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {r.resource_code}
                      </div>
                    </Td>
                    <Td>{r.resource_type_name}</Td>
                    <Td>{r.department_name}</Td>
                    <Td className="font-mono">{r.capacity}</Td>
                    <Td>
                      <Badge status={r.status} />
                    </Td>
                    <Td className="text-right font-mono">
                      {Number(r.booked_hours_last_30_days).toFixed(1)}
                    </Td>
                    <Td className="text-right font-mono">
                      {Number(r.max_operating_hours_last_30_days).toFixed(0)}
                    </Td>
                    <Td className="text-right">
                      <span
                        className={`font-mono font-semibold ${
                          isLow
                            ? "text-amber-600 bg-amber-50 px-1 rounded"
                            : "text-slate-800"
                        }`}
                      >
                        {Number(r.utilization_percentage).toFixed(1)}%
                      </span>
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </section>

      {/* Peak Hours Bar Chart */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Peak Booking Hours
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Based on all-time confirmed bookings by start hour.
        </p>
        {loading || !data ? (
          <div className="h-48 bg-slate-100 rounded animate-pulse" />
        ) : (
          <div className="border border-slate-200 rounded-md p-4 bg-white">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.peak_hours}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="time_label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    color: "#1e293b",
                  }}
                  formatter={(value: number) => [value, "Bookings"]}
                />
                <Bar
                  dataKey="booking_count"
                  name="Bookings"
                  fill="#475569"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* By Department & By Status — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Department */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Bookings by Department
          </h2>
          <Table>
            <Thead>
              <Tr>
                <Th>Department</Th>
                <Th className="text-right">Bookings</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading || !data ? (
                [0, 1, 2].map((i) => <SkeletonRow key={i} cols={2} />)
              ) : data.by_department.length === 0 ? (
                <Tr>
                  <Td colSpan={2} className="text-center text-slate-400 py-4">
                    No data.
                  </Td>
                </Tr>
              ) : (
                data.by_department.map((row) => (
                  <Tr key={row.department_name}>
                    <Td>{row.department_name}</Td>
                    <Td className="text-right font-mono font-semibold">
                      {row.booking_count}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </section>

        {/* By Status */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Requests by Status
          </h2>
          <Table>
            <Thead>
              <Tr>
                <Th>Status</Th>
                <Th className="text-right">Count</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading || !data ? (
                [0, 1, 2].map((i) => <SkeletonRow key={i} cols={2} />)
              ) : data.by_status.length === 0 ? (
                <Tr>
                  <Td colSpan={2} className="text-center text-slate-400 py-4">
                    No data.
                  </Td>
                </Tr>
              ) : (
                data.by_status.map((row) => (
                  <Tr key={row.status}>
                    <Td>
                      <Badge status={row.status} />
                    </Td>
                    <Td className="text-right font-mono font-semibold">
                      {row.count}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </section>
      </div>

      {/* Underutilized Resources */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Underutilized Resources{" "}
          <span className="normal-case font-normal text-slate-400">
            (below {threshold}%)
          </span>
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 rounded animate-pulse"
              />
            ))}
          </div>
        ) : !data || data.underutilized.length === 0 ? (
          <div className="border border-slate-200 rounded-md px-4 py-6 text-center text-sm text-slate-400 bg-slate-50">
            {!data
              ? "No data available."
              : `All resources meet or exceed the ${threshold}% utilization threshold.`}
          </div>
        ) : (
          <div className="space-y-2">
            {data.underutilized.map((r) => (
              <div
                key={r.resource_id}
                className="flex items-center justify-between border border-amber-200 bg-amber-50 rounded-md px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium text-slate-800">
                    {r.resource_name}
                  </span>
                  <span className="ml-2 text-xs text-slate-500 font-mono">
                    {r.resource_code}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {r.department_name} &mdash; {r.resource_type_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={r.status} />
                  <span className="text-sm font-bold font-mono text-amber-700">
                    {Number(r.utilization_percentage).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
