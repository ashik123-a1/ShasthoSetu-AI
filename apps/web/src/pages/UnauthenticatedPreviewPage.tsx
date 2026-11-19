import { Link, useLocation } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { TrustBadge } from "../components/ui";
import { useI18n } from "../lib/i18n";

export function UnauthenticatedPreviewPage() {
  const { pathname } = useLocation();
  const { t } = useI18n();

  return (
    <section
      data-testid="unauthenticated-route-guard"
      className="ss-card mx-auto max-w-2xl space-y-4 p-6 text-center"
    >
      <div className="flex justify-center">
        <TrustBadge variant="DEMO_ONLY" />
      </div>
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-warning-soft)", color: "var(--color-warning)" }}
      >
        <LockKeyhole className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">{t("routeGuard.title")}</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t("routeGuard.desc", { path: pathname })}
      </p>
      <div>
        <Link
          to="/"
          data-testid="return-to-gallery-link"
          className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-contrast)",
          }}
        >
          {t("routeGuard.backToGallery")}
        </Link>
      </div>
    </section>
  );
}
