"use client";

import { campusDate } from "@/lib/campus-time";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timeline, TimelineSlot } from "@/components/ui/timeline";
import { 
  Building2, 
  Layers, 
  MapPin, 
  Users, 
  Calendar, 
  ArrowLeft, 
  Cpu, 
  HardDrive, 
  Check, 
  Info,
  Clock
} from "lucide-react";

export default function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const resourceId = resolvedParams.id;

  const [resource, setResource] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(campusDate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/resources/${resourceId}`).then((res) => {
        if (!res.ok) throw new Error("Failed to load resource data");
        return res.json();
      }),
      fetch(`/api/bookings?view=schedule&resource_id=${resourceId}&start_date=${selectedDate}&end_date=${selectedDate}`).then((res) => res.json()),
    ])
      .then(([resJson, bookJson]) => {
        setResource(resJson.data);
        setBookings(bookJson.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [resourceId, selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-xs text-slate-500 font-mono animate-pulse">Loading dual-store resource specifications...</span>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-700">
        Error loading resource details: {error || "Not found"}
      </div>
    );
  }

  // Convert bookings to timeline slots
  const timelineSlots: TimelineSlot[] = bookings.map((b) => ({
    id: b.id,
    title: b.title || "Confirmed Booking",
    startTime: b.start_time,
    endTime: b.end_time,
    status: b.status,
    subtitle: b.faculty_name,
  }));

  const profile = resource.profile;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <Link href="/resources" className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/request/new">
            <Button size="sm">Request This Room</Button>
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {resource.code}
              </span>
              <Badge status={resource.status} />
              <span className="text-xs text-slate-500 font-mono">ID #{resource.id}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{resource.name}</h1>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{resource.department_name}</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{resource.location}</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono font-semibold">{resource.capacity} seats</span>
              </span>
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Category Classification</span>
            <span className="text-sm font-bold text-slate-800">{resource.resource_type_name}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Authoritative Relational Amenities (PostgreSQL) */}
      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Relational Facilities & Inventory</h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Source of Truth: PostgreSQL</span>
        </div>

        {resource.facilities && resource.facilities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {resource.facilities.map((fac: any) => (
              <div key={fac.facility_id} className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">{fac.facility_name}</span>
                  <span className="text-[10px] font-mono text-slate-500">{fac.facility_code}</span>
                </div>
                <span className="text-sm font-mono font-bold text-blue-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {fac.quantity}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-2">No fixed facilities recorded in PostgreSQL.</p>
        )}
      </div>

      {/* SECTION 2: MongoDB Extended Specifications Profile */}
      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">Extended Specifications Profile</h2>
          </div>
          <span className="text-[10px] font-mono text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Store: MongoDB (campus_resource_profiles)
          </span>
        </div>

        {!profile || !profile.specifications ? (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded text-center">
            <Info className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600">No extended specifications recorded</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Extended hardware/software details have not been registered for this resource profile.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct specs key-value display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {Object.entries(profile.specifications).map(([key, value]) => {
                if (key === "software" || typeof value === "object") return null;
                return (
                  <div key={key} className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-slate-900 font-medium">{String(value)}</span>
                  </div>
                );
              })}
            </div>

            {/* Software list if available */}
            {profile.specifications.software && Array.isArray(profile.specifications.software) && (
              <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-md">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5 mb-2">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Installed Software Stack ({profile.specifications.software.length} packages)</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.specifications.software.map((sw: string) => (
                    <span
                      key={sw}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-purple-200 rounded text-[11px] font-mono text-purple-800"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{sw}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nested stage or acoustics details */}
            {profile.specifications.stage && typeof profile.specifications.stage === "object" && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-xs font-bold text-slate-900 block mb-2">Stage & Theatrical Attributes</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.entries(profile.specifications.stage).map(([k, v]) => (
                    <div key={k} className="p-2 bg-white border border-slate-200 rounded">
                      <span className="text-[10px] text-slate-500 uppercase block">{k.replace(/_/g, " ")}</span>
                      <span className="font-mono font-medium text-slate-800">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accessibility Features */}
            {profile.specifications.accessibility_features && Array.isArray(profile.specifications.accessibility_features) && (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-md text-xs">
                <span className="font-bold text-emerald-900 block mb-1.5">Accessibility & Inclusivity Features</span>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {profile.specifications.accessibility_features.map((feat: string, idx: number) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-[10px] text-slate-400 font-mono text-right">
              Last synced: {profile.updated_at}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: 07:00-20:00 Availability Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">Day Schedule (07:00 - 20:00)</h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-mono border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
            />
          </div>
        </div>

        <Timeline date={selectedDate} slots={timelineSlots} />
      </div>
    </div>
  );
}
