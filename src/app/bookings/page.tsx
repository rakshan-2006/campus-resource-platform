"use client";

import React, { useEffect, useState } from "react";
import { Booking, Resource } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCampusDateTime, formatCampusDate, formatCampusTime } from "@/lib/format";
import { Calendar, Clock, AlertCircle, RefreshCw, XCircle, Search, Filter } from "lucide-react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("CONFIRMED");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule Modal State
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const loadBookings = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedResourceId) params.set("resource_id", selectedResourceId);
    if (selectedDate) {
      params.set("start_date", selectedDate);
      params.set("end_date", selectedDate);
    }
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/bookings?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load bookings");
        return res.json();
      })
      .then((json) => {
        setBookings(json.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetch("/api/resources")
      .then((res) => res.json())
      .then((json) => setResources(json.data || []));

    loadBookings();
  }, [selectedResourceId, selectedDate, statusFilter]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this confirmed booking?")) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to cancel booking");

      loadBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openRescheduleModal = (booking: Booking) => {
    setRescheduleBooking(booking);
    const startParts = booking.start_time.split(" ");
    const endParts = booking.end_time.split(" ");
    setNewDate(startParts[0]);
    setNewStartTime(startParts[1]?.slice(0, 5) || "09:00");
    setNewEndTime(endParts[1]?.slice(0, 5) || "11:00");
    setRescheduleError(null);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    setRescheduling(true);
    setRescheduleError(null);

    const fullStart = `${newDate} ${newStartTime}`;
    const fullEnd = `${newDate} ${newEndTime}`;

    try {
      const res = await fetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_start_time: fullStart,
          new_end_time: fullEnd,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Rescheduling failed");

      setRescheduleBooking(null);
      loadBookings();
    } catch (err: any) {
      setRescheduleError(err.message);
    } finally {
      setRescheduling(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.resource_code && b.resource_code.toLowerCase().includes(q)) ||
      (b.resource_name && b.resource_name.toLowerCase().includes(q)) ||
      (b.faculty_name && b.faculty_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Confirmed Bookings Ledger</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Institutional master schedule of confirmed room allocations and authorized campus reservations.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search event, venue, or host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Venue:</span>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Campus Resources</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-xs font-mono bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ALL">All Records</option>
            </select>
          </div>
        </div>

        {(selectedResourceId || selectedDate || statusFilter !== "CONFIRMED" || searchQuery) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedResourceId("");
              setSelectedDate("");
              setStatusFilter("CONFIRMED");
              setSearchQuery("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-mono animate-pulse">
            Querying confirmed allocations...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No bookings found for the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Event / Title</Th>
                  <Th>Resource</Th>
                  <Th>Location</Th>
                  <Th>Applicant / Host</Th>
                  <Th>Department</Th>
                  <Th>Allocated Time Window</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Manage</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredBookings.map((b) => (
                  <Tr key={b.id}>
                    <Td className="font-mono text-xs text-muted-foreground">#{b.id}</Td>
                    <Td className="font-semibold text-xs text-foreground">{b.title || "Reservation"}</Td>
                    <Td className="text-xs">
                      <span className="font-mono font-bold text-primary block">{b.resource_code}</span>
                      <span className="text-[10px] text-muted-foreground">{b.resource_name}</span>
                    </Td>
                    <Td className="text-xs text-muted-foreground">{b.resource_location}</Td>
                    <Td className="text-xs">
                      <div className="font-medium text-foreground">{b.faculty_name}</div>
                      <div className="text-[10px] text-muted-foreground">{b.faculty_email}</div>
                    </Td>
                    <Td className="text-xs text-muted-foreground">{b.department_name}</Td>
                    <Td className="text-xs text-muted-foreground">
                      <div>{formatCampusDate(b.start_time)}</div>
                      <div className="text-[11px] font-mono">{formatCampusTime(b.start_time)} – {formatCampusTime(b.end_time)}</div>
                    </Td>
                    <Td>
                      <Badge status={b.status} className="text-[10px] py-0 px-1.5" />
                    </Td>
                    <Td className="text-right">
                      {b.status === "CONFIRMED" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs py-0.5 px-2 gap-1"
                            onClick={() => openRescheduleModal(b)}
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Reschedule</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="text-xs py-0.5 px-2 gap-1"
                            onClick={() => handleCancelBooking(b.id)}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Cancel</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reschedule Booking #{rescheduleBooking.id}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rescheduleBooking.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-800 block mb-1">Resource</span>
                <p className="font-mono bg-slate-50 p-2.5 border border-slate-200 rounded-lg text-slate-900 font-semibold">
                  {rescheduleBooking.resource_code} — {rescheduleBooking.resource_name}
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">New Start Time</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">New End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => setRescheduleBooking(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={rescheduling}>
                  Save New Time Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
