"use client";

// Small presentational helpers shared across pages.

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="skel-card" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card pad empty fade-in">
      <div className="e-ic">{icon}</div>
      <h3>{title}</h3>
      {desc && <p className="subtle" style={{ maxWidth: 380, margin: "0 auto" }}>{desc}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

// Country badge with a leading dot.
export function CountryBadge({ country }: { country: "INDIA" | "AMERICA" | null }) {
  if (!country)
    return (
      <span className="badge global">
        <span className="badge-dot" /> GLOBAL
      </span>
    );
  return (
    <span className={`badge ${country.toLowerCase()}`}>
      <span className="badge-dot" /> {country}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return <span className={`badge ${role.toLowerCase()}`}>{role}</span>;
}

// Currency formatting — ₹ for India, $ for America.
export function money(country: string, n: number) {
  const val = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return country === "INDIA" ? `₹${val}` : `$${val}`;
}

// Initials for the avatar circle.
export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
