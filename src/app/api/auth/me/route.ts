import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { accessService } from "@/services/access.service";
import { ok, handleError } from "@/lib/apiResponse";

// Returns the authenticated user plus the permissions their role currently
// grants (loaded live from the database) — the frontend uses these to show/hide
// actions, so an Admin's access change is reflected on the user's next load.
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const permissions = await accessService.getRolePermissions(user.role);
    return ok({ user, permissions });
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
