// src/lib/auth.ts
// Authentication, Password Hashing, Session Management (jose JWT) & Role Checks

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { User, UserRole } from "@/types";
import { sessionSecret } from "@/lib/session-config";

const COOKIE_NAME = "campus_session";

export interface SessionPayload {
  sub: string; // user id as string
  id: number;
  email: string;
  name: string;
  role: UserRole;
  department_id: number;
  department_name?: string;
  exp?: number;
}

/**
 * Hash a plain text password with bcrypt.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

/**
 * Compare plain text password against bcrypt hash.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Create a signed JWT session token.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(sessionSecret());
}

/**
 * Verify and decode a JWT session token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Set httpOnly session cookie.
 */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clear session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Retrieve current authenticated session user from request cookies.
 */
export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    department_id: payload.department_id,
    department_name: payload.department_name,
    created_at: new Date().toISOString(),
  };
}

/**
 * Require a specific role or throw a forbidden error.
 */
export function requireRole(user: User | null, allowedRole: UserRole | UserRole[]): void {
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  const roles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  if (!roles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires role ${roles.join(" or ")}`);
  }
}
