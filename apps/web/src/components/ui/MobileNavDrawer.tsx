import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";
import { FOUR_ROLE_NAV_CONFIG, type AppRole } from "../../lib/roleNavigation";
import { useI18n } from "../../lib/i18n";

export interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  activeRole: AppRole;
  onChangeRole: (role: AppRole) => void;
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
}

const ROLES: AppRole[] = ["PATIENT", "DOCTOR", "ADMIN", "SUPPORT"];

export function MobileNavDrawer({
  open,
  onClose,
  activeRole,
  onChangeRole,
  activeItemId,
  onSelectItem,
}: MobileNavDrawerProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items = FOUR_ROLE_NAV_CONFIG[activeRole];

  return (
    <div
      className="fixed inset-0 z-50 flex lg:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" aria-hidden="true" onClick={onClose} />
      <aside
        data-testid="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("app.sidebarAria")}
        className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col border-r p-4 shadow-2xl"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2.5">
            <img
              src="/shasthosetu-logo.png"
              alt={t("app.brand")}
              className="h-10 w-10 shrink-0 rounded-full border object-cover"
              style={{ borderColor: "var(--color-border-strong)" }}
            />
            <div>
              <p className="text-sm font-bold text-[var(--color-text)]">{t("app.brand")}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{t("app.notAuthenticatedTag")}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="mobile-drawer-close"
            aria-label={t("controls.closeMenu")}
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* 4-Role Preview Selector inside mobile drawer */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChangeRole(r)}
              className="min-h-11 cursor-pointer rounded-xl border px-2 text-xs font-semibold"
              style={
                activeRole === r
                  ? {
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-contrast)",
                      borderColor: "var(--color-primary)",
                    }
                  : {
                      backgroundColor: "var(--color-surface-alt)",
                      color: "var(--color-text)",
                      borderColor: "var(--color-border)",
                    }
              }
            >
              {r}
            </button>
          ))}
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto" aria-label={t("app.sidebarAria")}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeItemId;
            return (
              <Link
                key={item.id}
                to={item.previewPath}
                onClick={() => {
                  onSelectItem(item.id);
                  onClose();
                }}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium"
                style={
                  active
                    ? {
                        backgroundColor: "var(--color-primary-soft)",
                        color: "var(--color-primary)",
                      }
                    : { color: "var(--color-text)" }
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className="mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs"
          style={{
            backgroundColor: "var(--color-warning-soft)",
            color: "var(--color-warning)",
            borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
          }}
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t(`roles.scopeNote.${activeRole}`)}</span>
        </div>
      </aside>
    </div>
  );
}
