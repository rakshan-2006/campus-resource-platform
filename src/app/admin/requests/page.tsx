"use client";

import React, { useEffect, useState } from "react";
import { BookingRequest } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { 
  CheckSquare, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  AlertCircle 
} from "lucide-react";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      setStatusMessage(`Request #${requestId} approved and confirmed!`);
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
      setStatusMessage(`Request rejected with documented reason.`);
      loadRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRejectSubmitting(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const resolvedRequests = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Admin Request Triage Desk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolve incoming faculty resource applications via PostgreSQL stored procedure <code className="bg-slate-100 px-1 py-0.5 rounded">sp_approve_request</code>.
          </p>
        </div>
        <div className="text-xs font-mono bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded">
          Pending Triage: {pendingRequests.length}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* SECTION 1: Pending Queue */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Pending Requests Queue</h2>
          </div>
          <span className="text-[11px] text-slate-500">Atomic row-level locking active</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
            Querying pending requests queue...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            All requests have been triaged! No pending applications in queue.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Event / Title</Th>
                <Th>Faculty Applicant</Th>
                <Th>Department</Th>
                <Th>Type & Capacity</Th>
                <Th>Requested Room</Th>
                <Th>Slot Window</Th>
                <Th>Required Amenities</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pendingRequests.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-xs text-slate-500">#{r.id}</Td>
                  <Td className="font-semibold text-xs text-slate-900">{r.title}</Td>
                  <Td className="text-xs">
                    <div>{r.faculty_name}</div>
                    <div className="text-[10px] text-slate-500">{r.faculty_email}</div>
                  </Td>
                  <Td className="text-xs text-slate-600">{r.department_name}</Td>
                  <Td className="text-xs">
                    <div>{r.resource_type_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.expected_capacity} seats</div>
                  </Td>
                  <Td className="text-xs">
                    {r.preferred_resource_code ? (
                      <div>
                        <span className="font-mono font-bold text-blue-700">{r.preferred_resource_code}</span>
                        <span className="text-[10px] text-slate-500 block">{r.preferred_resource_name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono">Any Available</span>
                    )}
                  </Td>
                  <Td className="text-xs font-mono text-slate-800">
                    <div>{r.start_time.replace("T", " ")}</div>
                    <div>{r.end_time.replace("T", " ")}</div>
                  </Td>
                  <Td className="text-xs">
                    {r.requested_facilities && r.requested_facilities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.requested_facilities.map((f: any) => (
                          <span
                            key={f.facility_id}
                            className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px] font-mono"
                          >
                            {f.facility_name} ({f.min_quantity})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">None</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        className="text-xs py-0.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        isLoading={approvingId === r.id}
                        onClick={() => handleApprove(r.id)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-0.5 px-2 text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        onClick={() => openRejectModal(r.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* SECTION 2: Resolved Requests History */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Resolved Requests History ({resolvedRequests.length})
        </h2>

        {resolvedRequests.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No resolved requests yet.</p>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Title / Event</Th>
                <Th>Faculty Applicant</Th>
                <Th>Allocated Resource</Th>
                <Th>Time Window</Th>
                <Th>Status</Th>
                <Th>Resolution Note</Th>
              </Tr>
            </Thead>
            <Tbody>
              {resolvedRequests.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-xs text-slate-500">#{r.id}</Td>
                  <Td className="font-semibold text-xs text-slate-900">{r.title}</Td>
                  <Td className="text-xs">{r.faculty_name}</Td>
                  <Td className="text-xs font-mono text-blue-700 font-bold">
                    {r.preferred_resource_code || "—"}
                  </Td>
                  <Td className="text-xs font-mono text-slate-600">
                    {r.start_time.replace("T", " ")} to {r.end_time.replace("T", " ")}
                  </Td>
                  <Td>
                    <Badge status={r.status} className="text-[10px] py-0 px-1.5" />
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {r.rejection_reason || "Confirmed & booked"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Reject Request #{rejectingId}</h3>
            <p className="text-xs text-slate-600">
              Provide an institutional reason for rejecting this reservation request:
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Venue undergoing routine acoustic calibration or priority institutional ceremony..."
                className="w-full text-xs border border-slate-300 rounded p-2 text-slate-800"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
