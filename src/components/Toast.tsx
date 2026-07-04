"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { IconCheck, IconX, IconInfo } from "@/components/Icons";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  type: ToastType;
  title: string;
  msg?: string;
}

interface ToastCtx {
  push: (type: ToastType, title: string, msg?: string) => void;
  success: (title: string, msg?: string) => void;
  error: (title: string, msg?: string) => void;
  info: (title: string, msg?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS = {
  success: <IconCheck size={18} />,
  error: <IconX size={18} />,
  info: <IconInfo size={18} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, msg?: string) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, type, title, msg }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  const api: ToastCtx = {
    push,
    success: (t, m) => push("success", t, m),
    error: (t, m) => push("error", t, m),
    info: (t, m) => push("info", t, m),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
            <div className="t-icon">{ICONS[t.type]}</div>
            <div className="grow">
              <div className="t-title">{t.title}</div>
              {t.msg && <div className="t-msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
