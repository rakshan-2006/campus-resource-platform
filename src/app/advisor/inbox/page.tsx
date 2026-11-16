"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCampusDateTime, formatCampusDate, formatCampusTime } from "@/lib/format";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  Users, 
  FileText, 
  Tag, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Send,
  MessageSquare
} from "lucide-react";

interface ClubRequest {
  id: number;
  title: string;
  description: string;
  event_type: string | null;
  expected_capacity: number;
  start_time: string;
  end_time: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  request_type: "CLUB";
  club_id: number;
  advisor_review_status: "NOT_APPLICABLE" | "PENDING_ADVISOR" | "ENDORSED" | "REJECTED";
  expected_guests: number | null;
  equipment_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  club_name: string;
  club_category: string;
  club_lead_name: string;
  club_lead_phone: string;
  club_email: string;
  resource_type_name: string;
  preferred_resource_code: string | null;
  preferred_resource_name: string | null;
  requested_facilities: {
    facility_id: number;
    facility_name: string;
    min_quantity: number;
  }[];
}

interface AssignedClub {
  assignment_id: number;
  club_id: number;
  advisor_status: "ACCEPTED" | "PENDING" | "DECLINED" | "REPLACED";
  assigned_at: string;
  responded_at: string | null;
  notes: string | null;
  club_name: string;
  lead_name: string;
  lead_phone: string;
  club_category: string;
  club_description: string;
  founded_year: number;
  club_email: string;
  club_verification_status: "PENDING" | "APPROVED" | "REJECTED";
  pending_reviews_count: number;
}

export default function FacultyAdvisorInboxPage() {
  const [activeTab, setActiveTab] = useState<"proposals" | "clubs" | "invitations">("proposals");
  
  // Requests / Proposals state
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestFilter, setRequestFilter] = useState<string>("PENDING_ADVISOR");
  const [searchQuery, setSearchQuery] = useState("");

  // Clubs and Invitations state
  const [assignedClubs, setAssignedClubs] = useState<AssignedClub[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<AssignedClub[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    request: ClubRequest | null;
    action: "ENDORSE" | "REJECT";
    comments: string;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    request: null,
    action: "ENDORSE",
    comments: "",
    submitting: false,
    error: null,
  });

  // Invitation response modal state
  const [invitationModal, setInvitationModal] = useState<{
    open: boolean;
    assignment: AssignedClub | null;
    decision: "ACCEPT" | "DECLINE";
    notes: string;
    submitting: boolean;
    error: string | null;
  }>({
    open: false,
    assignment: null,
    decision: "ACCEPT",
    notes: "",
    submitting: false,
    error: null,
  });

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch proposals
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const url = requestFilter === "ALL" 
        ? "/api/advisor/requests" 
        : `/api/advisor/requests?review_status=${requestFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load club requests");
      setRequests(json.data || []);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to fetch event proposals" });
    } finally {
      setLoadingRequests(false);
    }
  }, [requestFilter]);

  // Fetch clubs & invitations
  const fetchClubs = useCallback(async () => {
    setLoadingClubs(true);
    try {
      const res = await fetch("/api/faculty/advisors");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load advisor assignments");
      setAssignedClubs(json.data?.assigned_clubs || []);
      setPendingInvitations(json.data?.pending_invitations || []);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to fetch advisor assignments" });
    } finally {
      setLoadingClubs(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const handleOpenReview = (request: ClubRequest, action: "ENDORSE" | "REJECT") => {
    setReviewModal({
      open: true,
      request,
      action,
      comments: action === "ENDORSE" 
        ? "Proposal reviewed and supported. Expected attendance and faculty supervision confirmed."
        : "",
      submitting: false,
      error: null,
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewModal.request) return;
    if (!reviewModal.comments.trim()) {
      setReviewModal((prev) => ({ ...prev, error: "Please provide review feedback or justification." }));
      return;
    }

    setReviewModal((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const res = await fetch(`/api/advisor/requests/${reviewModal.request.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewModal.action,
          comments: reviewModal.comments,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to submit review decision");

      setNotification({
        type: "success",
        text: reviewModal.action === "ENDORSE" 
          ? `Event '${reviewModal.request.title}' successfully endorsed! Forwarded to administration for final venue allocation.`
          : `Event '${reviewModal.request.title}' returned with feedback.`,
      });
      setReviewModal({ open: false, request: null, action: "ENDORSE", comments: "", submitting: false, error: null });
      fetchRequests();
      fetchClubs();
    } catch (err: any) {
      setReviewModal((prev) => ({ ...prev, submitting: false, error: err.message || "Review failed" }));
    }
  };

  const handleOpenInvitation = (assignment: AssignedClub, decision: "ACCEPT" | "DECLINE") => {
    setInvitationModal({
      open: true,
      assignment,
      decision,
      notes: decision === "ACCEPT" ? "I am pleased to serve as faculty advisor for this club." : "",
      submitting: false,
      error: null,
    });
  };

  const handleSubmitInvitation = async () => {
    if (!invitationModal.assignment) return;
    setInvitationModal((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const res = await fetch(`/api/faculty/advisors/${invitationModal.assignment.assignment_id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: invitationModal.decision,
          notes: invitationModal.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to respond to advisor nomination");

      setNotification({
        type: "success",
        text: invitationModal.decision === "ACCEPT"
          ? `You have accepted the faculty advisor appointment for ${invitationModal.assignment.club_name}.`
          : `You have declined the advisor nomination for ${invitationModal.assignment.club_name}.`,
      });
      setInvitationModal({ open: false, assignment: null, decision: "ACCEPT", notes: "", submitting: false, error: null });
      fetchClubs();
      fetchRequests();
    } catch (err: any) {
      setInvitationModal((prev) => ({ ...prev, submitting: false, error: err.message || "Action failed" }));
    }
  };

  // Filter requests by search query
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.club_name.toLowerCase().includes(q) ||
      (r.event_type && r.event_type.toLowerCase().includes(q)) ||
      (r.preferred_resource_name && r.preferred_resource_name.toLowerCase().includes(q))
    );
  });

  const pendingRequestsCount = requests.filter((r) => r.advisor_review_status === "PENDING_ADVISOR").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Faculty Advisor Desk</h1>
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-900 border border-blue-300 px-3 py-0.5 text-xs font-bold">
              Faculty Endorsement Portal
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Review event proposals from student clubs under your mentorship and manage faculty advisor appointments.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-center shadow-sm">
            <div className="text-xl font-bold text-slate-900">{assignedClubs.length}</div>
            <div className="text-xs text-slate-500 font-medium">Advised Clubs</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-center shadow-sm">
            <div className="text-xl font-bold text-amber-600">{pendingRequestsCount}</div>
            <div className="text-xs text-slate-500 font-medium">Proposals To Review</div>
          </div>
          {pendingInvitations.length > 0 && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-center shadow-sm">
              <div className="text-xl font-bold text-indigo-700">{pendingInvitations.length}</div>
              <div className="text-xs text-indigo-800 font-medium">New Invitations</div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-md p-4 text-sm ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("proposals")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "proposals"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Event Proposals</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("clubs")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "clubs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Assigned Clubs</span>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {assignedClubs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("invitations")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === "invitations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Advisor Nominations</span>
            {pendingInvitations.length > 0 && (
              <span className="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white animate-pulse">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: EVENT PROPOSALS */}
      {activeTab === "proposals" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by event title, club, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-700 mr-1">Status:</span>
              {(["PENDING_ADVISOR", "ALL", "ENDORSED", "REJECTED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setRequestFilter(status)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    requestFilter === status
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {status === "PENDING_ADVISOR" && "Pending Review"}
                  {status === "ALL" && "All Proposals"}
                  {status === "ENDORSED" && "Endorsed"}
                  {status === "REJECTED" && "Returned / Rejected"}
                </button>
              ))}
            </div>
          </div>

          {/* Proposals List */}
          {loadingRequests ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading club proposals for review...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-semibold text-foreground">No event proposals found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                {requestFilter === "PENDING_ADVISOR"
                  ? "You have reviewed all pending event proposals from your advised clubs. New proposals will appear here."
                  : "No proposals match your current filter criteria."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-muted-foreground">REQ #{request.id}</span>
                        <h2 className="text-lg font-semibold text-foreground">{request.title}</h2>
                        {request.event_type && (
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900 border border-blue-200">
                            {request.event_type}
                          </span>
                        )}
                        <Badge variant={request.advisor_review_status}>
                          {request.advisor_review_status === "PENDING_ADVISOR" && "Needs Advisor Review"}
                          {request.advisor_review_status === "ENDORSED" && "Advisor Endorsed"}
                          {request.advisor_review_status === "REJECTED" && "Advisor Rejected"}
                        </Badge>
                        {request.status === "APPROVED" && (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900 border border-emerald-300">
                            Venue Allocated (Admin Confirmed)
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {request.description}
                      </p>

                      {/* Event Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-foreground/70" />
                          <span>
                            <strong className="text-foreground">Club:</strong> {request.club_name} ({request.club_category})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-foreground/70" />
                          <span>
                            <strong className="text-foreground">Date:</strong> {formatCampusDate(request.start_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-foreground/70" />
                          <span>
                            <strong className="text-foreground">Time:</strong> {formatCampusTime(request.start_time)} – {formatCampusTime(request.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-foreground/70" />
                          <span>
                            <strong className="text-foreground">Resource:</strong> {request.preferred_resource_code ? `${request.preferred_resource_code} (${request.preferred_resource_name})` : request.resource_type_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-foreground/70" />
                          <span>
                            <strong className="text-foreground">Expected:</strong> {request.expected_capacity} students
                            {request.expected_guests ? ` (+${request.expected_guests} external guests)` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-foreground/70" />
                          <span>
                            <strong className="text-foreground">Lead:</strong> {request.club_lead_name} ({request.club_lead_phone})
                          </span>
                        </div>
                      </div>

                      {/* Equipment or Facilities requirement note */}
                      {request.requested_facilities.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-xs font-medium text-foreground">Requested Facilities:</span>
                          {request.requested_facilities.map((f) => (
                            <span key={f.facility_id} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                              {f.facility_name} (×{f.min_quantity})
                            </span>
                          ))}
                        </div>
                      )}

                      {request.equipment_notes && (
                        <div className="text-xs bg-muted/40 p-2 rounded border border-border/50 text-foreground mt-1">
                          <strong>Logistics / Equipment Notes:</strong> {request.equipment_notes}
                        </div>
                      )}

                      {request.rejection_reason && (
                        <div className="text-xs bg-red-50 text-red-800 p-2 rounded border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 mt-1">
                          <strong>Rejection / Return Feedback:</strong> {request.rejection_reason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 shrink-0 pt-2 md:pt-0">
                      {request.advisor_review_status === "PENDING_ADVISOR" ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleOpenReview(request, "ENDORSE")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Endorse Proposal
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleOpenReview(request, "REJECT")}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Return / Reject
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground text-right italic py-1">
                          {request.advisor_review_status === "ENDORSED" 
                            ? "Endorsed · Awaiting admin allocation"
                            : "Reviewed"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNED CLUBS */}
      {activeTab === "clubs" && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-lg border border-border">
            <h2 className="text-sm font-semibold text-foreground">Clubs Under Your Faculty Mentorship</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              As faculty advisor, you serve as the academic sponsor and first reviewer for venue and event reservations submitted by these clubs.
            </p>
          </div>

          {loadingClubs ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading assigned clubs...</div>
          ) : assignedClubs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-semibold text-foreground">No active club assignments</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                You are not currently advising any student clubs. Student clubs can nominate you during self-registration, and invitations will appear in the Advisor Nominations tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedClubs.map((club) => (
                <div key={club.assignment_id} className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{club.club_name}</h3>
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {club.club_category}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Founded {club.founded_year || "N/A"} · Mentored since {formatCampusDate(club.assigned_at)}
                      </div>
                    </div>

                    <Badge variant={club.club_verification_status}>
                      {club.club_verification_status === "APPROVED" ? "Verified Club" : club.club_verification_status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {club.club_description || "No club description provided."}
                  </p>

                  <div className="border-t border-border pt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Student Lead:</span> {club.lead_name}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Lead Phone:</span> {club.lead_phone}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-foreground">Contact Email:</span> {club.club_email}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      Pending event requests:{" "}
                      <strong className={club.pending_reviews_count > 0 ? "text-amber-600 font-bold" : "text-foreground"}>
                        {club.pending_reviews_count}
                      </strong>
                    </span>

                    {club.pending_reviews_count > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setActiveTab("proposals");
                          setRequestFilter("PENDING_ADVISOR");
                          setSearchQuery(club.club_name);
                        }}
                      >
                        Review Proposals ({club.pending_reviews_count})
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADVISOR INVITATIONS */}
      {activeTab === "invitations" && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-lg border border-border">
            <h2 className="text-sm font-semibold text-foreground">Pending Faculty Advisor Appointments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              These student clubs have nominated you as their designated faculty advisor. Accept to enable their ability to book campus venues with your endorsement.
            </p>
          </div>

          {loadingClubs ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading nominations...</div>
          ) : pendingInvitations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-semibold text-foreground">No pending advisor invitations</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                There are no student clubs currently requesting your advisor appointment.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingInvitations.map((inv) => (
                <div key={inv.assignment_id} className="rounded-lg border border-indigo-200 bg-card p-5 shadow-sm dark:border-indigo-900 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">{inv.club_name}</h3>
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {inv.club_category}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Nomination submitted on {formatCampusDateTime(inv.assigned_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleOpenInvitation(inv, "ACCEPT")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Accept Appointment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => handleOpenInvitation(inv, "DECLINE")}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Decline
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {inv.club_description || "No club description provided."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/30 p-3 rounded text-xs text-muted-foreground border border-border/50">
                    <div>
                      <span className="font-semibold text-foreground">Student Lead:</span> {inv.lead_name}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Phone:</span> {inv.lead_phone}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Email:</span> {inv.club_email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal.open && reviewModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {reviewModal.action === "ENDORSE" ? "Endorse Club Event Proposal" : "Return / Reject Event Proposal"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {reviewModal.request.club_name} · REQ #{reviewModal.request.id}
                </p>
              </div>
              <button
                onClick={() => setReviewModal((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Proposal summary box */}
            <div className="rounded-lg bg-slate-50 p-4 text-xs space-y-2 border border-slate-200 text-slate-800">
              <div>
                <strong className="text-slate-900">Event Title:</strong> {reviewModal.request.title}
              </div>
              <div>
                <strong className="text-slate-900">Schedule:</strong> {formatCampusDate(reviewModal.request.start_time)} ({formatCampusTime(reviewModal.request.start_time)} – {formatCampusTime(reviewModal.request.end_time)})
              </div>
              <div>
                <strong className="text-slate-900">Expected Attendees:</strong> {reviewModal.request.expected_capacity} students
                {reviewModal.request.expected_guests ? ` (+${reviewModal.request.expected_guests} external guests)` : ""}
              </div>
              <div>
                <strong className="text-slate-900">Requested Venue/Type:</strong> {reviewModal.request.preferred_resource_code ? `${reviewModal.request.preferred_resource_code} (${reviewModal.request.preferred_resource_name})` : reviewModal.request.resource_type_name}
              </div>
            </div>

            {/* Decision explanation callout */}
            <div
              className={`p-3.5 rounded-lg text-xs border ${
                reviewModal.action === "ENDORSE"
                  ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                  : "bg-red-50 text-red-950 border-red-300"
              }`}
            >
              {reviewModal.action === "ENDORSE" ? (
                <span>
                  <strong>Advisor Endorsement:</strong> Confirms that you endorse this student activity. The proposal will advance to the Admin Desk for final venue schedule check and room allocation.
                </span>
              ) : (
                <span>
                  <strong>Return / Rejection:</strong> The proposal will be returned to the club organizers with your feedback and will not proceed to room allocation.
                </span>
              )}
            </div>

            {/* Comments Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">
                {reviewModal.action === "ENDORSE" ? "Endorsement Notes & Recommendation" : "Reason for Return / Guidance for Club"}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                rows={4}
                value={reviewModal.comments}
                onChange={(e) => setReviewModal((prev) => ({ ...prev, comments: e.target.value, error: null }))}
                placeholder={
                  reviewModal.action === "ENDORSE"
                    ? "Enter recommendation notes for the campus administrator..."
                    : "Explain why this proposal is returned and what modifications are needed..."
                }
                className="w-full text-sm rounded-lg border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {reviewModal.error && (
              <p className="text-xs text-red-600 font-medium">{reviewModal.error}</p>
            )}

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => setReviewModal((prev) => ({ ...prev, open: false }))}
                disabled={reviewModal.submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={
                  reviewModal.action === "ENDORSE"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    : "bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
                }
                onClick={handleSubmitReview}
                disabled={reviewModal.submitting}
              >
                {reviewModal.submitting ? "Submitting..." : reviewModal.action === "ENDORSE" ? "Confirm Endorsement" : "Confirm Return"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Response Modal */}
      {invitationModal.open && invitationModal.assignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {invitationModal.decision === "ACCEPT" ? "Accept Advisor Appointment" : "Decline Advisor Appointment"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{invitationModal.assignment.club_name}</p>
              </div>
              <button
                onClick={() => setInvitationModal((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {invitationModal.decision === "ACCEPT"
                ? `By accepting, you become the designated faculty advisor for ${invitationModal.assignment.club_name}. You will receive and review their event proposals before administration allocates campus venues.`
                : `By declining, this student club will be notified and required to nominate another eligible faculty member.`}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">
                Notes / Response Message (Optional)
              </label>
              <textarea
                rows={3}
                value={invitationModal.notes}
                onChange={(e) => setInvitationModal((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes to the club student leadership..."
                className="w-full text-sm rounded-lg border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {invitationModal.error && (
              <p className="text-xs text-red-600 font-medium">{invitationModal.error}</p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => setInvitationModal((prev) => ({ ...prev, open: false }))}
                disabled={invitationModal.submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={
                  invitationModal.decision === "ACCEPT"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    : "bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
                }
                onClick={handleSubmitInvitation}
                disabled={invitationModal.submitting}
              >
                {invitationModal.submitting ? "Processing..." : invitationModal.decision === "ACCEPT" ? "Accept Appointment" : "Decline Appointment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
