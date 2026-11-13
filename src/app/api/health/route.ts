// src/app/api/health/route.ts
import { checkPostgresHealth } from "@/lib/db";
import { checkMongoHealth } from "@/lib/mongo";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const [pgHealthy, mongoHealthy] = await Promise.all([
      checkPostgresHealth(),
      checkMongoHealth(),
    ]);

    const isHealthy = pgHealthy && mongoHealthy;

    const payload = {
      status: isHealthy ? "healthy" : "degraded",
      postgres: pgHealthy ? "connected" : "disconnected",
      mongodb: mongoHealthy ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    };

    return apiSuccess(payload, isHealthy ? 200 : 503);
  } catch (error) {
    return apiError(error);
  }
}
