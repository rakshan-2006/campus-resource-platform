// src/app/api/auth/logout/route.ts
import { clearSessionCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST() {
  try {
    await clearSessionCookie();
    return apiSuccess({ message: "Logged out successfully" });
  } catch (error) {
    return apiError(error);
  }
}
