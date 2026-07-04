"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/components/Toast";
import Navbar from "@/components/Navbar";
import { CountryBadge, Skeleton } from "@/components/ui";
import { IconCard, IconPlus, IconTrash, IconCheck } from "@/components/Icons";

interface PaymentMethod {
  _id: string;
  label: string;
  type: string;
  last4: string;
  country: "INDIA" | "AMERICA";
  isDefault: boolean;
}

export default function SettingsPage() {
  const { user, can, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [form, setForm] = useState({ label: "", type: "CARD", last4: "", country: "INDIA", isDefault: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<PaymentMethod[]>("/api/payment-methods").then(setMethods).catch((e) => toast.error("Failed to load", e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!can("UPDATE_PAYMENT_METHOD")) { router.replace("/dashboard"); return; }
    load();
  }, [user, can, load, router]);

  const grouped = useMemo(() => {
    const g: Record<string, PaymentMethod[]> = { INDIA: [], AMERICA: [] };
    methods?.forEach((m) => g[m.country].push(m));
    return g;
  }, [methods]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/payment-methods", { method: "POST", body: JSON.stringify(form) });
      toast.success("Payment method added", form.label);
      setForm({ label: "", type: "CARD", last4: "", country: "INDIA", isDefault: false });
      load();
    } catch (e) {
      toast.error("Could not add", (e as Error).message);
    } finally { setSaving(false); }
  };

  const makeDefault = async (m: PaymentMethod) => {
    try {
      await api(`/api/payment-methods/${m._id}`, { method: "PUT", body: JSON.stringify({ isDefault: true }) });
      toast.success("Default updated", `${m.label} is now default for ${m.country}.`);
      load();
    } catch (e) { toast.error("Update failed", (e as Error).message); }
  };

  const remove = async (m: PaymentMethod) => {
    try {
      await api(`/api/payment-methods/${m._id}`, { method: "DELETE" });
      toast.info("Removed", m.label);
      load();
    } catch (e) { toast.error("Delete failed", (e as Error).message); }
  };

  if (loading || !user) return <div className="center-min">Loading…</div>;

  return (
    <>
      <Navbar user={user} can={can} />
      <div className="container fade-in">
        <div className="page-head">
          <div className="eyebrow">Admin</div>
          <h1>Payment Methods</h1>
          <p className="subtle" style={{ marginTop: 6 }}>
            Only Admins can manage the payment methods used at checkout — per region.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }} className="settings-grid">
          {/* Existing methods, grouped by country */}
          <div className="stack gap-4">
            {methods === null ? (
              <div className="card">
                {[0, 1].map((i) => (
                  <div className="list-row" key={i}><div className="grow"><Skeleton style={{ height: 16, width: "50%", marginBottom: 8 }} /><Skeleton style={{ height: 12, width: "30%" }} /></div></div>
                ))}
              </div>
            ) : (
              (["INDIA", "AMERICA"] as const).map((country) => (
                <div className="card" key={country}>
                  <div className="list-row" style={{ background: "var(--surface-2)", borderRadius: "18px 18px 0 0" }}>
                    <CountryBadge country={country} />
                    <span className="spacer" />
                    <span className="subtle">{grouped[country].length} method(s)</span>
                  </div>
                  <div className="list">
                    {grouped[country].length === 0 ? (
                      <div className="list-row subtle" style={{ padding: 20 }}>No methods for this region.</div>
                    ) : (
                      grouped[country].map((m) => (
                        <div className="list-row" key={m._id}>
                          <div style={{ width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--surface-2)", boxShadow: "inset 0 0 0 1px var(--border)", flex: "none" }}>
                            <IconCard size={18} />
                          </div>
                          <div className="grow stack gap-1">
                            <div className="row-flex gap-2 wrap">
                              <strong>{m.label}</strong>
                              {m.isDefault && <span className="badge admin">DEFAULT</span>}
                            </div>
                            <span className="subtle">{m.type} ·•••• {m.last4}</span>
                          </div>
                          <div className="row-flex gap-2">
                            {!m.isDefault && (
                              <button className="btn ghost sm" onClick={() => makeDefault(m)}>
                                <IconCheck size={15} /> Set default
                              </button>
                            )}
                            <button className="icon-btn" title="Remove" onClick={() => remove(m)}>
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add form */}
          <div className="card pad" style={{ position: "sticky", top: 88 }}>
            <h3 style={{ marginBottom: 4 }}>Add a method</h3>
            <p className="subtle" style={{ marginBottom: 18 }}>Attach a new payment method to a region.</p>
            <form onSubmit={create}>
              <div className="field">
                <label>Label</label>
                <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Corporate Visa" required />
              </div>
              <div className="field">
                <label>Type</label>
                <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>CARD</option><option>UPI</option><option>NET_BANKING</option>
                </select>
              </div>
              <div className="field">
                <label>Last 4 / identifier</label>
                <input className="input" value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value })} placeholder="4242" />
              </div>
              <div className="field">
                <label>Region</label>
                <select className="select" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  <option value="INDIA">INDIA</option><option value="AMERICA">AMERICA</option>
                </select>
              </div>
              <div className="field">
                <label className="checkbox">
                  <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                  Set as default for this region
                </label>
              </div>
              <button className="btn primary block" disabled={saving}>
                <IconPlus size={17} /> {saving ? "Adding…" : "Add payment method"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
