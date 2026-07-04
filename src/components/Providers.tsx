"use client";

import { useEffect } from "react";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import { applyStoredTheme } from "@/components/ThemeToggle";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Apply the saved theme as early as possible on the client.
  useEffect(() => {
    applyStoredTheme();
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
