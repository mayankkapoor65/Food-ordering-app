"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/components/Toast";
import Navbar from "@/components/Navbar";
import { CountryBadge, Skeleton, money } from "@/components/ui";
import { IconArrowLeft, IconBag, IconStar } from "@/components/Icons";

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}
interface Restaurant {
  _id: string;
  name: string;
  description: string;
  cuisine: string;
  country: "INDIA" | "AMERICA";
  imageEmoji: string;
  menu: MenuItem[];
}

export default function RestaurantPage() {
  const { user, can, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<Restaurant>(`/api/restaurants/${params.id}`)
      .then(setRestaurant)
      .catch((e) => setError(e.message));
  }, [user, params.id]);

  const setQty = (id: string, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] || 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  // Group menu items by category for a cleaner layout.
  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {};
    restaurant?.menu.forEach((m) => {
      (g[m.category] ||= []).push(m);
    });
    return g;
  }, [restaurant]);

  const { total, count } = useMemo(() => {
    if (!restaurant) return { total: 0, count: 0 };
    let total = 0, count = 0;
    for (const item of restaurant.menu) {
      const q = cart[item._id] || 0;
      total += q * item.price;
      count += q;
    }
    return { total, count };
  }, [cart, restaurant]);

  const placeOrder = async () => {
    if (!restaurant || count === 0) return;
    setPlacing(true);
    try {
      const items = Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({ restaurantId: restaurant._id, items }),
      });
      toast.success("Order created", "Head to Orders to check out.");
      router.push("/orders");
    } catch (e) {
      toast.error("Could not create order", (e as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  if (loading || !user) return <div className="center-min">Loading…</div>;

  return (
    <>
      <Navbar user={user} can={can} />
      <div className="container fade-in">
        <button className="btn ghost sm" onClick={() => router.push("/dashboard")}>
          <IconArrowLeft size={16} /> Back to restaurants
        </button>

        {error && <div className="notice error" style={{ marginTop: 18 }}>{error}</div>}

        {!restaurant ? (
          <div style={{ marginTop: 18 }}>
            <Skeleton style={{ height: 110, borderRadius: 18, marginBottom: 16 }} />
            <Skeleton style={{ height: 260, borderRadius: 18 }} />
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="card pad" style={{ marginTop: 18, display: "flex", gap: 20, alignItems: "center" }}>
              <div
                style={{
                  width: 84, height: 84, borderRadius: 20, display: "grid", placeItems: "center",
                  fontSize: 44, background: "var(--surface-2)", boxShadow: "inset 0 0 0 1px var(--border)", flex: "none",
                }}
              >
                {restaurant.imageEmoji}
              </div>
              <div className="grow">
                <div className="row-flex gap-2 wrap">
                  <h1>{restaurant.name}</h1>
                  <CountryBadge country={restaurant.country} />
                </div>
                <p className="subtle" style={{ marginTop: 4 }}>{restaurant.description}</p>
                <div className="row-flex gap-2" style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                  <span className="badge soft"><IconStar size={13} /> 4.6</span>
                  <span>· {restaurant.cuisine}</span>
                  <span>· {restaurant.menu.length} items</span>
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="card" style={{ marginTop: 16 }}>
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="menu-group-title">{category}</div>
                  {items.map((item) => {
                    const qty = cart[item._id] || 0;
                    return (
                      <div className="menu-item" key={item._id}>
                        <div className="grow">
                          <div className="row-flex gap-2 wrap">
                            <strong>{item.name}</strong>
                            <span className="price subtle">{money(restaurant.country, item.price)}</span>
                          </div>
                          <div className="subtle" style={{ marginTop: 2 }}>{item.description}</div>
                        </div>
                        <div className={`stepper ${qty > 0 ? "filled" : ""}`}>
                          <button onClick={() => setQty(item._id, -1)} disabled={qty === 0} aria-label="Decrease">−</button>
                          <span className="count">{qty}</span>
                          <button onClick={() => setQty(item._id, 1)} aria-label="Increase">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Sticky cart bar — appears when items are selected */}
            {count > 0 && (
              <div className="cart-bar">
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center",
                    background: "var(--brand-gradient)", color: "#fff", flex: "none",
                  }}
                >
                  <IconBag size={20} />
                </div>
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{count} item{count > 1 ? "s" : ""} · {money(restaurant.country, total)}</div>
                  <div className="subtle">Create an order to review and check out.</div>
                </div>
                <button className="btn primary" disabled={placing} onClick={placeOrder}>
                  {placing ? "Creating…" : "Create Order"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
