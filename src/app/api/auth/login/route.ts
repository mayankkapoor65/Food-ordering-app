import { NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { parseBody, LoginSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/apiResponse";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    // Throttle by client IP to slow brute-force attempts.
    rateLimit(`login:${clientIp(req)}`);
    const input = await parseBody(req, LoginSchema);
    const result = await authService.login(input);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
