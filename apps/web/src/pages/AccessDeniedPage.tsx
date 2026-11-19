import { Link, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { roleHomePath, useAuth } from "../lib/authContext";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";

export function AccessDeniedPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const state = (location.state || {}) as { from?: string };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-28 px-4">
      <PublicFloatingHeader />
      <div
        data-testid="access-denied-page"
        className="max-w-xl mx-auto rounded-3xl border border-rose-500/40 bg-[var(--color-surface)] p-8 text-center space-y-4 shadow-xl"
      >
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-2xl font-bold">
          {locale === "bn" ? "প্রবেশাধিকার সংরক্ষিত (HTTP 403 / RBAC)" : "Access Denied (Role Restricted)"}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {state.from ? `Route ${state.from} ` : "This portal "}
          {locale === "bn"
            ? "আপনার বর্তমান ভূমিকার জন্য অনুমোদিত নয়।"
            : `is not accessible to your current role (${user?.primary_role || "Guest"}).`}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {user && (
            <Link
              to={roleHomePath(user)}
              className="min-h-11 px-5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm inline-flex items-center"
            >
              {locale === "bn" ? "নিজস্ব ড্যাশবোর্ডে ফিরুন" : "Go to My Dashboard"}
            </Link>
          )}
          <Link
            to="/"
            className="min-h-11 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] font-semibold text-sm inline-flex items-center"
          >
            {locale === "bn" ? "হোমপেজ" : "Return Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
