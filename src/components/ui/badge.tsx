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
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "PENDING":
      case "SCHEDULED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MAINTENANCE":
      case "IN_PROGRESS":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "REJECTED":
      case "CANCELLED":
      case "UNAVAILABLE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ADMIN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "FACULTY":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono tracking-tight ${getStyle(
        resolvedVariant
      )} ${className}`}
    >
      {children || status}
    </span>
  );
};
