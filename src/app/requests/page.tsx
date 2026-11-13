"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookingRequest } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { FileText, PlusCircle, AlertCircle, XCircle } from "lucide-react";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadRequests = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

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
  }, [statusFilter]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Booking Requests Desk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track submitted resource applications, approval resolutions, and cancellation states.
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
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-3 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <span className="text-slate-500 font-mono">Count: {requests.length}</span>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
            Querying booking requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No booking requests found. Click &ldquo;Create New Request&rdquo; to submit an application.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Title / Event</Th>
                <Th>Category Type</Th>
                <Th>Allocated / Preferred</Th>
                <Th>Requested Window</Th>
                <Th>Seats</Th>
                <Th>Required Amenities</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {requests.map((req) => (
                <Tr key={req.id}>
                  <Td className="font-mono text-xs text-slate-500">#{req.id}</Td>
                  <Td className="text-xs">
                    <span className="font-semibold text-slate-900 block">{req.title}</span>
                    {req.rejection_reason && (
                      <span className="text-[10px] text-red-600 block mt-0.5">
                        Reason: {req.rejection_reason}
                      </span>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-600">{req.resource_type_name}</Td>
                  <Td className="text-xs">
                    {req.preferred_resource_code ? (
                      <div>
                        <span className="font-mono font-bold text-blue-700">{req.preferred_resource_code}</span>
                        <span className="text-[10px] text-slate-500 block">{req.preferred_resource_name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">System Choice</span>
                    )}
                  </Td>
                  <Td className="text-xs font-mono text-slate-600">
                    <div>{req.start_time.replace("T", " ")}</div>
                    <div>{req.end_time.replace("T", " ")}</div>
                  </Td>
                  <Td className="text-xs font-mono font-medium">{req.expected_capacity}</Td>
                  <Td className="text-xs">
                    {req.requested_facilities && req.requested_facilities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {req.requested_facilities.map((fac: any) => (
                          <span
                            key={fac.facility_id}
                            className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px] font-mono"
                          >
                            {fac.facility_name} ({fac.min_quantity})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">None</span>
                    )}
                  </Td>
                  <Td>
                    <Badge status={req.status} className="text-[10px] py-0 px-1.5" />
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
                      <span className="text-xs text-slate-400 font-mono">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
