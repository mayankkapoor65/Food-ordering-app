import { describe, it, expect } from "vitest";
import {
  hasPermission,
  buildCountryFilter,
  canAccessCountry,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/rbac";
import { Country, Permission, Role } from "@/types";
import type { AuthUser } from "@/types";

const admin: AuthUser = { id: "1", name: "Admin", email: "a@x.com", role: Role.ADMIN, country: null };
const mgrIndia: AuthUser = { id: "2", name: "MgrIN", email: "b@x.com", role: Role.MANAGER, country: Country.INDIA };
const mgrUsa: AuthUser = { id: "3", name: "MgrUS", email: "c@x.com", role: Role.MANAGER, country: Country.AMERICA };
const memberIndia: AuthUser = { id: "4", name: "MemIN", email: "d@x.com", role: Role.MEMBER, country: Country.INDIA };

// Effective permissions in these unit tests come from the default matrix (which
// is also what seeds the database). hasPermission is the pure check used at
// runtime once a role's permissions are loaded from the DB.
const perms = (u: AuthUser) => DEFAULT_ROLE_PERMISSIONS[u.role];

describe("RBAC — default permission matrix", () => {
  it("Admin can do everything, including managing access", () => {
    for (const p of Object.values(Permission)) {
      expect(hasPermission(perms(admin), p)).toBe(true);
    }
  });

  it("Manager can view, create, checkout, cancel — but NOT payments or access", () => {
    expect(hasPermission(perms(mgrIndia), Permission.VIEW_RESTAURANTS)).toBe(true);
    expect(hasPermission(perms(mgrIndia), Permission.CREATE_ORDER)).toBe(true);
    expect(hasPermission(perms(mgrIndia), Permission.CHECKOUT_ORDER)).toBe(true);
    expect(hasPermission(perms(mgrIndia), Permission.CANCEL_ORDER)).toBe(true);
    expect(hasPermission(perms(mgrIndia), Permission.UPDATE_PAYMENT_METHOD)).toBe(false);
    expect(hasPermission(perms(mgrIndia), Permission.MANAGE_ACCESS)).toBe(false);
  });

  it("Member can only view and create", () => {
    expect(hasPermission(perms(memberIndia), Permission.VIEW_RESTAURANTS)).toBe(true);
    expect(hasPermission(perms(memberIndia), Permission.CREATE_ORDER)).toBe(true);
    expect(hasPermission(perms(memberIndia), Permission.CHECKOUT_ORDER)).toBe(false);
    expect(hasPermission(perms(memberIndia), Permission.CANCEL_ORDER)).toBe(false);
    expect(hasPermission(perms(memberIndia), Permission.UPDATE_PAYMENT_METHOD)).toBe(false);
  });

  it("matches the expected permission counts", () => {
    expect(DEFAULT_ROLE_PERMISSIONS[Role.ADMIN]).toHaveLength(6);
    expect(DEFAULT_ROLE_PERMISSIONS[Role.MANAGER]).toHaveLength(4);
    expect(DEFAULT_ROLE_PERMISSIONS[Role.MEMBER]).toHaveLength(2);
  });
});

describe("Country scoping — the bonus relational access model", () => {
  it("Admin filter is unrestricted", () => {
    expect(buildCountryFilter(admin)).toEqual({});
  });

  it("Managers/Members are filtered to their own country", () => {
    expect(buildCountryFilter(mgrIndia)).toEqual({ country: Country.INDIA });
    expect(buildCountryFilter(mgrUsa)).toEqual({ country: Country.AMERICA });
    expect(buildCountryFilter(memberIndia)).toEqual({ country: Country.INDIA });
  });

  it("canAccessCountry: Admin sees all regions", () => {
    expect(canAccessCountry(admin, Country.INDIA)).toBe(true);
    expect(canAccessCountry(admin, Country.AMERICA)).toBe(true);
  });

  it("canAccessCountry: India users cannot access America and vice-versa", () => {
    expect(canAccessCountry(mgrIndia, Country.INDIA)).toBe(true);
    expect(canAccessCountry(mgrIndia, Country.AMERICA)).toBe(false);
    expect(canAccessCountry(mgrUsa, Country.INDIA)).toBe(false);
    expect(canAccessCountry(memberIndia, Country.AMERICA)).toBe(false);
  });
});
