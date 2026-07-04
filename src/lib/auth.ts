import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import type { AuthUser, Permission } from "@/types";
import { hasPermission } from "@/lib/rbac";
import { accessService } from "@/services/access.service";
import { env } from "@/config/env";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export function signToken(user: AuthUser): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign(user, env.JWT_SECRET, options);
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & AuthUser;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      country: decoded.country,
    };
  } catch {
    return null;
  }
}

/** Extract and verify the bearer token from an incoming request. */
export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Authentication guard: returns the authenticated user or throws 401.
 * Use this when an endpoint needs a logged-in user but no specific permission.
 */
export function requireAuth(req: NextRequest): AuthUser {
  const user = getUserFromRequest(req);
  if (!user) throw new UnauthorizedError("Not authenticated. Please log in.");
  return user;
}

/**
 * Authentication + authorization guard (DB-driven).
 *
 * Verifies the token, then checks the required permission against the role's
 * CURRENT permissions loaded from the database (via the cached access service),
 * so Admin changes to a role take effect live. Throws 401 or 403 as needed.
 */
export async function requireAccess(
  req: NextRequest,
  permission: Permission
): Promise<AuthUser> {
  const user = requireAuth(req);
  const permissions = await accessService.getRolePermissions(user.role);
  if (!hasPermission(permissions, permission)) {
    throw new ForbiddenError(
      `Your role (${user.role}) is not permitted to perform this action.`
    );
  }
  return user;
}
