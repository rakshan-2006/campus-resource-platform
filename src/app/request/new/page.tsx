"use client";

import { campusDate } from "@/lib/campus-time";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ResourceType, Facility, RecommendedResource } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  MapPin, 
  Calendar,
  Check,
  X,
  ShieldCheck,
  Users,
  Clock,
  ArrowLeft
} from "lucide-react";

export default function NewRequestPage() {
  const router = useRouter();

  const [types, setTypes] = useState<ResourceType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeId, setTypeId] = useState<string>("1");
  const [capacity, setCapacity] = useState<string>("40");
  const [date, setDate] = useState(campusDate);
  const [startTime, setStartTime] = useState<string>("11:00");
  const [endTime, setEndTime] = useState<string>("13:00");
  const [selectedFacilities, setSelectedFacilities] = useState<Record<number, number>>({ 1: 1 }); // default 1 Projector

  // Club-specific inputs
  const [eventType, setEventType] = useState<string>("Workshop");
  const [expectedGuests, setExpectedGuests] = useState<string>("0");
  const [equipmentNotes, setEquipmentNotes] = useState<string>("");

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendedResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/metadata").then((res) => res.json()),
      fetch("/api/dashboard").then((res) => res.json()),
    ])
      .then(([metaJson, dashJson]) => {
        if (metaJson.data) {
          setTypes(metaJson.data.resource_types || []);
          setFacilities(metaJson.data.facilities || []);
          if (metaJson.data.resource_types?.length > 0) {
            setTypeId(metaJson.data.resource_types[0].id.toString());
          }
        }
        if (dashJson.data) {
          setUserProfile(dashJson.data);
        }
        setLoadingMeta(false);
      })
      .catch((err) => {
        setError("Failed to load initial metadata: " + err.message);
        setLoadingMeta(false);
      });
  }, []);

  const isClub = userProfile?.role === "CLUB";
  const clubVerificationStatus = userProfile?.club?.verification_status || userProfile?.verification_status;
  const isClubVerified = clubVerificationStatus === "APPROVED";
  const isAdvisorAccepted = userProfile?.club?.advisor_status === "ACCEPTED";
  const canClubSubmit = !isClub || (isClubVerified && isAdvisorAccepted);

  const handleFacilityToggle = (facId: number) => {
    setSelectedFacilities((prev) => {
      const next = { ...prev };
      if (next[facId] !== undefined) {
        delete next[facId];
      } else {
        next[facId] = 1;
      }
      return next;
    });
  };

  const handleFacilityQtyChange = (facId: number, qty: number) => {
    if (qty < 1) return;
    setSelectedFacilities((prev) => ({
      ...prev,
      [facId]: qty,
    }));
  };

  const handleComputeRecommendations = async () => {
    setError(null);
    setLoadingRecs(true);
    setRecommendations([]);

    const fullStart = `${date} ${startTime}`;
    const fullEnd = `${date} ${endTime}`;

    const facilityPayload = Object.entries(selectedFacilities).map(([facId, qty]) => ({
      facility_id: parseInt(facId),
      min_quantity: qty,
    }));

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type_id: parseInt(typeId),
          expected_capacity: parseInt(capacity) + (isClub ? parseInt(expectedGuests) || 0 : 0),
          start_time: fullStart,
          end_time: fullEnd,
          required_facilities: facilityPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to calculate recommendations");
      }

      setRecommendations(json.data || []);
      if (json.data && json.data.length > 0) {
        setSelectedResourceId(json.data[0].resource_id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide an event or request title");
      return;
    }

    setSubmitting(true);
    setError(null);

    const fullStart = `${date} ${startTime}`;
    const fullEnd = `${date} ${endTime}`;

    const facilityPayload = Object.entries(selectedFacilities).map(([facId, qty]) => ({
      facility_id: parseInt(facId),
      min_quantity: qty,
    }));

    try {
      const payload: any = {
        resource_type_id: parseInt(typeId),
        preferred_resource_id: selectedResourceId,
        title: title.trim(),
        description: description.trim() || null,
        start_time: fullStart,
        end_time: fullEnd,
        expected_capacity: parseInt(capacity),
        required_facilities: facilityPayload,
      };

      if (isClub) {
        payload.event_type = eventType;
        payload.expected_guests = parseInt(expectedGuests) || 0;
        payload.equipment_notes = equipmentNotes.trim() || null;
      }

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to submit request");
      }

      router.push("/requests");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-xs text-muted-foreground font-mono animate-pulse">Loading form details...</span>
      </div>
    );
  }

  // Blocking view for unverified clubs or clubs without accepted advisors
  if (isClub && !canClubSubmit) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Venue Request Submission Not Available</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Before submitting campus event requests, your club registration must be approved by campus administration and your nominated faculty advisor must accept the mentorship appointment.
            </p>
          </div>

          <div className="bg-background rounded-md p-4 text-left text-xs border border-border space-y-2 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Administrative Verification:</span>
              <Badge variant={clubVerificationStatus || "PENDING"}>
                {clubVerificationStatus === "APPROVED" ? "Verified" : clubVerificationStatus || "PENDING"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Faculty Advisor Acceptance:</span>
              <Badge variant={userProfile?.club?.advisor_status || "PENDING"}>
                {userProfile?.club?.advisor_status === "ACCEPTED" ? "Accepted" : userProfile?.club?.advisor_status || "Awaiting Acceptance"}
              </Badge>
            </div>
            {userProfile?.club?.advisor_name && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border">
                Nominated Advisor: <strong className="text-foreground">{userProfile.club.advisor_name}</strong> ({userProfile.club.advisor_email})
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link href="/dashboard">
              <Button size="sm" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isClub ? "New Student Club Event Request" : "Resource Request & Allocation Wizard"}
          </h1>
          {isClub && (
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-900 border border-blue-300 px-3 py-0.5 text-xs font-bold">
              {userProfile?.club?.club_name || "Club Event"}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-1">
          {isClub
            ? "Submit your proposed club activity and venue preferences. Your faculty advisor will review and endorse the event before administrative room scheduling."
            : "Specify venue requirements, evaluate ranked candidate rooms, and submit your reservation request."}
        </p>
      </div>

      {/* Club Advisor Routing Information Callout */}
      {isClub && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-xs text-slate-900 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-blue-950 text-sm">
              Multi-Stage Faculty Advisor Review Workflow
            </div>
            <p className="text-slate-800 text-xs leading-relaxed font-normal">
              Upon submission, this event proposal will be placed into the review inbox of your faculty advisor{userProfile?.club?.advisor_name ? (
                <>
                  , <strong className="text-slate-950 font-bold">{userProfile.club.advisor_name}</strong>
                </>
              ) : ""}. After faculty endorsement, campus administration will verify venue availability and confirm the booking.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Left Column Form, Right Column Ranked Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Request Specifications (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            1. Event Specifications
          </h2>

          <Input
            label={isClub ? "Event / Activity Title" : "Event / Lecture Title"}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isClub ? "e.g. Annual Autonomous Robotics Hackathon" : "e.g. CS402 Computer Networks Practical Exam"}
          />

          {/* Club-specific Event Type */}
          {isClub && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Event Category / Type <span className="text-red-500">*</span>
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full text-xs rounded-md border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Workshop">Technical Workshop / Training</option>
                <option value="Hackathon">Hackathon / Coding Competition</option>
                <option value="Guest Lecture">Guest Lecture / Seminar</option>
                <option value="Cultural">Cultural Performance / Social</option>
                <option value="Competition">Project Exhibition / Competition</option>
                <option value="General Body Meeting">General Body Meeting</option>
                <option value="Other">Other Club Activity</option>
              </select>
            </div>
          )}

          <Textarea
            label={isClub ? "Purpose & Description" : "Event Description / Purpose"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief explanation of event agenda, target audience, and campus activity..."
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Preferred Venue Type"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>

            <Input
              label={isClub ? "Expected Students" : "Expected Seats"}
              type="number"
              min="1"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          {/* Club-specific external guests and equipment notes */}
          {isClub && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="External Guests (Non-students)"
                type="number"
                min="0"
                value={expectedGuests}
                onChange={(e) => setExpectedGuests(e.target.value)}
                placeholder="0"
              />
              <div className="space-y-1 sm:col-span-1">
                <Input
                  label="Logistics & Equipment"
                  value={equipmentNotes}
                  onChange={(e) => setEquipmentNotes(e.target.value)}
                  placeholder="e.g. Mic, audio cable, tables"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date & Operating Window (07:00 - 20:00)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="col-span-1 text-xs font-mono border border-input rounded-md px-2 py-1.5 bg-background text-foreground"
              />
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="col-span-1 text-xs font-mono border border-input rounded-md px-2 py-1.5 bg-background text-foreground"
              />
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="col-span-1 text-xs font-mono border border-input rounded-md px-2 py-1.5 bg-background text-foreground"
              />
            </div>
          </div>

          {/* Required Facilities Checklist */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Required Facilities & Amenities
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {facilities.map((fac) => {
                const isChecked = selectedFacilities[fac.id] !== undefined;
                return (
                  <div
                    key={fac.id}
                    className={`flex items-center justify-between p-2 rounded-md border text-xs transition-colors ${
                      isChecked
                        ? "bg-blue-50/60 border-blue-200 text-foreground dark:bg-blue-950/30 dark:border-blue-900"
                        : "bg-background border-input text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleFacilityToggle(fac.id)}
                        className="rounded text-primary focus:ring-ring h-3.5 w-3.5"
                      />
                      <span className="font-medium text-foreground">{fac.name}</span>
                    </label>

                    {isChecked && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Min Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={selectedFacilities[fac.id]}
                          onChange={(e) => handleFacilityQtyChange(fac.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center text-xs font-mono border border-input rounded py-0.5 bg-background text-foreground"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            onClick={handleComputeRecommendations}
            className="w-full gap-2 mt-2"
            isLoading={loadingRecs}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Search & Recommend Venues</span>
          </Button>
        </div>

        {/* Right Column: Ranked Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">2. Ranked Venue Recommendations</h2>
                <p className="text-[11px] text-slate-500">
                  Evaluated using transparent capacity scoring, amenity compliance, and schedule availability.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                Cap 30% · Fac 30% · Avail 25% · Type 10%
              </span>
            </div>

            {loadingRecs ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono animate-pulse">
                Evaluating candidate capacities, checking schedule availability, and scoring amenities...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                Click &ldquo;Search &amp; Recommend Venues&rdquo; to evaluate candidate rooms and view transparent suitability scores.
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, index) => {
                  const isSelected = selectedResourceId === rec.resource_id;

                  return (
                    <div
                      key={rec.resource_id}
                      onClick={() => setSelectedResourceId(rec.resource_id)}
                      className={`p-4 border rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-border/80 bg-background"
                      }`}
                    >
                      {/* Top Row: Rank, Code, Total Score */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                            index === 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-primary">{rec.resource_code}</span>
                              <span className="font-semibold text-xs text-foreground">{rec.resource_name}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {rec.location} • {rec.department_name}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold font-mono text-foreground">
                            {(Number(rec.total_score) || 0).toFixed(1)}%
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">Match Score</span>
                        </div>
                      </div>

                      {/* Score Breakdown Bars */}
                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-x-4 gap-y-2">
                        <ScoreBar label="Capacity Fit" score={Number(rec.capacity_score) || 0} weight="30%" />
                        <ScoreBar label="Facilities Match" score={Number(rec.facilities_score) || 0} weight="30%" />
                        <ScoreBar label="Availability" score={Number(rec.availability_score) || 0} weight="25%" />
                        <ScoreBar label="Type Fit" score={Number(rec.type_score) || 0} weight="10%" />
                      </div>

                      {/* Required vs Available Facility Quantities */}
                      {rec.facility_breakdown && rec.facility_breakdown.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                            Facility Compliance:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.facility_breakdown.map((fac) => (
                              <span
                                key={fac.facility_id}
                                className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  fac.satisfied
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                                    : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                                }`}
                              >
                                {fac.satisfied ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <X className="w-3 h-3 text-rose-600" />
                                )}
                                <span>{fac.facility_name}: req {fac.required_qty} / has {fac.available_qty}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Final Submission Button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleSubmitRequest}
                    className="w-full gap-2"
                    size="lg"
                    isLoading={submitting}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Confirm Selection &amp; Submit Event Proposal</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
