"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCampusDateTime } from "@/lib/format";
import { 
  UserCheck, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Filter,
  Search,
  Building2,
  Phone,
  Calendar
} from "lucide-react";

interface RegistrationItem {
  user_id: number;
  name: string;
  email: string;
  role: "FACULTY" | "CLUB";
  verification_status: "PENDING" | "APPROVED" | "REJECTED";
  verified_at: string | null;
  verified_by_user_id: number | null;
  verification_notes: string | null;
  created_at: string;
  department_id: number;
  department_name: string;
  club_id: number | null;
  club_name: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  club_category: string | null;
  club_description: string | null;
  founded_year: number | null;
  advisor_assignment_id: number | null;
  advisor_status: "PENDING" | "ACCEPTED" | "DECLINED" | "REPLACED" | null;
  advisor_user_id: number | null;
  advisor_name: string | null;
  advisor_email: string | null;
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Verification action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    user: RegistrationItem | null;
    action: "APPROVE" | "REJECT";
    notes: string;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    user: null,
    action: "APPROVE",
    notes: "",
    submitting: false,
    error: null,
  });

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (roleFilter && roleFilter !== "ALL") params.append("role", roleFilter);

      const res = await fetch(`/api/admin/registrations?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load registrations");
      }
      setRegistrations(json.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch registrations");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleVerifySubmit = async () => {
    if (!actionModal.user) return;
    setActionModal((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const res = await fetch(`/api/admin/registrations/${actionModal.user.user_id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionModal.action,
          notes: actionModal.notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to submit verification");
      }

      setNotification({
        type: "success",
        text: json.data?.message || `Registration ${actionModal.action.toLowerCase()}d successfully.`,
      });

      setActionModal({
        open: false,
        user: null,
        action: "APPROVE",
        notes: "",
        submitting: false,
        error: null,
      });

      fetchRegistrations();
    } catch (err: any) {
      setActionModal((prev) => ({ ...prev, submitting: false, error: err.message }));
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.club_name && r.club_name.toLowerCase().includes(q)) ||
      (r.advisor_name && r.advisor_name.toLowerCase().includes(q))
    );
  });

  const pendingCount = registrations.filter((r) => r.verification_status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Registration Governance Desk</h1>
            <Badge variant="ADMIN">Admin Review</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review and verify institutional faculty accounts and student organization charter requests.
          </p>
        </div>

        {/* Quick KPI badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-amber-900">{pendingCount} Awaiting Review</span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or club..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-[11px] font-medium text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2 border border-slate-200 rounded-md text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved Accounts</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-[11px] font-medium text-slate-400">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1 px-2 border border-slate-200 rounded-md text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Roles</option>
              <option value="FACULTY">Faculty Only</option>
              <option value="CLUB">Clubs Only</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchRegistrations}
            className="text-xs py-1"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Registrations Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono animate-pulse">
            Loading institutional registrations...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-700 bg-rose-50">
            {error}
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-slate-700">No registration records found</h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no accounts matching the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Applicant / Organization</Th>
                  <Th>Role</Th>
                  <Th>Institutional Details</Th>
                  <Th>Advisor Status</Th>
                  <Th>Registered On</Th>
                  <Th>Verification</Th>
                  <Th className="text-right">Administrative Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredRegistrations.map((item) => (
                  <Tr key={item.user_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Applicant details */}
                    <Td>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                          item.role === "FACULTY" ? "bg-blue-600" : "bg-teal-600"
                        }`}>
                          {item.role === "FACULTY" ? <GraduationCap className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900">
                            {item.club_name || item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.email}
                          </div>
                          {item.role === "CLUB" && item.lead_name && (
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>Lead: {item.lead_name}</span>
                              {item.lead_phone && <span>• {item.lead_phone}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>

                    {/* Role badge */}
                    <Td>
                      <Badge variant={item.role} className="text-[10px] py-0 px-1.5">
                        {item.role}
                      </Badge>
                    </Td>

                    {/* Institutional Details */}
                    <Td className="text-xs">
                      {item.role === "FACULTY" ? (
                        <div>
                          <div className="text-slate-800 font-medium">{item.department_name}</div>
                          <div className="text-[10px] text-slate-400">Academic Department</div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">{item.club_category}</span>
                            {item.founded_year && (
                              <span className="text-[10px] text-slate-400">Est. {item.founded_year}</span>
                            )}
                          </div>
                          {item.club_description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 max-w-xs" title={item.club_description}>
                              {item.club_description}
                            </p>
                          )}
                        </div>
                      )}
                    </Td>

                    {/* Advisor Status (for Clubs) */}
                    <Td className="text-xs">
                      {item.role === "CLUB" ? (
                        item.advisor_name ? (
                          <div>
                            <div className="font-medium text-slate-800">{item.advisor_name}</div>
                            <div className="mt-0.5">
                              <Badge
                                variant={
                                  item.advisor_status === "ACCEPTED"
                                    ? "ACCEPTED"
                                    : item.advisor_status === "DECLINED"
                                    ? "DECLINED"
                                    : "PENDING"
                                }
                                className="text-[9px] py-0 px-1"
                              >
                                {item.advisor_status === "ACCEPTED" ? "Advisor Accepted" : item.advisor_status || "Pending"}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No advisor record</span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">N/A (Faculty)</span>
                      )}
                    </Td>

                    {/* Registered On */}
                    <Td className="text-xs text-slate-500 font-mono whitespace-nowrap">
                      {formatCampusDateTime(item.created_at)}
                    </Td>

                    {/* Verification Status */}
                    <Td>
                      <Badge
                        variant={
                          item.verification_status === "APPROVED"
                            ? "APPROVED"
                            : item.verification_status === "REJECTED"
                            ? "REJECTED"
                            : "PENDING"
                        }
                        className="text-[10px] py-0.5 px-2"
                      >
                        {item.verification_status}
                      </Badge>
                      {item.verified_at && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {formatCampusDateTime(item.verified_at)}
                        </div>
                      )}
                    </Td>

                    {/* Action Buttons */}
                    <Td className="text-right">
                      {item.verification_status === "PENDING" ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2.5 h-7"
                            onClick={() =>
                              setActionModal({
                                open: true,
                                user: item,
                                action: "APPROVE",
                                notes: "",
                                submitting: false,
                                error: null,
                              })
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Approve</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="danger"
                            className="text-xs py-1 px-2.5 h-7"
                            onClick={() =>
                              setActionModal({
                                open: true,
                                user: item,
                                action: "REJECT",
                                notes: "",
                                submitting: false,
                                error: null,
                              })
                            }
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Resolved ({item.verification_status})
                        </span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Verification Action Modal */}
      {actionModal.open && actionModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`p-4 border-b flex items-center justify-between ${
              actionModal.action === "APPROVE" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
            }`}>
              <div className="flex items-center gap-2">
                {actionModal.action === "APPROVE" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-sm text-slate-900">
                  {actionModal.action === "APPROVE" ? "Approve Registration" : "Reject Registration"}
                </h3>
              </div>
              <button
                onClick={() => setActionModal((p) => ({ ...p, open: false }))}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {actionModal.error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionModal.error}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-semibold text-slate-900">
                    {actionModal.user.club_name || actionModal.user.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-700">{actionModal.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <Badge variant={actionModal.user.role} className="text-[10px] py-0 px-1.5">
                    {actionModal.user.role}
                  </Badge>
                </div>
                {actionModal.user.role === "CLUB" && actionModal.user.advisor_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nominated Advisor:</span>
                    <span className="text-slate-800 font-medium">{actionModal.user.advisor_name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Administrative Notes / Feedback (Optional):
                </label>
                <textarea
                  value={actionModal.notes}
                  onChange={(e) => setActionModal((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={
                    actionModal.action === "APPROVE"
                      ? "e.g. Identity verified via Department Head endorsement."
                      : "e.g. Incomplete charter details or invalid institutional contact."
                  }
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal((p) => ({ ...p, open: false }))}
                  disabled={actionModal.submitting}
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  className={actionModal.action === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  variant={actionModal.action === "APPROVE" ? "primary" : "danger"}
                  onClick={handleVerifySubmit}
                  isLoading={actionModal.submitting}
                >
                  Confirm {actionModal.action === "APPROVE" ? "Approval" : "Rejection"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
