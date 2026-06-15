import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
interface Ctx {
  push: (kind: ToastKind, message: string) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[320px] max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-in card px-4 py-3 flex items-start gap-3 ${
              t.kind === "success"
                ? "border-emerald-500/30"
                : t.kind === "error"
                ? "border-red-500/30"
                : "border-cyan-500/30"
            }`}
            style={{
              borderColor:
                t.kind === "success"
                  ? "rgba(16,185,129,0.4)"
                  : t.kind === "error"
                  ? "rgba(239,68,68,0.4)"
                  : "rgba(34,211,238,0.4)",
            }}
          >
            <span className="text-xl leading-none mt-0.5">
              {t.kind === "success" ? "✅" : t.kind === "error" ? "⚠️" : "ℹ️"}
            </span>
            <div className="text-sm text-gray-200 leading-snug">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
