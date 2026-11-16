"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, getRequestStatusDescriptor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCampusDateTime, formatCampusDate, formatCampusTime } from "@/lib/format";
import { 
  Building2, 
  Calendar, 
  Clock, 
  FileText, 
  PlusCircle, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Wrench,
  ShieldCheck,
  UserCheck,
  Users,
  AlertCircle,
  HelpCircle,
  Sparkles
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load dashboard data");
        return res.json();
      })
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-xs text-muted-foreground font-mono animate-pulse">
          Loading dashboard operations...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
        Error loading operational dashboard: {error}
      </div>
    );
  }

  // ==========================================================================
  // 1. CLUB DASHBOARD VIEW
  // ==========================================================================
  if (data.role === "CLUB") {
    const isApproved = data.club?.verification_status === "APPROVED";
    const hasAcceptedAdvisor = data.club?.advisor_status === "ACCEPTED";
    const canSubmitEvents = isApproved && hasAcceptedAdvisor;

    return (
      <div className="space-y-6">
        {/* Top Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {data.club?.club_name || "Student Club Workspace"}
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 text-xs font-bold">
                {data.club?.category || "Student Organization"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage club event proposals, advisor endorsements, and confirmed venue reservations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/request/new">
              <Button size="sm" className="gap-1.5" disabled={!canSubmitEvents}>
                <PlusCircle className="w-4 h-4" />
                <span>New Event Request</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Verification & Advisor Status Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account Verification Card */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            {isApproved ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Club Verification Status:</span>
                <Badge variant={data.club?.verification_status || "PENDING"}>
                  {data.club?.verification_status === "APPROVED" ? "Verified" : data.club?.verification_status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isApproved
                  ? "Your organization is verified by campus administration and authorized for campus activities."
                  : "Your club registration is currently pending administrative review. Event requests can be submitted once approved."}
              </p>
            </div>
          </div>

          {/* Faculty Advisor Card */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Faculty Advisor:</span>
                {data.club?.advisor_name ? (
                  <span className="text-xs font-semibold text-foreground">
                    {data.club.advisor_name}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">None Assigned</span>
                )}
                {data.club?.advisor_status && (
                  <Badge variant={data.club.advisor_status}>
                    {data.club.advisor_status === "ACCEPTED" ? "Advisor Accepted" : data.club.advisor_status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hasAcceptedAdvisor
                  ? `Advised by ${data.club?.advisor_name} (${data.club?.advisor_email}). Event requests are automatically routed for advisor review.`
                  : data.club?.advisor_name
                  ? `Nomination sent to ${data.club?.advisor_name}. Awaiting acceptance by faculty advisor.`
                  : "No faculty advisor assigned. Please contact Student Affairs."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Advisor</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {data.stats.pending_advisor_count || 0}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">Awaiting advisor endorsement</span>
          </div>

          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endorsed</span>
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-2">
              {data.stats.endorsed_pending_admin_count || 0}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">Awaiting admin room allocation</span>
          </div>

          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allocated Venues</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
              {data.stats.approved_events_count || 0}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">Confirmed bookings scheduled</span>
          </div>

          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Returned / Closed</span>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {data.stats.rejected_events_count || 0}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">Resolved with feedback</span>
          </div>
        </div>

        {/* Two-Column Grid: Upcoming Confirmed Bookings & Recent Event Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Confirmed Bookings */}
          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Upcoming Club Bookings</span>
              </h2>
              <Link href="/bookings" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data.upcoming_bookings.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No upcoming confirmed club reservations.</p>
            ) : (
              <div className="space-y-2.5">
                {data.upcoming_bookings.map((booking: any) => (
                  <div key={booking.id} className="p-3 bg-muted/40 border border-border rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{booking.title}</span>
                      <Badge variant="CONFIRMED" className="text-[10px] py-0 px-1">CONFIRMED</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-mono text-primary font-semibold">{booking.resource_code}</span>
                      <span>{booking.resource_name}</span>
                      <span>({booking.location})</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {formatCampusDateTime(booking.start_time)} to {formatCampusTime(booking.end_time)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Event Requests */}
          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Recent Event Proposals</span>
              </h2>
              <Link href="/requests" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data.recent_requests.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No event requests submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recent_requests.map((req: any) => {
                  const statusDesc = getRequestStatusDescriptor(req.status, req.advisor_review_status, "CLUB");
                  return (
                    <div key={req.id} className="p-3 bg-muted/40 border border-border rounded-md space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">{req.title}</span>
                          {req.event_type && (
                            <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                              {req.event_type}
                            </span>
                          )}
                        </div>
                        <Badge variant={statusDesc.variant} className="text-[10px] py-0 px-1.5">
                          {statusDesc.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Venue Type: {req.resource_type_name}</span>
                        <span>Capacity: {req.expected_capacity}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatCampusDate(req.start_time)} · {formatCampusTime(req.start_time)} to {formatCampusTime(req.end_time)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 2. FACULTY DASHBOARD VIEW (With Advisor Desk Banner)
  // ==========================================================================
  if (data.role === "FACULTY") {
    const isAdvisor = data.advisor_desk?.is_advisor;
    const pendingReviewsCount = data.advisor_desk?.pending_reviews_count || 0;
    const pendingInvitationsCount = data.advisor_desk?.pending_invitations?.length || 0;

    return (
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Faculty Academic Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submit resource requests, review recommendations, and oversee advised student clubs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/request/new">
              <Button size="sm" className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>New Resource Request</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Advisor Desk Notification Banner if faculty advises clubs or has pending actions */}
        {isAdvisor && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Faculty Advisor Responsibilities</h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    You are the designated advisor for {data.advisor_desk.active_clubs.length} student clubs.
                    {pendingReviewsCount > 0 && (
                      <span className="font-bold text-amber-900 ml-1">
                        You have {pendingReviewsCount} club event proposals awaiting endorsement.
                      </span>
                    )}
                    {pendingInvitationsCount > 0 && (
                      <span className="font-bold text-indigo-900 ml-1">
                        ({pendingInvitationsCount} new advisor nomination{pendingInvitationsCount > 1 ? "s" : ""})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Link href="/advisor/inbox">
                <Button size="sm" className="bg-indigo-700 hover:bg-indigo-800 text-white shrink-0 gap-1.5 font-medium">
                  <span>Open Advisor Desk</span>
                  {(pendingReviewsCount > 0 || pendingInvitationsCount > 0) && (
                    <span className="rounded-full bg-white text-indigo-900 px-1.5 py-0.2 text-[10px] font-bold">
                      {pendingReviewsCount + pendingInvitationsCount}
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Requests</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {data.stats.pending_requests_count}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">Awaiting admin review & allocation</span>
          </div>

          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved Reservations</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {data.stats.approved_requests_count}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">Successfully allocated and confirmed</span>
          </div>

          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolved / Closed</span>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-2">
              {data.stats.rejected_requests_count}
            </p>
            <span className="text-[11px] text-muted-foreground mt-1 block">Resolved with feedback notes</span>
          </div>
        </div>

        {/* Two-Column Grid: Upcoming Bookings & Recent Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Confirmed Reservations */}
          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Upcoming Confirmed Bookings</span>
              </h2>
              <Link href="/bookings" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data.upcoming_bookings.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No upcoming confirmed reservations.</p>
            ) : (
              <div className="space-y-2.5">
                {data.upcoming_bookings.map((booking: any) => (
                  <div key={booking.id} className="p-3 bg-muted/40 border border-border rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{booking.title}</span>
                      <Badge variant="CONFIRMED" className="text-[10px] py-0 px-1">CONFIRMED</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-mono text-primary font-semibold">{booking.resource_code}</span>
                      <span>{booking.resource_name}</span>
                      <span>({booking.location})</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {formatCampusDateTime(booking.start_time)} to {formatCampusTime(booking.end_time)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Submitted Requests */}
          <div className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Recent Booking Requests</span>
              </h2>
              <Link href="/requests" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {data.recent_requests.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No requests submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recent_requests.map((req: any) => (
                  <div key={req.id} className="p-3 bg-muted/40 border border-border rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{req.title}</span>
                      <Badge variant={req.status} className="text-[10px] py-0 px-1">{req.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Type: {req.resource_type_name}</span>
                      <span>Expected: {req.expected_capacity} seats</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {formatCampusDateTime(req.start_time)} to {formatCampusTime(req.end_time)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 3. ADMIN DASHBOARD VIEW
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Administrative Operations Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Campus-wide resource triage, allocation management, registration verification, and conflict supervision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/registrations">
            <Button size="sm" variant="outline" className="gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Account Registrations</span>
              {data.stats.pending_registrations_count > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold">
                  {data.stats.pending_registrations_count}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/admin/requests">
            <Button size="sm" className="gap-1.5">
              <span>Go to Request Triage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ready for Allocation</span>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2">
            {data.stats.ready_for_allocation_count ?? data.pending_requests.length}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">Endorsed club & faculty requests</span>
        </div>

        <div className="bg-card border border-border rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Registrations</span>
          <p className="text-2xl font-bold font-mono text-indigo-700 mt-2">
            {data.stats.pending_registrations_count || 0}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">Applicants awaiting verification</span>
        </div>

        <div className="bg-card border border-border rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Rooms</span>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            {data.stats.available_resources_count}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">Ready for allocation</span>
        </div>

        <div className="bg-card border border-border rounded-md p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In Maintenance</span>
          <p className="text-2xl font-bold font-mono text-orange-700 mt-2">
            {data.stats.maintenance_resources_count}
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 block">Active servicing locks</span>
        </div>
      </div>

      {/* Pending Account Registrations Alert if any */}
      {data.pending_registrations && data.pending_registrations.length > 0 && (
        <div className="bg-card border border-border rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-700" />
              <span>Pending Account Registrations Requiring Verification</span>
            </h2>
            <Link href="/admin/registrations" className="text-xs text-primary hover:underline">
              Review all ({data.stats.pending_registrations_count})
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.pending_registrations.map((reg: any) => (
              <div key={reg.id} className="p-3 bg-muted/40 border border-border rounded-md text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{reg.name}</span>
                  <Badge variant={reg.role}>{reg.role}</Badge>
                </div>
                <div className="text-muted-foreground">{reg.email}</div>
                <div className="text-[11px] text-muted-foreground">
                  {reg.role === "CLUB" ? reg.club_name : reg.department_name}
                </div>
                <div className="text-[10px] text-muted-foreground pt-1">
                  Submitted {formatCampusDateTime(reg.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Triage Table (Clean label without internal database view name) */}
      <div className="bg-card border border-border rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Pending Approvals Queue</span>
          </h2>
          <Link href="/admin/requests" className="text-xs text-primary hover:underline">
            Open Triage Desk
          </Link>
        </div>

        {data.pending_requests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No pending requests in queue.</p>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Title / Event</Th>
                <Th>Applicant & Role</Th>
                <Th>Type & Capacity</Th>
                <Th>Requested Slot</Th>
                <Th>Wait Time</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.pending_requests.map((r: any) => (
                <Tr key={r.request_id}>
                  <Td className="font-mono text-xs text-muted-foreground">#{r.request_id}</Td>
                  <Td className="font-semibold text-xs text-foreground">
                    <div>{r.title}</div>
                    {r.event_type && (
                      <span className="text-[10px] font-normal text-muted-foreground">{r.event_type}</span>
                    )}
                  </Td>
                  <Td className="text-xs">
                    <div className="font-medium text-foreground">{r.faculty_name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Badge variant={r.request_type || "FACULTY"} className="text-[9px] py-0 px-1">
                        {r.request_type === "CLUB" ? "CLUB (ENDORSED)" : "FACULTY"}
                      </Badge>
                      <span>{r.department_name}</span>
                    </div>
                  </Td>
                  <Td className="text-xs">
                    <div>{r.resource_type_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.expected_capacity} seats</div>
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    <div>{formatCampusDate(r.start_time)}</div>
                    <div className="text-[11px] font-mono">{formatCampusTime(r.start_time)} – {formatCampusTime(r.end_time)}</div>
                  </Td>
                  <Td className="text-xs text-muted-foreground font-mono">{r.wait_hours}h</Td>
                  <Td className="text-right">
                    <Link href="/admin/requests">
                      <Button size="sm" variant="outline" className="text-xs py-0.5 px-2">
                        Triage
                      </Button>
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Utilization Snapshot (Clean human-readable label) */}
      <div className="bg-card border border-border rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span>Campus Resource Utilization Overview</span>
          </h2>
          <span className="text-[11px] text-muted-foreground">Based on 30-day operating baseline (300h)</span>
        </div>

        <Table>
          <Thead>
            <Tr>
              <Th>Code</Th>
              <Th>Resource Name</Th>
              <Th>Type</Th>
              <Th>Department</Th>
              <Th>Capacity</Th>
              <Th>Status</Th>
              <Th>30-Day Booked</Th>
              <Th>Utilization %</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.top_utilized_resources.map((item: any) => (
              <Tr key={item.resource_id}>
                <Td className="font-mono text-xs font-semibold text-primary">{item.resource_code}</Td>
                <Td className="text-xs font-medium text-foreground">{item.resource_name}</Td>
                <Td className="text-xs text-muted-foreground">{item.resource_type_name}</Td>
                <Td className="text-xs text-muted-foreground">{item.department_name}</Td>
                <Td className="text-xs font-mono">{item.capacity}</Td>
                <Td><Badge status={item.status} className="text-[10px] py-0 px-1" /></Td>
                <Td className="text-xs font-mono">{item.booked_hours_last_30_days} hrs</Td>
                <Td className="text-xs font-mono font-bold text-foreground">{item.utilization_percentage}%</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
