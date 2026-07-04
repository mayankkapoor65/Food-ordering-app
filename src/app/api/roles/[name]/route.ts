import { NextRequest } from "next/server";
import { requireAccess } from "@/lib/auth";
import { accessService } from "@/services/access.service";
import { parseBody, UpdateRoleSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/apiResponse";
import { BadRequestError } from "@/lib/errors";
import { Permission, Role as RoleName } from "@/types";

// PUT /api/roles/:name — replace a role's permission set (Admin only, live).
export async function PUT(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    await requireAccess(req, Permission.MANAGE_ACCESS);

    const name = params.name.toUpperCase();
    if (!Object.values(RoleName).includes(name as RoleName)) {
      throw new BadRequestError(`Unknown role: ${params.name}`);
    }

    const { permissions } = await parseBody(req, UpdateRoleSchema);
    const role = await accessService.updateRolePermissions(
      name as RoleName,
      permissions
    );
    return ok(role);
  } catch (err) {
    return handleError(err);
  }
}

export const dynamic = "force-dynamic";
