import { useEffect, useRef } from "react";
import { ShieldCheck, X } from "lucide-react";

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const raf = window.requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ss-confirm-modal-title"
        data-testid="confirm-modal"
        className="ss-card w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "var(--color-primary-soft)",
                color: "var(--color-primary)",
              }}
            >
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="ss-confirm-modal-title" className="text-base font-bold text-[var(--color-text)]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            data-testid="modal-close-x"
            onClick={onClose}
            aria-label={cancelLabel}
            className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{body}</p>

        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            data-testid="modal-cancel-btn"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors hover:bg-[var(--color-surface-alt)]"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-testid="modal-confirm-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-contrast)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
