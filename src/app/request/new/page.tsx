"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  X
} from "lucide-react";

export default function NewRequestPage() {
  const router = useRouter();

  const [types, setTypes] = useState<ResourceType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeId, setTypeId] = useState<string>("1");
  const [capacity, setCapacity] = useState<string>("40");
  const [date, setDate] = useState<string>("2026-11-20");
  const [startTime, setStartTime] = useState<string>("11:00");
  const [endTime, setEndTime] = useState<string>("13:00");
  const [selectedFacilities, setSelectedFacilities] = useState<Record<number, number>>({ 1: 1 }); // default 1 Projector

  // Recommendations state
  const [recommendations, setRecommendations] = useState<RecommendedResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/metadata")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setTypes(json.data.resource_types || []);
          setFacilities(json.data.facilities || []);
          if (json.data.resource_types?.length > 0) {
            setTypeId(json.data.resource_types[0].id.toString());
          }
        }
        setLoadingMeta(false);
      });
  }, []);

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
          expected_capacity: parseInt(capacity),
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
      setError("Please provide an event title");
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
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type_id: parseInt(typeId),
          preferred_resource_id: selectedResourceId,
          title,
          description,
          start_time: fullStart,
          end_time: fullEnd,
          expected_capacity: parseInt(capacity),
          required_facilities: facilityPayload,
        }),
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Resource Request & Allocation Wizard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Specify room requirements, evaluate explainable ranked candidate recommendations, and submit your reservation request.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Left Column Form, Right Column Ranked Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Request Specifications (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            1. Request Requirements
          </h2>

          <Input
            label="Event / Lecture Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CS402 Computer Networks Practical Exam"
          />

          <Textarea
            label="Event Description / Purpose"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief explanation of session agenda or equipment requirements..."
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Resource Type"
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
              label="Expected Seats"
              type="number"
              min="1"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Date & Operating Window (07:00 - 20:00)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="col-span-1 text-xs font-mono border border-slate-300 rounded px-2 py-1.5"
              />
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="col-span-1 text-xs font-mono border border-slate-300 rounded px-2 py-1.5"
              />
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="col-span-1 text-xs font-mono border border-slate-300 rounded px-2 py-1.5"
              />
            </div>
          </div>

          {/* Required Facilities Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Required Physical Amenities
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {facilities.map((fac) => {
                const isChecked = selectedFacilities[fac.id] !== undefined;
                return (
                  <div
                    key={fac.id}
                    className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                      isChecked
                        ? "bg-blue-50/50 border-blue-200 text-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleFacilityToggle(fac.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span className="font-medium">{fac.name}</span>
                    </label>

                    {isChecked && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Min Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={selectedFacilities[fac.id]}
                          onChange={(e) => handleFacilityQtyChange(fac.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center text-xs font-mono border border-slate-300 rounded py-0.5"
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
            <span>Search & Compute Recommendations</span>
          </Button>
        </div>

        {/* Right Column: Explainable Ranked Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">2. Ranked Recommendations</h2>
                <p className="text-[11px] text-slate-500">
                  Computed via PostgreSQL function <code className="bg-slate-100 px-1 py-0.5 rounded">fn_recommend_resources</code>
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Weights: Cap 30% | Fac 30% | Avail 25% | Type 10% | Loc 5%
              </span>
            </div>

            {loadingRecs ? (
              <div className="p-12 text-center text-xs text-slate-500 font-mono animate-pulse">
                Evaluating candidate capacities, checking GiST availability locks, and scoring amenities...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Click &ldquo;Search &amp; Compute Recommendations&rdquo; to evaluate candidate rooms and view transparent component scores.
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
                          ? "border-blue-600 bg-blue-50/20 ring-1 ring-blue-600"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      {/* Top Row: Rank, Code, Total Score */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                            index === 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-700">{rec.resource_code}</span>
                              <span className="font-semibold text-xs text-slate-900">{rec.resource_name}</span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {rec.location} • {rec.department_name}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold font-mono text-slate-900">
                            {rec.total_score.toFixed(1)}%
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">Total Score</span>
                        </div>
                      </div>

                      {/* Score Breakdown Bars */}
                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-2">
                        <ScoreBar label="Capacity Fit" score={rec.capacity_score} weight="30%" />
                        <ScoreBar label="Facilities Match" score={rec.facilities_score} weight="30%" />
                        <ScoreBar label="Availability" score={rec.availability_score} weight="25%" />
                        <ScoreBar label="Type Fit" score={rec.type_score} weight="10%" />
                      </div>

                      {/* Required vs Available Facility Quantities */}
                      {rec.facility_breakdown && rec.facility_breakdown.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                            Facility Compliance:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.facility_breakdown.map((fac) => (
                              <span
                                key={fac.facility_id}
                                className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  fac.satisfied
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-rose-50 text-rose-800 border-rose-200"
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
                    <span>Confirm Selection &amp; Submit Request</span>
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
