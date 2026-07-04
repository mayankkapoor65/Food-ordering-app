"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/Icons";

type Theme = "light" | "dark";

// Applies the saved (or system) theme before paint via a small inline script in
// the layout; this component just toggles + persists it.
export function applyStoredTheme() {
  if (typeof document === "undefined") return;
  const saved = (localStorage.getItem("foa_theme") as Theme) || "dark";
  document.documentElement.setAttribute("data-theme", saved);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("foa_theme") as Theme) || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("foa_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}
