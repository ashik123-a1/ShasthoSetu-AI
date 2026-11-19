import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import { FOUR_ROLE_NAV_CONFIG, type AppRole } from "../../lib/roleNavigation";
import { useI18n } from "../../lib/i18n";

export interface RoleSidebarProps {
  activeRole: AppRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
}

export function RoleSidebar({
  activeRole,
  collapsed,
  onToggleCollapse,
  activeItemId,
  onSelectItem,
}: RoleSidebarProps) {
  const { t } = useI18n();
  const items = FOUR_ROLE_NAV_CONFIG[activeRole];

  return (
    <aside
      data-testid="role-sidebar"
      aria-label={t("app.sidebarAria")}
      className={`hidden shrink-0 flex-col border-r transition-all duration-200 lg:flex ${
        collapsed ? "w-20" : "w-72"
      }`}
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <LockKeyhole className="h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
            <span className="truncate text-xs font-bold text-[var(--color-text)]">
              {t(`roles.${activeRole}`)}
            </span>
          </div>
        ) : null}
        <button
          type="button"
          data-testid="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t("controls.expandSidebar") : t("controls.collapseSidebar")}
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed ? (
        <div
          className="mx-3 mt-3 rounded-xl border px-3 py-2 text-[11px] font-semibold"
          style={{
            backgroundColor: "var(--color-warning-soft)",
            color: "var(--color-warning)",
            borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
          }}
        >
          {t("app.notAuthenticatedTag")}
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t("app.sidebarAria")}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;
          return (
            <Link
              key={item.id}
              to={item.previewPath}
              data-testid={`sidebar-item-${item.id}`}
              onClick={() => onSelectItem(item.id)}
              title={collapsed ? t(item.labelKey) : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : "justify-between"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: "var(--color-primary-soft)",
                      color: "var(--color-primary)",
                      border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                    }
                  : {
                      color: "var(--color-text-muted)",
                    }
              }
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed ? <span className="truncate">{t(item.labelKey)}</span> : null}
              </span>
              {!collapsed && item.sampleBadge ? (
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold"
                  style={{
                    backgroundColor: "var(--color-surface-alt)",
                    color: "var(--color-text)",
                  }}
                >
                  {item.sampleBadge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
