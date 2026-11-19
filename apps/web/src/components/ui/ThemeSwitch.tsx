import { Moon, Sun } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = usePreferences();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      data-testid="theme-switch"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? t("controls.themeLight") : t("controls.themeDark")}
      title={isDark ? t("controls.themeLight") : t("controls.themeDark")}
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${className}`}
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-surface)",
        color: "var(--color-text)",
      }}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
      )}
      <span className="hidden xl:inline">
        {isDark ? t("controls.themeDarkLabel") : t("controls.themeDayLabel")}
      </span>
    </button>
  );
}
