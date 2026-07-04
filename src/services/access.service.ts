import { connectDB } from "@/lib/db";
import { Role as RoleModel, type IRole } from "@/models/Role";
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
} from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { Permission, Role as RoleName } from "@/types";

/**
 * Database-driven role/permission management.
 *
 * Permissions are read live from the `Role` collection so an Admin can change
 * them at runtime. A tiny in-memory cache avoids a DB read on every request;
 * it is invalidated immediately whenever a role is updated, so changes apply
 * effectively instantly on this instance. (In a multi-instance deployment the
 * cache would be Redis or pub/sub invalidated — same interface.)
 */
const CACHE_TTL_MS = 15_000;
type CacheEntry = { permissions: Permission[]; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function setCache(name: string, permissions: Permission[]) {
  cache.set(name, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
}

export const accessService = {
  /** Effective permissions for a role — cached, DB-backed, default fallback. */
  async getRolePermissions(name: RoleName): Promise<Permission[]> {
    const cached = cache.get(name);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;

    await connectDB();
    const role = await RoleModel.findOne({ name }).lean<IRole>();
    // Fall back to the compiled defaults if the roles haven't been seeded yet.
    const permissions = role?.permissions ?? DEFAULT_ROLE_PERMISSIONS[name] ?? [];
    setCache(name, permissions);
    return permissions;
  },

  /** All roles with their permissions (for the admin access-control screen). */
  async listRoles(): Promise<IRole[]> {
    await connectDB();
    const roles = await RoleModel.find().lean<IRole[]>();
    // Order them ADMIN → MANAGER → MEMBER for a predictable UI.
    const order = Object.values(RoleName);
    return roles.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  },

  /**
   * Replace a role's permission set. Validates every value and prevents the
   * Admin role from losing MANAGE_ACCESS (which would lock everyone out).
   */
  async updateRolePermissions(
    name: RoleName,
    permissions: Permission[]
  ): Promise<IRole> {
    await connectDB();

    const valid = new Set(Object.values(Permission));
    const unique = Array.from(new Set(permissions));
    for (const p of unique) {
      if (!valid.has(p)) throw new BadRequestError(`Unknown permission: ${p}`);
    }

    if (name === RoleName.ADMIN && !unique.includes(Permission.MANAGE_ACCESS)) {
      throw new BadRequestError(
        "The Admin role must keep 'Manage access control' to avoid a lockout."
      );
    }

    const role = await RoleModel.findOneAndUpdate(
      { name },
      { $set: { permissions: unique } },
      { new: true }
    ).lean<IRole>();
    if (!role) throw new NotFoundError(`Role ${name} not found.`);

    cache.delete(name); // invalidate immediately → change is live
    logger.info("Role permissions updated", { role: name, count: unique.length });
    return role;
  },

  /** Idempotently create the system roles from the default matrix. */
  async ensureSeeded(): Promise<void> {
    await connectDB();
    for (const name of Object.values(RoleName)) {
      await RoleModel.updateOne(
        { name },
        {
          $setOnInsert: {
            name,
            description: ROLE_DESCRIPTIONS[name],
            permissions: DEFAULT_ROLE_PERMISSIONS[name],
            isSystem: true,
          },
        },
        { upsert: true }
      );
    }
    cache.clear();
  },

  /** Test/maintenance helper. */
  clearCache() {
    cache.clear();
  },
};
