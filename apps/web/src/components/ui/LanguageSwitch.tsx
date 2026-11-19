import { Languages } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("controls.langLabel")}
      className={`inline-flex items-center rounded-full border p-0.5 ${className}`}
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-surface-alt)",
      }}
    >
      <span className="hidden pl-2 pr-1 text-[var(--color-text-muted)] sm:inline-flex" aria-hidden="true">
        <Languages className="h-4 w-4" />
      </span>
      <button
        type="button"
        data-testid="lang-btn-bn"
        onClick={() => setLocale("bn")}
        aria-pressed={locale === "bn"}
        className="min-h-11 min-w-11 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors"
        style={
          locale === "bn"
            ? { backgroundColor: "var(--color-primary)", color: "var(--color-primary-contrast)" }
            : { color: "var(--color-text-muted)" }
        }
      >
        {t("controls.langBn")}
      </button>
      <button
        type="button"
        data-testid="lang-btn-en"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className="min-h-11 min-w-11 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors"
        style={
          locale === "en"
            ? { backgroundColor: "var(--color-primary)", color: "var(--color-primary-contrast)" }
            : { color: "var(--color-text-muted)" }
        }
      >
        {t("controls.langEn")}
      </button>
    </div>
  );
}
