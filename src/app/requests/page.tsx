"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { BookingRequest } from "@/types";
import { Badge, getRequestStatusDescriptor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCampusDateTime, formatCampusDate, formatCampusTime } from "@/lib/format";
import { 
  FileText, 
  PlusCircle, 
  AlertCircle, 
  XCircle, 
  Search, 
  Clock, 
  MessageSquare, 
  History,
  CheckCircle2,
  Calendar,
  Users,
  ShieldCheck
} from "lucide-react";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Review history modal state
  const [selectedRequestForHistory, setSelectedRequestForHistory] = useState<BookingRequest | null>(null);

  const loadRequests = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("request_type", typeFilter);

    fetch(`/api/requests?${params.toString()}`)
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
  }, [statusFilter, typeFilter]);

  const handleCancelRequest = async (requestId: number) => {
    if (!confirm("Are you sure you want to cancel this request? Any associated booking will be automatically cancelled.")) {
      return;
    }

    setCancellingId(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to cancel request");

      loadRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter((r) => 
      r.title.toLowerCase().includes(q) ||
      (r.club_name && r.club_name.toLowerCase().includes(q)) ||
      (r.event_type && r.event_type.toLowerCase().includes(q)) ||
      (r.preferred_resource_code && r.preferred_resource_code.toLowerCase().includes(q)) ||
      (r.resource_type_name && r.resource_type_name.toLowerCase().includes(q))
    );
  }, [requests, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Booking & Event Requests Desk</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track submitted resource applications, advisor endorsements, approval resolutions, and review audit history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/request/new">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>Create New Request</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compact Responsive Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-sm text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, club, event, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending (Any stage)</option>
              <option value="APPROVED">Approved / Confirmed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <span className="font-medium text-muted-foreground ml-2">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-input rounded-md px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Types</option>
              <option value="FACULTY">Faculty Academic</option>
              <option value="CLUB">Student Club</option>
            </select>
          </div>
        </div>

        <div className="text-muted-foreground font-mono text-[11px] text-right">
          Showing <strong>{filteredRequests.length}</strong> of {requests.length} requests
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-mono animate-pulse">
            Loading booking requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No booking requests match your filters. Click &ldquo;Create New Request&rdquo; to submit an application.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Title / Activity</Th>
                  <Th>Type & Venue</Th>
                  <Th>Schedule Window</Th>
                  <Th>Attendance</Th>
                  <Th>Next Step / Status</Th>
                  <Th>Review History</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredRequests.map((req) => {
                  const statusDesc = getRequestStatusDescriptor(req.status, req.advisor_review_status, req.request_type);
                  const hasHistory = req.review_history && req.review_history.length > 0;

                  return (
                    <Tr key={req.id}>
                      <Td className="font-mono text-xs text-muted-foreground">#{req.id}</Td>
                      <Td className="text-xs max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground">{req.title}</span>
                          {req.event_type && (
                            <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                              {req.event_type}
                            </span>
                          )}
                        </div>
                        {req.club_name && (
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Club: {req.club_name}
                          </span>
                        )}
                        {req.rejection_reason && (
                          <span className="text-[10px] text-red-700 font-medium block mt-0.5">
                            Feedback: {req.rejection_reason}
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs">
                        {req.preferred_resource_code ? (
                          <div>
                            <span className="font-mono font-bold text-primary">{req.preferred_resource_code}</span>
                            <span className="text-[10px] text-muted-foreground block">{req.preferred_resource_name}</span>
                          </div>
                        ) : (
                          <span className="text-foreground">{req.resource_type_name}</span>
                        )}
                      </Td>
                      <Td className="text-xs text-muted-foreground">
                        <div>{formatCampusDate(req.start_time)}</div>
                        <div className="text-[11px] font-mono">{formatCampusTime(req.start_time)} – {formatCampusTime(req.end_time)}</div>
                      </Td>
                      <Td className="text-xs font-mono">
                        <div>{req.expected_capacity} seats</div>
                        {req.expected_guests ? (
                          <div className="text-[10px] text-muted-foreground">+{req.expected_guests} guests</div>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge variant={statusDesc.variant} className="text-[10px] py-0 px-1.5">
                          {statusDesc.label}
                        </Badge>
                      </Td>
                      <Td>
                        {hasHistory ? (
                          <button
                            onClick={() => setSelectedRequestForHistory(req)}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>{(req.review_history?.length || 0)} decision{(req.review_history?.length || 0) > 1 ? "s" : ""}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">None yet</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        {req.status === "PENDING" || req.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            className="text-xs py-0.5 px-2 gap-1"
                            isLoading={cancellingId === req.id}
                            onClick={() => handleCancelRequest(req.id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">—</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Review History Audit Trail Modal */}
      {selectedRequestForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review History &amp; Decision Audit</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request #{selectedRequestForHistory.id} · {selectedRequestForHistory.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequestForHistory(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(selectedRequestForHistory.review_history || []).map((h, i) => (
                <div key={h.id || i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{h.reviewer_name}</span>
                      <Badge variant={h.reviewer_role}>{h.reviewer_role}</Badge>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatCampusDateTime(h.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-600">Decision:</span>
                    <span className={`font-semibold ${
                      h.action === "ENDORSED" || h.action === "APPROVED_BY_ADMIN" 
                        ? "text-emerald-700" 
                        : "text-red-700"
                    }`}>
                      {h.action}
                    </span>
                  </div>

                  {h.comments && (
                    <div className="bg-white p-2.5 rounded-md border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                      &ldquo;{h.comments}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => setSelectedRequestForHistory(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
