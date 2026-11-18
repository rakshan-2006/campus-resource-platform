import React from "react";

export type BadgeVariant =
  | "AVAILABLE"
  | "MAINTENANCE"
  | "UNAVAILABLE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "CONFIRMED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ADMIN"
  | "FACULTY"
  | "CLUB"
  | "PENDING_ADVISOR"
  | "ENDORSED"
  | "NOT_APPLICABLE"
  | "ACCEPTED"
  | "DECLINED"
  | "REPLACED"
  | "default";

interface BadgeProps {
  status?: string;
  variant?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  children,
  className = "",
}) => {
  const resolvedVariant = (variant || status || "default").toUpperCase();

  const getStyle = (v: string) => {
    switch (v) {
      case "AVAILABLE":
      case "APPROVED":
      case "CONFIRMED":
      case "COMPLETED":
      case "ACCEPTED":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold";
      case "PENDING":
      case "SCHEDULED":
        return "bg-amber-100 text-amber-950 border-amber-300 font-semibold";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-950 border-orange-300 font-semibold";
      case "PENDING_ADVISOR":
        return "bg-amber-100 text-amber-900 border-amber-400 font-semibold";
      case "ENDORSED":
        return "bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold";
      case "MAINTENANCE":
      case "REJECTED":
      case "CANCELLED":
      case "DECLINED":
      case "UNAVAILABLE":
        return "bg-red-100 text-red-900 border-red-300 font-semibold";
      case "ADMIN":
        return "bg-purple-100 text-purple-900 border-purple-300 font-semibold";
      case "FACULTY":
        return "bg-blue-100 text-blue-900 border-blue-300 font-semibold";
      case "CLUB":
        return "bg-teal-100 text-teal-900 border-teal-300 font-semibold";
      case "NOT_APPLICABLE":
        return "bg-slate-100 text-slate-700 border-slate-300 font-normal";
      case "REPLACED":
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 font-medium";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${getStyle(
        resolvedVariant
      )} ${className}`}
    >
      {children || status || variant}
    </span>
  );
};

/**
 * Helper to display clear next required action across requests
 */
export function getRequestStatusDescriptor(
  reqOrStatus: string | { status: string; request_type?: string; advisor_review_status?: string },
  advisor_review_status?: string,
  request_type?: string
): { label: string; variant: BadgeVariant; nextAction: string } {
  let status: string;
  let advStatus: string | undefined;
  let reqType: string | undefined;

  if (typeof reqOrStatus === "object" && reqOrStatus !== null) {
    status = reqOrStatus.status;
    advStatus = reqOrStatus.advisor_review_status;
    reqType = reqOrStatus.request_type;
  } else {
    status = reqOrStatus;
    advStatus = advisor_review_status;
    reqType = request_type;
  }

  if (status === "APPROVED") {
    return {
      label: "Approved & Allocated",
      variant: "APPROVED",
      nextAction: "Resource booked & confirmed",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "Rejected",
      variant: "REJECTED",
      nextAction: "Request closed / declined",
    };
  }
  if (status === "CANCELLED") {
    return {
      label: "Cancelled",
      variant: "CANCELLED",
      nextAction: "Request cancelled by user",
    };
  }

  // PENDING state
  if (reqType === "CLUB") {
    if (advStatus === "PENDING_ADVISOR") {
      return {
        label: "Awaiting Advisor Review",
        variant: "PENDING_ADVISOR",
        nextAction: "Faculty advisor review required",
      };
    }
    if (advStatus === "ENDORSED") {
      return {
        label: "Advisor Endorsed",
        variant: "ENDORSED",
        nextAction: "Administrator allocation pending",
      };
    }
  }

  return {
    label: "Awaiting Triage",
    variant: "PENDING",
    nextAction: "Administrator allocation pending",
  };
}
