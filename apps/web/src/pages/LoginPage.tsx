import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, KeyRound, LogIn, UserCheck } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { roleHomePath, useAuth } from "../lib/authContext";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";

const DEMO_ACCOUNTS = [
  { label: "Patient Demo (রহিমা বেগম)", id: "patient", email: "patient.demo@shasthosetu.local", pass: "PatientDemo#2026" },
  { label: "Doctor Approved (Dr. Farhana)", id: "doctor", email: "dr.farhana@shasthosetu.local", pass: "DoctorDemo#2026" },
  { label: "Doctor Pending (Dr. Kamal)", id: "doctor-pending", email: "dr.pending@shasthosetu.local", pass: "DoctorDemo#2026" },
  { label: "Support Desk (Zero-PHI)", id: "support", email: "support.demo@shasthosetu.local", pass: "SupportDemo#2026" },
  { label: "System Admin", id: "admin", email: "admin.demo@shasthosetu.local", pass: "AdminDemo#2026" },
];

function isRedirectAllowedForRole(target: string | null, role: string): target is string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return false;
  if (target.startsWith("/patient") && role !== "PATIENT") return false;
  if (target.startsWith("/doctor") && role !== "DOCTOR") return false;
  if (target.startsWith("/admin") && role !== "ADMIN") return false;
  if (target.startsWith("/support") && role !== "SUPPORT") return false;
  return true;
}

export function LoginPage() {
  const { locale, t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (idVal: string, pwVal: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(idVal.trim(), pwVal);
      if (isRedirectAllowedForRole(redirectTarget, user.primary_role)) {
        navigate(redirectTarget, { replace: true });
      } else {
        navigate(roleHomePath(user), { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(locale === "bn" ? "লগইন সম্পন্ন হয়নি।" : "Could not sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLogin(identifier, password);
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24 pb-12 px-4">
      <PublicFloatingHeader />

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <KeyRound className="w-3.5 h-3.5" /> Argon2id + HttpOnly Session
            </span>
            <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{t("auth.loginSub")}</p>
          </div>

          {error && (
            <div role="alert" data-testid="login-error-alert" className="p-3.5 rounded-xl bg-rose-500/12 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1 text-sm font-medium">
              <span>{t("auth.identifierLabel")}</span>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="patient.demo@shasthosetu.local"
                data-testid="login-identifier-input"
                className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 text-sm"
              />
            </label>

            <label className="block space-y-1 text-sm font-medium">
              <span>{t("auth.passwordLabel")}</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="login-password-input"
                className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              data-testid="login-submit-btn"
              className="w-full min-h-12 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? "..." : t("auth.signInBtn")}
            </button>
          </form>

          <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <Link to="/register" className="text-[var(--color-primary)] font-semibold hover:underline min-h-11 inline-flex items-center">
              {t("auth.noAccount")} {t("auth.registerLink")} →
            </Link>
            <Link to="/doctor-apply" className="text-[var(--color-secondary)] font-semibold hover:underline min-h-11 inline-flex items-center">
              {t("auth.doctorApplyLink")} →
            </Link>
          </div>
        </div>

        {/* Synthetic Quick-Fill Helper (always uses real POST /v1/auth/login) */}
        <aside className="lg:col-span-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[var(--color-primary)]" />
            {t("auth.demoAccountsHeading")}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {locale === "bn"
              ? "প্রতিটি বাটন ফর্মে সিন্থেটিক ডেমো তথ্য বসিয়ে বাস্তব `/v1/auth/login` যাচাইকরণ চালায়।"
              : "Populates credentials and signs in via real Argon2id backend verification."}
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                data-testid={`quick-demo-${acc.id}`}
                onClick={() => {
                  setIdentifier(acc.email);
                  setPassword(acc.pass);
                  void performLogin(acc.email, acc.pass);
                }}
                className="w-full min-h-12 px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-left transition cursor-pointer"
              >
                <div className="text-xs font-bold text-[var(--color-text)]">{acc.label}</div>
                <div className="text-[11px] font-mono text-[var(--color-text-muted)]">{acc.email}</div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
