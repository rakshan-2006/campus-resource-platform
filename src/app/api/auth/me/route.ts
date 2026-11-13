// src/app/api/auth/me/route.ts
import { getSessionUser } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError(new Error("UNAUTHORIZED: Not authenticated"));
    }
    return apiSuccess({ user });
  } catch (error) {
    return apiError(error);
  }
}
