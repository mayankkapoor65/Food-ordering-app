"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import type { SessionUser } from "@/lib/useAuth";
import { initials } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";
import {
  IconStore,
  IconReceipt,
  IconCard,
  IconLogout,
  IconShield,
} from "@/components/Icons";

export default function Navbar({
  user,
  can,
}: {
  user: SessionUser;
  can: (p: string) => boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { syncFromStorage } = useAuth();

  const logout = () => {
    clearSession();
    syncFromStorage(); // clear shared auth state
    router.replace("/login");
  };

  const NavLink = ({
    href,
    icon,
    label,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
  }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href} className={`nav-link ${active ? "active" : ""}`}>
        {icon}
        <span className="label">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="navbar">
      <Link href="/dashboard" className="brand-mark">
        <span className="brand-logo">
          <IconStore size={19} />
        </span>
        slooze<span className="dot">.</span>eats
      </Link>

      <div className="nav-links">
        <NavLink href="/dashboard" icon={<IconStore size={18} />} label="Restaurants" />
        <NavLink href="/orders" icon={<IconReceipt size={18} />} label="Orders" />
        {can("UPDATE_PAYMENT_METHOD") && (
          <NavLink href="/settings" icon={<IconCard size={18} />} label="Payments" />
        )}
        {can("MANAGE_ACCESS") && (
          <NavLink href="/access" icon={<IconShield size={18} />} label="Access" />
        )}
      </div>

      <div className="spacer" />

      <ThemeToggle />

      <div className="user-chip">
        <div className="meta">
          <div className="name">{user.name}</div>
          <div className="sub">
            {user.role} · {user.country ?? "GLOBAL"}
          </div>
        </div>
        <div className="avatar" title={user.name}>
          {initials(user.name)}
        </div>
        <button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out">
          <IconLogout size={18} />
        </button>
      </div>
    </nav>
  );
}
