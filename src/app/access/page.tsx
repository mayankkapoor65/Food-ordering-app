"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/components/Toast";
import Navbar from "@/components/Navbar";
import { RoleBadge, Skeleton } from "@/components/ui";
import { IconShield, IconInfo } from "@/components/Icons";

interface RoleDoc {
  name: "ADMIN" | "MANAGER" | "MEMBER";
  description: string;
  permissions: string[];
}
interface PermMeta {
  key: string;
  label: string;
  description: string;
}

export default function AccessControlPage() {
  const { user, can, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [catalogue, setCatalogue] = useState<PermMeta[]>([]);
  const [roles, setRoles] = useState<RoleDoc[] | null>(null);
  // working copy: roleName -> Set(permission)
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ roles: RoleDoc[]; catalogue: PermMeta[] }>("/api/roles")
      .then((data) => {
        setRoles(data.roles);
        setCatalogue(data.catalogue);
        const d: Record<string, Set<string>> = {};
        data.roles.forEach((r) => (d[r.name] = new Set(r.permissions)));
        setDraft(d);
      })
      .catch((e) => toast.error("Failed to load roles", e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!can("MANAGE_ACCESS")) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [user, can, load, router]);

  const toggle = (role: string, perm: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      const set = new Set(next[role]);
      set.has(perm) ? set.delete(perm) : set.add(perm);
      next[role] = set;
      return next;
    });
  };

  // Which roles differ from their saved state?
  const dirtyRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter((r) => {
      const orig = new Set(r.permissions);
      const cur = draft[r.name] || new Set();
      if (orig.size !== cur.size) return true;
      for (const p of cur) if (!orig.has(p)) return true;
      return false;
    });
  }, [roles, draft]);

  const save = async () => {
    setSaving(true);
    try {
      for (const r of dirtyRoles) {
        await api(`/api/roles/${r.name}`, {
          method: "PUT",
          body: JSON.stringify({ permissions: Array.from(draft[r.name]) }),
        });
      }
      toast.success("Access updated", "Changes apply immediately.");
      load();
    } catch (e) {
      toast.error("Save failed", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="center-min">Loading…</div>;

  const roleNames: RoleDoc["name"][] = ["ADMIN", "MANAGER", "MEMBER"];

  return (
    <>
      <Navbar user={user} can={can} />
      <div className="container fade-in">
        <div className="page-head">
          <div className="eyebrow">Admin</div>
          <h1>Access Control</h1>
          <p className="subtle" style={{ marginTop: 6 }}>
            Permissions are stored in the database. Toggle what each role can do —
            changes apply live, no redeploy.
          </p>
        </div>

        <div className="notice info">
          <IconInfo size={18} />
          <span>
            Country-based data isolation is always on and independent of these
            role permissions. The Admin role keeps “Manage access control” locked
            to prevent a lockout.
          </span>
        </div>

        <div className="card">
          <div className="matrix-wrap">
            {roles === null ? (
              <div style={{ padding: 20 }}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} style={{ height: 22, margin: "12px 0" }} />
                ))}
              </div>
            ) : (
              <table className="matrix">
                <thead>
                  <tr>
                    <th>Permission</th>
                    {roleNames.map((rn) => (
                      <th key={rn} className="role-col">
                        <span className="role-head">
                          <RoleBadge role={rn} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalogue.map((perm) => (
                    <tr key={perm.key}>
                      <td className="perm">
                        <div className="perm-label">{perm.label}</div>
                        <div className="perm-desc">{perm.description}</div>
                      </td>
                      {roleNames.map((rn) => {
                        // Lock Admin's MANAGE_ACCESS to avoid self-lockout.
                        const locked = rn === "ADMIN" && perm.key === "MANAGE_ACCESS";
                        return (
                          <td key={rn} className="cell">
                            <input
                              type="checkbox"
                              className="check"
                              checked={draft[rn]?.has(perm.key) || false}
                              disabled={locked}
                              onChange={() => toggle(rn, perm.key)}
                              aria-label={`${perm.label} for ${rn}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="save-bar">
          {dirtyRoles.length > 0 && (
            <span className="subtle">
              <span className="dirty-dot" /> {dirtyRoles.length} role
              {dirtyRoles.length > 1 ? "s" : ""} changed
            </span>
          )}
          <button
            className="btn primary"
            disabled={saving || dirtyRoles.length === 0}
            onClick={save}
          >
            <IconShield size={17} /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
