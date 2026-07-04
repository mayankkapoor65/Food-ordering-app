import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { accessService } from "@/services/access.service";
import { ok, handleError } from "@/lib/apiResponse";
import { Permission, PERMISSION_META } from "@/types";

// GET /api/roles — list all roles with their permissions, plus the catalogue of
// assignable permissions (for the admin access-control screen).
// Requires MANAGE_ACCESS.
export async function GET(req: NextRequest) {
  try {
    await requireAccess(req, Permission.MANAGE_ACCESS);
    const roles = await accessService.listRoles();
    const catalogue = Object.values(Permission).map((key) => ({
      key,
      ...PERMISSION_META[key],
    }));
    return ok({ roles, catalogue });
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
