"use client";

// Backwards-compatible hook: auth state now lives in a single app-root provider
// (see components/AuthProvider) so it is fetched once and shared across pages —
// making navigation instant. Pages keep using `useAuth()` unchanged.
export { useAuthContext as useAuth } from "@/components/AuthProvider";
export type { SessionUser } from "@/components/AuthProvider";
