import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ok, fail } from "@/lib/apiResponse";

/**
 * GET /api/health — liveness/readiness probe.
 * Reports app status and database connectivity. Used by Docker/CI/uptime checks.
 */
export async function GET() {
  try {
    await connectDB();
    const dbState = mongoose.connection.readyState; // 1 = connected
    const healthy = dbState === 1;
    const body = {
      status: healthy ? "ok" : "degraded",
      db: healthy ? "connected" : "disconnected",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    return healthy ? ok(body) : fail("Database not connected", 503, "DB_DOWN");
  } catch {
    return fail("Service unavailable", 503, "UNAVAILABLE");
  }
}

export const dynamic = "force-dynamic";
