"use client";

import React, { useEffect, useState } from "react";
import { Booking, Resource } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Calendar, Clock, AlertCircle, RefreshCw, XCircle } from "lucide-react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("CONFIRMED");
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
    // Fetch resources list for dropdown filter
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
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to reschedule booking");
      }

      setRescheduleBooking(null);
      loadBookings();
    } catch (err: any) {
      setRescheduleError(err.message);
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Confirmed Campus Bookings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational schedule of all confirmed room allocations and venue reservations.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Total Bookings: {bookings.length}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-3 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Resource:</span>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800"
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
            <span className="font-semibold text-slate-700">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs font-mono bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800"
            >
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ALL">All Records</option>
            </select>
          </div>
        </div>

        {(selectedResourceId || selectedDate || statusFilter !== "CONFIRMED") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedResourceId("");
              setSelectedDate("");
              setStatusFilter("CONFIRMED");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
            Querying confirmed allocations...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No bookings found for the selected criteria.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Event / Title</Th>
                <Th>Resource</Th>
                <Th>Location</Th>
                <Th>Faculty Holder</Th>
                <Th>Department</Th>
                <Th>Allocated Time Window</Th>
                <Th>Status</Th>
                <Th className="text-right">Manage</Th>
              </Tr>
            </Thead>
            <Tbody>
              {bookings.map((b) => (
                <Tr key={b.id}>
                  <Td className="font-mono text-xs text-slate-500">#{b.id}</Td>
                  <Td className="font-semibold text-xs text-slate-900">{b.title || "Reservation"}</Td>
                  <Td className="text-xs">
                    <span className="font-mono font-bold text-blue-700 block">{b.resource_code}</span>
                    <span className="text-[10px] text-slate-500">{b.resource_name}</span>
                  </Td>
                  <Td className="text-xs text-slate-600">{b.resource_location}</Td>
                  <Td className="text-xs">
                    <div>{b.faculty_name}</div>
                    <div className="text-[10px] text-slate-500">{b.faculty_email}</div>
                  </Td>
                  <Td className="text-xs text-slate-600">{b.department_name}</Td>
                  <Td className="text-xs font-mono text-slate-800">
                    <div>{b.start_time.replace("T", " ")}</div>
                    <div>{b.end_time.replace("T", " ")}</div>
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
                      <span className="text-xs text-slate-400 font-mono">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Reschedule Booking #{rescheduleBooking.id}</h3>
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Resource</span>
                <p className="font-mono bg-slate-50 p-2 border border-slate-200 rounded text-slate-800">
                  {rescheduleBooking.resource_code} — {rescheduleBooking.resource_name}
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Start Time</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
