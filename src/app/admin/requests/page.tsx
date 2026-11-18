"use client";

import React, { useEffect, useState, useMemo } from "react";
import { BookingRequest } from "@/types";
import { Badge, getRequestStatusDescriptor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCampusDateTime, formatCampusDate, formatCampusTime } from "@/lib/format";
import { 
  CheckSquare, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  AlertCircle,
  Search,
  Users,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  MessageSquare
} from "lucide-react";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Rejection modal
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Approval state
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadRequests = () => {
    setLoading(true);
    fetch("/api/requests")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load requests");
        return res.json();
      })
      .then((json) => {
        setRequests(json.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId: number) => {
    setApprovingId(requestId);
    setStatusMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Approval failed");
      }

      setStatusMessage(`Request #${requestId} successfully allocated and confirmed!`);
      loadRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectModal = (requestId: number) => {
    setRejectingId(requestId);
    setRejectReason("");
    setError(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;

    setRejectSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/requests/${rejectingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Rejection failed");
      }

      setRejectingId(null);
      setStatusMessage(`Request #${rejectingId} rejected with documented institutional reason.`);
      loadRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (typeFilter && r.request_type !== typeFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        (r.faculty_name && r.faculty_name.toLowerCase().includes(q)) ||
        (r.club_name && r.club_name.toLowerCase().includes(q)) ||
        (r.preferred_resource_code && r.preferred_resource_code.toLowerCase().includes(q)) ||
        (r.resource_type_name && r.resource_type_name.toLowerCase().includes(q))
      );
    });
  }, [requests, searchQuery, typeFilter]);

  const pendingRequests = filteredRequests.filter((r) => r.status === "PENDING");
  const resolvedRequests = filteredRequests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Admin Request Triage Desk</h1>
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 text-xs font-bold">
              Operations
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review and resolve incoming venue requests from faculty and student clubs with automated schedule and conflict checking.
          </p>
        </div>
        <div className="text-xs font-mono bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg font-semibold">
          Pending Triage Queue: <strong>{pendingRequests.length}</strong>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-sm text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, club, requester, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">Applicant Role:</span>
          {(["", "FACULTY", "CLUB"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTypeFilter(r)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                typeFilter === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r === "" ? "All Requests" : r === "FACULTY" ? "Faculty Academic" : "Student Clubs"}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: Pending Queue */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-foreground">Requests Awaiting Allocation Decision</h2>
          </div>
          <span className="text-[11px] text-muted-foreground">Overlap protection &amp; room availability enforced</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-mono animate-pulse">
            Querying pending requests queue...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            All requests have been triaged. No pending applications in queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Event / Title</Th>
                  <Th>Requester &amp; Role</Th>
                  <Th>Type &amp; Capacity</Th>
                  <Th>Target Venue</Th>
                  <Th>Time Slot</Th>
                  <Th>Endorsement Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pendingRequests.map((r) => {
                  const isClub = r.request_type === "CLUB";
                  const isEndorsed = r.advisor_review_status === "ENDORSED";
                  const canApprove = !isClub || isEndorsed;

                  return (
                    <Tr key={r.id}>
                      <Td className="font-mono text-xs text-muted-foreground">#{r.id}</Td>
                      <Td className="text-xs max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{r.title}</span>
                          {r.event_type && (
                            <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                              {r.event_type}
                            </span>
                          )}
                        </div>
                        {r.description && (
                          <span className="text-[11px] text-muted-foreground block line-clamp-1 mt-0.5">
                            {r.description}
                          </span>
                        )}
                        {r.equipment_notes && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5 italic">
                            Logistics: {r.equipment_notes}
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs">
                        <div className="font-medium text-foreground">
                          {isClub ? r.club_name : r.faculty_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Badge variant={r.request_type || "FACULTY"} className="text-[9px] py-0 px-1">
                            {r.request_type || "FACULTY"}
                          </Badge>
                          <span>{r.department_name}</span>
                        </div>
                      </Td>
                      <Td className="text-xs">
                        <div className="text-foreground">{r.resource_type_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {r.expected_capacity} seats
                          {r.expected_guests ? ` (+${r.expected_guests} guests)` : ""}
                        </div>
                      </Td>
                      <Td className="text-xs">
                        {r.preferred_resource_code ? (
                          <div>
                            <span className="font-mono font-bold text-primary">{r.preferred_resource_code}</span>
                            <span className="text-[10px] text-muted-foreground block">{r.preferred_resource_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono">Any Available</span>
                        )}
                      </Td>
                      <Td className="text-xs text-muted-foreground">
                        <div>{formatCampusDate(r.start_time)}</div>
                        <div className="text-[11px] font-mono">{formatCampusTime(r.start_time)} – {formatCampusTime(r.end_time)}</div>
                      </Td>
                      <Td className="text-xs">
                        {isClub ? (
                          <div className="space-y-1">
                            <Badge variant={r.advisor_review_status}>
                              {r.advisor_review_status === "ENDORSED"
                                ? "Advisor Endorsed"
                                : r.advisor_review_status === "PENDING_ADVISOR"
                                ? "Needs Advisor Endorsement"
                                : r.advisor_review_status}
                            </Badge>
                            {r.review_history && r.review_history.length > 0 && (
                              <div className="text-[10px] text-muted-foreground italic line-clamp-2">
                                &ldquo;{r.review_history[r.review_history.length - 1].comments}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="NOT_APPLICABLE">Direct Academic</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="text-xs py-0.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            isLoading={approvingId === r.id}
                            disabled={!canApprove}
                            onClick={() => handleApprove(r.id)}
                            title={!canApprove ? "Club request must be endorsed by faculty advisor first" : "Approve and allocate venue"}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Allocate Room</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="text-xs py-0.5 px-2 gap-1"
                            onClick={() => openRejectModal(r.id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      {/* SECTION 2: Resolved Requests History */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden p-4 space-y-3">
        <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
          Resolved Requests History ({resolvedRequests.length})
        </h2>

        {resolvedRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No resolved requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Title / Event</Th>
                  <Th>Applicant &amp; Role</Th>
                  <Th>Allocated Venue</Th>
                  <Th>Time Window</Th>
                  <Th>Final Status</Th>
                  <Th>Resolution Note</Th>
                </Tr>
              </Thead>
              <Tbody>
                {resolvedRequests.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-mono text-xs text-muted-foreground">#{r.id}</Td>
                    <Td className="font-semibold text-xs text-foreground">
                      <div>{r.title}</div>
                      {r.event_type && (
                        <span className="text-[10px] text-muted-foreground font-normal">{r.event_type}</span>
                      )}
                    </Td>
                    <Td className="text-xs">
                      <div>{r.request_type === "CLUB" ? r.club_name : r.faculty_name}</div>
                      <span className="text-[10px] text-muted-foreground">{r.department_name}</span>
                    </Td>
                    <Td className="text-xs font-mono text-primary font-bold">
                      {r.preferred_resource_code ? `${r.preferred_resource_code}` : "—"}
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      <div>{formatCampusDate(r.start_time)}</div>
                      <div className="text-[11px] font-mono">{formatCampusTime(r.start_time)} – {formatCampusTime(r.end_time)}</div>
                    </Td>
                    <Td>
                      <Badge status={r.status} className="text-[10px] py-0 px-1.5" />
                    </Td>
                    <Td className="text-xs text-muted-foreground max-w-xs">
                      {r.rejection_reason ? (
                        <span className="text-red-600 dark:text-red-400">{r.rejection_reason}</span>
                      ) : (
                        "Allocated and confirmed"
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Reject Request #{rejectingId}</h3>
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provide an institutional reason for rejecting this reservation request. This reason will be logged in the audit trail and visible to the applicant.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Venue undergoing routine acoustic calibration or priority institutional ceremony..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => setRejectingId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="danger"
                  isLoading={rejectSubmitting}
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
