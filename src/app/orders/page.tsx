"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getCached } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/components/Toast";
import Navbar from "@/components/Navbar";
import { CountryBadge, EmptyState, Skeleton, money, moneyINR } from "@/components/ui";
import { IconReceipt, IconInfo, IconStore } from "@/components/Icons";

interface OrderItem { name: string; price: number; quantity: number; }
interface Order {
  _id: string;
  restaurantName: string;
  country: "INDIA" | "AMERICA";
  items: OrderItem[];
  totalAmount: number;
  status: "CART" | "PLACED" | "CANCELLED";
  user?: { name: string; role: string };
  paymentMethod?: { label: string } | null;
  createdAt: string;
}
interface PaymentMethod { _id: string; label: string; country: string; isDefault: boolean; }

export default function OrdersPage() {
  const { user, can, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[] | null>(
    () => getCached<Order[]>("/api/orders")
  );
  const [methods, setMethods] = useState<PaymentMethod[]>(
    () => getCached<PaymentMethod[]>("/api/payment-methods") || []
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"ALL" | "CART" | "PLACED" | "CANCELLED">("ALL");

  const load = useCallback(() => {
    api<Order[]>("/api/orders").then(setOrders).catch((e) => toast.error("Failed to load orders", e.message));
    api<PaymentMethod[]>("/api/payment-methods").then(setMethods).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const checkout = async (order: Order, paymentMethodId: string) => {
    setBusy(order._id);
    try {
      const res = await api<{ message: string }>(`/api/orders/${order._id}/checkout`, {
        method: "POST", body: JSON.stringify({ paymentMethodId }),
      });
      toast.success("Payment successful", res.message);
      load();
    } catch (e) {
      toast.error("Checkout failed", (e as Error).message);
    } finally { setBusy(null); }
  };

  const cancel = async (order: Order) => {
    setBusy(order._id);
    try {
      await api(`/api/orders/${order._id}`, { method: "DELETE" });
      toast.info("Order cancelled", order.restaurantName);
      load();
    } catch (e) {
      toast.error("Could not cancel", (e as Error).message);
    } finally { setBusy(null); }
  };

  const counts = useMemo(() => {
    const c = { ALL: orders?.length ?? 0, CART: 0, PLACED: 0, CANCELLED: 0 };
    orders?.forEach((o) => { c[o.status]++; });
    return c;
  }, [orders]);

  const visible = useMemo(
    () => (orders ?? []).filter((o) => tab === "ALL" || o.status === tab),
    [orders, tab]
  );

  if (loading || !user) return <div className="center-min">Loading…</div>;

  return (
    <>
      <Navbar user={user} can={can} />
      <div className="container fade-in">
        <div className="page-head">
          <div className="eyebrow">Activity</div>
          <h1>Orders</h1>
          <p className="subtle" style={{ marginTop: 6 }}>
            {user.role === "ADMIN" ? "Admin view — orders across all regions." : `Orders in ${user.country}.`}
          </p>

          <div className="spread wrap gap-3" style={{ marginTop: 18 }}>
            <div className="pill-group">
              {(["ALL", "CART", "PLACED", "CANCELLED"] as const).map((t) => (
                <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                  {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()} ({counts[t]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {!can("CHECKOUT_ORDER") && (
          <div className="notice info">
            <IconInfo size={18} />
            <span>
              Your role (<strong>{user.role}</strong>) can create orders, but checkout and cancel
              require a Manager or Admin.
            </span>
          </div>
        )}

        {orders === null ? (
          <div className="card">
            {[0, 1, 2].map((i) => (
              <div className="list-row" key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="grow"><Skeleton style={{ height: 16, width: "40%", marginBottom: 8 }} /><Skeleton style={{ height: 12, width: "70%" }} /></div>
                <Skeleton style={{ height: 34, width: 90, borderRadius: 10 }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconReceipt size={30} />}
            title={tab === "ALL" ? "No orders yet" : `No ${tab.toLowerCase()} orders`}
            desc="Create an order from a restaurant to get started."
            action={<button className="btn primary" onClick={() => router.push("/dashboard")}><IconStore size={18} /> Browse restaurants</button>}
          />
        ) : (
          <div className="card list">
            {visible.map((o) => {
              const countryMethods = methods.filter((m) => m.country === o.country);
              return (
                <div className="list-row" key={o._id}>
                  <div className="grow stack gap-1">
                    <div className="row-flex gap-2 wrap">
                      <strong>{o.restaurantName}</strong>
                      <span className={`badge status-${o.status}`}>{o.status}</span>
                      <CountryBadge country={o.country} />
                    </div>
                    <span className="subtle">
                      {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </span>
                    <span className="subtle" style={{ fontSize: 12 }}>
                      {o.user ? `${o.user.name} · ${o.user.role}` : ""}
                      {o.paymentMethod ? ` · paid via ${o.paymentMethod.label}` : ""}
                    </span>
                  </div>

                  <div className="stack gap-2" style={{ alignItems: "flex-end" }}>
                    <div className="stack" style={{ alignItems: "flex-end", gap: 0 }}>
                      <strong className="tabular" style={{ fontSize: 17 }}>
                        {moneyINR(o.country, o.totalAmount)}
                      </strong>
                      {o.country === "AMERICA" && (
                        <span className="subtle" style={{ fontSize: 11 }}>
                          {money(o.country, o.totalAmount)}
                        </span>
                      )}
                    </div>
                    {o.status === "CART" && (can("CHECKOUT_ORDER") || can("CANCEL_ORDER")) && (
                      <div className="row-flex gap-2 wrap" style={{ justifyContent: "flex-end" }}>
                        {can("CHECKOUT_ORDER") && (
                          <CheckoutControl methods={countryMethods} busy={busy === o._id} onCheckout={(pm) => checkout(o, pm)} />
                        )}
                        {can("CANCEL_ORDER") && (
                          <button className="btn danger sm" disabled={busy === o._id} onClick={() => cancel(o)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
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

function CheckoutControl({
  methods, busy, onCheckout,
}: { methods: PaymentMethod[]; busy: boolean; onCheckout: (pmId: string) => void; }) {
  const def = methods.find((m) => m.isDefault) || methods[0];
  const [pmId, setPmId] = useState(def?._id || "");
  useEffect(() => { if (!pmId && def) setPmId(def._id); }, [def, pmId]);

  return (
    <div className="row-flex gap-2">
      <select className="select" style={{ width: "auto", padding: "8px 12px", fontSize: 13 }} value={pmId} onChange={(e) => setPmId(e.target.value)}>
        {methods.map((m) => <option key={m._id} value={m._id}>{m.label}</option>)}
      </select>
      <button className="btn success sm" disabled={busy || !pmId} onClick={() => onCheckout(pmId)}>
        {busy ? "Paying…" : "Checkout & Pay"}
      </button>
    </div>
  );
}
