"use client";

import React, { useEffect, useState } from "react";
import { Resource, Booking } from "@/types";
import { Timeline, TimelineSlot } from "@/components/ui/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Building2, Filter } from "lucide-react";

export default function CampusTimelinePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-20");
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/resources").then((res) => res.json()),
      fetch(`/api/bookings?start_date=${selectedDate}&end_date=${selectedDate}&status=CONFIRMED`).then((res) => res.json()),
    ])
      .then(([resJson, bookJson]) => {
        setResources(resJson.data || []);
        setBookings(bookJson.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedDate]);

  const filteredResources = resources.filter((r) => {
    if (!selectedType) return true;
    return r.resource_type_id.toString() === selectedType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Campus Schedule Timeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time 07:00 to 20:00 schedule visualizer across all campus facilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-3 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Filter Category:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800"
          >
            <option value="">All Categories</option>
            <option value="1">Classrooms</option>
            <option value="2">Computer Laboratories</option>
            <option value="3">Seminar Halls</option>
            <option value="4">Conference Rooms</option>
            <option value="5">Auditoriums</option>
          </select>
        </div>
        <span className="text-slate-500 font-mono">Showing {filteredResources.length} venues</span>
      </div>

      {/* Resource Timelines */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-mono animate-pulse">
          Loading campus schedule grid...
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-md">
          No resources found for the selected category.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResources.map((res) => {
            // Find bookings for this resource on the selected date
            const resBookings = bookings.filter((b) => b.resource_id === res.id);
            const slots: TimelineSlot[] = resBookings.map((b) => ({
              id: b.id,
              title: b.title || "Reservation",
              startTime: b.start_time,
              endTime: b.end_time,
              status: b.status,
              subtitle: b.faculty_name,
            }));

            return (
              <div key={res.id} className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {res.code}
                    </span>
                    <span className="font-semibold text-xs text-slate-900">{res.name}</span>
                    <span className="text-[11px] text-slate-500">({res.location} • {res.capacity} seats)</span>
                  </div>
                  <Badge status={res.status} className="text-[10px] py-0 px-1" />
                </div>

                <Timeline date={selectedDate} slots={slots} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
