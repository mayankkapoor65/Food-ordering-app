"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getCached } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";
import { CardGridSkeleton, CountryBadge, EmptyState } from "@/components/ui";
import { IconSearch, IconStore } from "@/components/Icons";

interface Restaurant {
  _id: string;
  name: string;
  description: string;
  cuisine: string;
  country: "INDIA" | "AMERICA";
  imageEmoji: string;
  menu: { _id: string; price: number }[];
}

export default function DashboardPage() {
  const { user, can, loading } = useAuth();
  const router = useRouter();
  // Seed from the in-memory cache so returning to this page is instant, then
  // revalidate in the background.
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(
    () => getCached<Restaurant[]>("/api/restaurants")
  );
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<"ALL" | "INDIA" | "AMERICA">("ALL");

  useEffect(() => {
    if (!user) return;
    api<Restaurant[]>("/api/restaurants")
      .then(setRestaurants)
      .catch((e) => setError(e.message));
  }, [user]);

  const isAdmin = user?.role === "ADMIN";

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    return restaurants.filter((r) => {
      const matchesQuery =
        !query ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(query.toLowerCase());
      const matchesCountry = countryFilter === "ALL" || r.country === countryFilter;
      return matchesQuery && matchesCountry;
    });
  }, [restaurants, query, countryFilter]);

  if (loading || !user) return <div className="center-min">Loading…</div>;

  return (
    <>
      <Navbar user={user} can={can} />
      <div className="container fade-in">
        <div className="page-head">
          <div className="spread wrap gap-4">
            <div>
              <div className="eyebrow">Discover</div>
              <h1>Restaurants</h1>
              <p className="subtle" style={{ marginTop: 6 }}>
                {isAdmin
                  ? "Admin view — browsing every region."
                  : `Available in your region · ${user.country}.`}
              </p>
            </div>
            <div className="input-group" style={{ minWidth: 260 }}>
              <span className="lead-icon"><IconSearch size={18} /></span>
              <input
                className="input"
                placeholder="Search restaurants or cuisine…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Admin can slice by country to show off the isolation model */}
          {isAdmin && (
            <div className="pill-group" style={{ marginTop: 18 }}>
              {(["ALL", "INDIA", "AMERICA"] as const).map((c) => (
                <button
                  key={c}
                  className={countryFilter === c ? "active" : ""}
                  onClick={() => setCountryFilter(c)}
                >
                  {c === "ALL" ? "All regions" : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div className="notice error">{error}</div>}

        {restaurants === null ? (
          <CardGridSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconStore size={30} />}
            title="No restaurants found"
            desc={query ? "Try a different search term." : "No restaurants available for your region yet."}
          />
        ) : (
          <div className="grid">
            {filtered.map((r) => {
              const from = Math.min(...r.menu.map((m) => m.price));
              return (
                <div
                  key={r._id}
                  className="card card-hover rcard"
                  onClick={() => router.push(`/restaurants/${r._id}`)}
                >
                  <div className="banner">
                    <span>{r.imageEmoji}</span>
                    <span className="country-tag">
                      <CountryBadge country={r.country} />
                    </span>
                  </div>
                  <div className="body">
                    <h3>{r.name}</h3>
                    <p className="subtle" style={{ marginTop: 4 }}>{r.description}</p>
                    <div className="meta-row">
                      <span>{r.cuisine}</span>
                      <span className="dot-sep">{r.menu.length} items</span>
                      <span className="dot-sep">
                        from {r.country === "INDIA" ? "₹" : "$"}
                        {from}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
