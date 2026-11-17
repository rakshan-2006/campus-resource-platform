// src/lib/api-response.ts
// Standardized API Envelope and Database Error Mapping

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiSuccessPayload<T> {
  data: T;
}

export interface ApiErrorPayload {
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Return a standardized success response.
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiSuccessPayload<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * Return a standardized error response mapped from an error object.
 */
export function apiError(error: unknown): NextResponse<ApiErrorPayload> {
  console.error("[API Error]", error);

  // Zod Schema Validation Error
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));
    return NextResponse.json(
      {
        error: {
          message: "Request validation failed",
          code: "VALIDATION_ERROR",
          details: formattedErrors,
        },
      },
      { status: 400 }
    );
  }

  // PostgreSQL Native Error mapping
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as { code: string; message: string; detail?: string };

    // 23P01: Exclusion Violation (Double booking conflict via GiST)
    if (pgError.code === "23P01") {
      return NextResponse.json(
        {
          error: {
            message: "Double-booking conflict: This resource already has a confirmed reservation during the requested time window.",
            code: "CONFLICT_EXCLUSION_VIOLATION",
          },
        },
        { status: 409 }
      );
    }

    // 23505: Unique Violation
    if (pgError.code === "23505") {
      return NextResponse.json(
        {
          error: {
            message: "A record with this identifier already exists.",
            code: "UNIQUE_VIOLATION",
            details: pgError.detail,
          },
        },
        { status: 409 }
      );
    }

    // 23503: Foreign Key Violation
    if (pgError.code === "23503") {
      return NextResponse.json(
        {
          error: {
            message: "Referenced resource, facility, or department does not exist or cannot be deleted.",
            code: "FOREIGN_KEY_VIOLATION",
            details: pgError.detail,
          },
        },
        { status: 400 }
      );
    }

    // 23514: Check Constraint Violation
    if (pgError.code === "23514") {
      return NextResponse.json(
        {
          error: {
            message: "Constraint violation: Invalid duration, negative capacity, or illegal status value.",
            code: "CHECK_CONSTRAINT_VIOLATION",
          },
        },
        { status: 400 }
      );
    }

    // P0001: PL/pgSQL RAISE EXCEPTION
    if (pgError.code === "P0001") {
      const msg = pgError.message || "Business rule violated";
      let status = 400;
      let code = "BUSINESS_RULE_ERROR";

      if (msg.includes("UNAUTHORIZED")) {
        status = 401;
        code = "UNAUTHORIZED";
      } else if (msg.includes("FORBIDDEN")) {
        status = 403;
        code = "FORBIDDEN";
      } else if (msg.includes("CONFLICT") || msg.includes("RESOURCE_CONFLICT")) {
        status = 409;
        code = "RESOURCE_CONFLICT";
      } else if (msg.includes("NOT_FOUND")) {
        status = 404;
        code = "NOT_FOUND";
      }

      return NextResponse.json(
        {
          error: {
            message: msg.replace(/^[A-Z_]+:\s*/, ""),
            code,
          },
        },
        { status }
      );
    }
  }

  // Standard JavaScript Error
  if (error instanceof Error) {
    for (const [prefix, status] of [["NOT_FOUND", 404], ["INVALID_STATE", 409], ["CONFLICT", 409]] as const) {
      if (error.message.startsWith(`${prefix}: `)) {
        return NextResponse.json(
          { error: { message: error.message.slice(prefix.length + 2), code: prefix } },
          { status }
        );
      }
    }
    if (error.message.startsWith("UNAUTHORIZED")) {
      return NextResponse.json(
        {
          error: {
            message: error.message.replace(/^UNAUTHORIZED:\s*/, ""),
            code: "UNAUTHORIZED",
          },
        },
        { status: 401 }
      );
    }
    if (error.message.startsWith("FORBIDDEN")) {
      return NextResponse.json(
        {
          error: {
            message: error.message.replace(/^FORBIDDEN:\s*/, ""),
            code: "FORBIDDEN",
          },
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }

  // Fallback generic internal error
  return NextResponse.json(
    {
      error: {
        message: "An unexpected system error occurred",
        code: "UNKNOWN_ERROR",
      },
    },
    { status: 500 }
  );
}
