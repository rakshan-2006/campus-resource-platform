"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@/components/ui/table";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MaintenanceRecord {
  id: number;
  resource_id: number;
  resource_name: string;
  resource_code: string;
  resource_status: string;
  scheduled_by_user_id: number;
  scheduler_name: string;
  start_time: string;
  end_time: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  reason: string;
  notes: string | null;
  created_at: string;
}

interface Resource {
  id: number;
  code: string;
  name: string;
  status: string;
}

interface AffectedBooking {
  id: number;
  resource_name: string;
  resource_code: string;
  start_time: string;
  end_time: string;
  status: string;
  faculty_id: number | null;
  faculty_name: string | null;
}

type Tab = "active" | "history";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDT(dt: string) {
  if (!dt) return "—";
  return dt.replace("T", " ").slice(0, 16);
}

function canStart(status: string) {
  return status === "SCHEDULED";
}
function canComplete(status: string) {
  return status === "IN_PROGRESS";
}
function canCancel(status: string) {
  return status === "SCHEDULED" || status === "IN_PROGRESS";
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <Tr key={i}>
          {[...Array(cols)].map((__, j) => (
            <Td key={j}>
              <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
            </Td>
          ))}
        </Tr>
      ))}
    </>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmClass = "",
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={confirmClass}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

interface ScheduleModalProps {
  open: boolean;
  resources: Resource[];
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  resource_id: string;
  start_time: string;
  end_time: string;
  reason: string;
  notes: string;
}

function ScheduleModal({ open, resources, onClose, onCreated }: ScheduleModalProps) {
  const [form, setForm] = useState<FormState>({
    resource_id: "",
    start_time: "",
    end_time: "",
    reason: "",
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    affected_bookings: AffectedBooking[];
    count: number;
  } | null>(null);
  const [previewMaintId, setPreviewMaintId] = useState<number | null>(null);

  const reset = useCallback(() => {
    setForm({ resource_id: "", start_time: "", end_time: "", reason: "", notes: "" });
    setFieldErrors({});
    setSubmitError(null);
    setPreviewData(null);
    setPreviewMaintId(null);
    setSubmitting(false);
    setPreviewLoading(false);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  function validate(): boolean {
    const errs: Partial<FormState> = {};
    if (!form.resource_id) errs.resource_id = "Required";
    if (!form.start_time) errs.start_time = "Required";
    if (!form.end_time) errs.end_time = "Required";
    if (!form.reason.trim()) errs.reason = "Required";
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      errs.end_time = "Must be after start time";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function toApiDT(v: string) {
    return v.replace("T", " ");
  }

  async function handleScheduleAndPreview() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    setPreviewData(null);

    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_id: parseInt(form.resource_id),
          start_time: toApiDT(form.start_time),
          end_time: toApiDT(form.end_time),
          reason: form.reason,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? "Failed to schedule maintenance");
        setSubmitting(false);
        return;
      }

      const maintId: number = json.data.id;
      setPreviewMaintId(maintId);
      onCreated();

      setPreviewLoading(true);
      const prevRes = await fetch(`/api/admin/maintenance/${maintId}/booking-preview`);
      const prevJson = await prevRes.json();
      if (prevRes.ok) {
        setPreviewData(prevJson.data);
      }
      setPreviewLoading(false);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const hasPreview = previewData !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Schedule Maintenance</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <Select
            label="Resource"
            name="resource_id"
            required
            value={form.resource_id}
            onChange={(e) => setForm((f) => ({ ...f, resource_id: e.target.value }))}
            error={fieldErrors.resource_id}
            disabled={hasPreview}
          >
            <option value="">Select resource…</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="datetime-local"
              required
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              error={fieldErrors.start_time}
              disabled={hasPreview}
            />
            <Input
              label="End Time"
              type="datetime-local"
              required
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              error={fieldErrors.end_time}
              disabled={hasPreview}
            />
          </div>

          <Input
            label="Reason"
            required
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            error={fieldErrors.reason}
            maxLength={255}
            placeholder="Brief reason for maintenance"
            disabled={hasPreview}
          />

          <Textarea
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Additional details…"
            disabled={hasPreview}
          />

          {submitError && (
            <p className="text-xs text-red-600 font-medium border border-red-200 bg-red-50 rounded px-3 py-2">
              {submitError}
            </p>
          )}

          {previewLoading && (
            <p className="text-xs text-slate-500 italic">Checking affected bookings…</p>
          )}

          {hasPreview && previewData.count === 0 && (
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              No confirmed bookings are affected by this maintenance window. Maintenance has been scheduled.
            </div>
          )}

          {hasPreview && previewData.count > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
              <p className="text-xs font-semibold text-amber-800">
                Warning: {previewData.count} confirmed booking{previewData.count > 1 ? "s" : ""} overlap
                this window. These bookings will NOT be cancelled automatically.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-amber-200">
                      <th className="text-left py-1 pr-3 font-semibold text-amber-700">Booking #</th>
                      <th className="text-left py-1 pr-3 font-semibold text-amber-700">Start</th>
                      <th className="text-left py-1 pr-3 font-semibold text-amber-700">End</th>
                      <th className="text-left py-1 font-semibold text-amber-700">Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.affected_bookings.map((b) => (
                      <tr key={b.id} className="border-b border-amber-100">
                        <td className="py-1 pr-3 font-mono text-amber-900">#{b.id}</td>
                        <td className="py-1 pr-3 text-amber-900">{fmtDT(b.start_time)}</td>
                        <td className="py-1 pr-3 text-amber-900">{fmtDT(b.end_time)}</td>
                        <td className="py-1 text-amber-900">{b.faculty_name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-amber-700">
                Maintenance has been scheduled. Review and handle affected bookings manually.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            {hasPreview ? "Close" : "Cancel"}
          </Button>
          {!hasPreview && (
            <Button size="sm" onClick={handleScheduleAndPreview} disabled={submitting}>
              {submitting ? "Scheduling…" : "Schedule & Preview"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [tab, setTab] = useState<Tab>("active");
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filterResource, setFilterResource] = useState<string>("");
  const [showSchedule, setShowSchedule] = useState(false);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    label: string;
    cls?: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", message: "", label: "", action: async () => {} });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/resources");
      if (res.ok) {
        const json = await res.json();
        setResources(json.data ?? []);
      }
    } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterResource) params.set("resource_id", filterResource);

      const res = await fetch(`/api/admin/maintenance?${params}`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Failed to load maintenance records");
        setRecords([]);
      } else {
        const json = await res.json();
        setRecords(json.data ?? []);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filterResource]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const activeStatuses = new Set(["SCHEDULED", "IN_PROGRESS"]);
  const historyStatuses = new Set(["COMPLETED", "CANCELLED"]);

  const displayedRecords = records.filter((r) =>
    tab === "active" ? activeStatuses.has(r.status) : historyStatuses.has(r.status)
  );

  async function patchStatus(id: number, status: string) {
    const res = await fetch(`/api/admin/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message ?? "Action failed");
    }
    return json.data as MaintenanceRecord;
  }

  function openConfirm(opts: {
    title: string;
    message: string;
    label: string;
    cls?: string;
    action: () => Promise<void>;
  }) {
    setActionError(null);
    setConfirm({ open: true, ...opts });
  }

  async function runConfirm() {
    setActionLoading(true);
    setActionError(null);
    try {
      await confirm.action();
      setConfirm((c) => ({ ...c, open: false }));
      await fetchRecords();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  function handleStart(row: MaintenanceRecord) {
    openConfirm({
      title: "Start Maintenance",
      message: `Start maintenance on "${row.resource_name}"? The resource will be marked as MAINTENANCE.`,
      label: "Start",
      action: async () => { await patchStatus(row.id, "IN_PROGRESS"); },
    });
  }

  function handleComplete(row: MaintenanceRecord) {
    openConfirm({
      title: "Complete Maintenance",
      message: `Mark maintenance on "${row.resource_name}" as completed? The resource will return to AVAILABLE.`,
      label: "Complete",
      action: async () => { await patchStatus(row.id, "COMPLETED"); },
    });
  }

  function handleCancel(row: MaintenanceRecord) {
    openConfirm({
      title: "Cancel Maintenance",
      message: `Cancel this maintenance window for "${row.resource_name}"? This cannot be undone.`,
      label: "Cancel Maintenance",
      cls: "bg-rose-600 hover:bg-rose-700 text-white",
      action: async () => { await patchStatus(row.id, "CANCELLED"); },
    });
  }

  const colCount = tab === "active" ? 8 : 7;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Maintenance</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Schedule and manage resource maintenance windows.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowSchedule(true)}>
            Schedule Maintenance
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {(["active", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "active" ? "Active" : "History"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="w-64">
            <Select
              name="filter_resource"
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
            >
              <option value="">All Resources</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </Select>
          </div>
          {filterResource && (
            <Button variant="outline" size="sm" onClick={() => setFilterResource("")}>
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <Table>
          <Thead>
            <Tr>
              <Th>#</Th>
              <Th>Resource</Th>
              <Th>Status</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>Reason</Th>
              <Th>Scheduled By</Th>
              {tab === "active" && <Th>Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <TableSkeleton cols={colCount} />
            ) : error ? (
              <Tr>
                <Td colSpan={colCount} className="text-center py-8 text-xs text-red-600">
                  {error}
                </Td>
              </Tr>
            ) : displayedRecords.length === 0 ? (
              <Tr>
                <Td colSpan={colCount} className="text-center py-8 text-xs text-slate-500">
                  {tab === "active"
                    ? "No active maintenance windows."
                    : "No maintenance history."}
                </Td>
              </Tr>
            ) : (
              displayedRecords.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-mono text-xs text-slate-500">#{row.id}</Td>
                  <Td>
                    <div className="font-medium text-slate-900 text-xs">{row.resource_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{row.resource_code}</div>
                    <Badge status={row.resource_status} className="mt-0.5" />
                  </Td>
                  <Td>
                    <Badge status={row.status} />
                  </Td>
                  <Td className="text-xs whitespace-nowrap">{fmtDT(row.start_time)}</Td>
                  <Td className="text-xs whitespace-nowrap">{fmtDT(row.end_time)}</Td>
                  <Td className="max-w-xs">
                    <span className="text-xs text-slate-700 line-clamp-2">{row.reason}</span>
                  </Td>
                  <Td className="text-xs">{row.scheduler_name ?? "—"}</Td>
                  {tab === "active" && (
                    <Td>
                      <div className="flex gap-1.5">
                        {canStart(row.status) && (
                          <Button size="sm" variant="outline" onClick={() => handleStart(row)}>
                            Start
                          </Button>
                        )}
                        {canComplete(row.status) && (
                          <Button size="sm" variant="outline" onClick={() => handleComplete(row)}>
                            Complete
                          </Button>
                        )}
                        {canCancel(row.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => handleCancel(row)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </Td>
                  )}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        open={showSchedule}
        resources={resources}
        onClose={() => setShowSchedule(false)}
        onCreated={fetchRecords}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.label}
        confirmClass={confirm.cls}
        onConfirm={runConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        loading={actionLoading}
      />

      {/* Action error toast */}
      {actionError && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white text-xs rounded px-4 py-2 shadow-lg">
          {actionError}
          <button
            className="ml-3 opacity-70 hover:opacity-100"
            onClick={() => setActionError(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
