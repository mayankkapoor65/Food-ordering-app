"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, saveSession } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/components/Toast";
import {
  IconStore,
  IconShield,
  IconGlobe,
  IconMail,
  IconLock,
  IconAlert,
} from "@/components/Icons";

const DEMO_ACCOUNTS = [
  { label: "Nick Fury — Admin · Global", email: "nick.fury@slooze.xyz" },
  { label: "Captain Marvel — Manager · India", email: "captain.marvel@slooze.xyz" },
  { label: "Captain America — Manager · America", email: "captain.america@slooze.xyz" },
  { label: "Thanos — Member · India", email: "thanos@slooze.xyz" },
  { label: "Travis — Member · America", email: "travis@slooze.xyz" },
];

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { syncFromStorage, refresh } = useAuth();
  const [email, setEmail] = useState("nick.fury@slooze.xyz");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ token: string; user: { name: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      saveSession(data.token, data.user);
      syncFromStorage(); // set shared auth state synchronously (no bounce)
      refresh(); // load fresh permissions from /api/auth/me in the background
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Brand / marketing panel */}
      <aside className="auth-brand">
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />

        <div className="content">
          <div className="brand-mark" style={{ color: "#fff", fontSize: 20 }}>
            <span className="brand-logo">
              <IconStore size={19} />
            </span>
            slooze<span style={{ color: "#a99bff" }}>.</span>eats
          </div>
          <h1 className="auth-headline">
            Order in.
            <br />
            Access controlled.
          </h1>
          <p className="auth-sub">
            An enterprise food-ordering platform with role-based permissions and
            country-level data isolation — built for teams across regions.
          </p>
        </div>

        <div className="feature-list">
          <div className="feature">
            <span className="f-ic"><IconShield size={20} /></span>
            <div>
              <div className="f-title">Role-based access</div>
              <div className="f-desc">Admins, Managers & Members each get exactly the actions they need.</div>
            </div>
          </div>
          <div className="feature">
            <span className="f-ic"><IconGlobe size={20} /></span>
            <div>
              <div className="f-title">Country isolation</div>
              <div className="f-desc">India and America data stay separate — Admin sees everything.</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Form */}
      <main className="auth-form-side">
        <div className="auth-card fade-in">
          <h1 style={{ fontSize: 26 }}>Sign in</h1>
          <p className="subtle" style={{ marginTop: 6, marginBottom: 26 }}>
            Use the quick picker to explore each role.
          </p>

          {error && (
            <div className="notice error">
              <IconAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label>Email address</label>
              <div className="input-group">
                <span className="lead-icon"><IconMail size={18} /></span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@slooze.xyz"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-group">
                <span className="lead-icon"><IconLock size={18} /></span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button className="btn primary lg block" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="field" style={{ marginTop: 24, marginBottom: 0 }}>
            <label>Quick login · password is “password123”</label>
            <select
              className="select"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            >
              {DEMO_ACCOUNTS.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </main>
    </div>
  );
}
