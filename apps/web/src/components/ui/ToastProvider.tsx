import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "info" | "warning" | "danger";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  pushToast: (msg: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (msg: Omit<ToastMessage, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...msg, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ pushToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((item) => {
          const isSuccess = item.tone !== "info";
          return (
            <div
              key={item.id}
              role="status"
              data-testid="ui-toast"
              data-no-tilt="true"
              className="ss-card pointer-events-auto flex items-start gap-3 p-3.5"
              style={{
                borderColor: isSuccess ? "var(--color-primary)" : "var(--color-secondary)",
              }}
            >
              {isSuccess ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-secondary)]" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-text)]">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close notification"
                onClick={() => dismissToast(item.id)}
                className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
