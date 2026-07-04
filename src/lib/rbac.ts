import { Country, Permission, Role } from "@/types";
import type { AuthUser } from "@/types";

/**
 * ROLE LAYER (RBAC)
 * -----------------
 * The DEFAULT permission matrix from the assignment. This is only the *seed*
 * for the database — at runtime, each role's effective permissions are read
 * from the `Role` collection (see access.service) so an Admin can change them
 * live. Keeping the default here gives us a single source for seeding and tests.
 *
 *   Function                 ADMIN  MANAGER  MEMBER
 *   view restaurants & menu   yes     yes     yes
 *   create order (add items)  yes     yes     yes
 *   place order (checkout)    yes     yes     no
 *   cancel order              yes     yes     no
 *   update payment method     yes     no      no
 *   manage access control     yes     no      no
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.VIEW_RESTAURANTS,
    Permission.CREATE_ORDER,
    Permission.CHECKOUT_ORDER,
    Permission.CANCEL_ORDER,
    Permission.UPDATE_PAYMENT_METHOD,
    Permission.MANAGE_ACCESS,
  ],
  [Role.MANAGER]: [
    Permission.VIEW_RESTAURANTS,
    Permission.CREATE_ORDER,
    Permission.CHECKOUT_ORDER,
    Permission.CANCEL_ORDER,
  ],
  [Role.MEMBER]: [Permission.VIEW_RESTAURANTS, Permission.CREATE_ORDER],
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [Role.ADMIN]: "Full access across all regions, including access management.",
  [Role.MANAGER]: "Can order, checkout and cancel within their own region.",
  [Role.MEMBER]: "Can browse and create orders within their own region.",
};

/** Pure membership check — used everywhere once permissions are loaded. */
export function hasPermission(
  permissions: Permission[],
  permission: Permission
): boolean {
  return permissions.includes(permission);
}

/**
 * COUNTRY LAYER (Bonus — relational access model)
 * -----------------------------------------------
 * Managers & Members are restricted to data from their own country. Admin
 * (country === null) transcends this and sees everything. Unchanged by the
 * database-driven role work — this is orthogonal to the permission layer.
 */
export function buildCountryFilter(user: AuthUser): Record<string, unknown> {
  if (user.role === Role.ADMIN || user.country === null) return {};
  return { country: user.country };
}

export function canAccessCountry(
  user: AuthUser,
  country: Country | string
): boolean {
  if (user.role === Role.ADMIN || user.country === null) return true;
  return user.country === country;
}
