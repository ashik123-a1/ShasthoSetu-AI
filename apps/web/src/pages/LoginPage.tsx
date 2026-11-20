import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { roleHomePath, useAuth } from "../lib/authContext";
import { useI18n } from "../lib/i18n";
import { KineticBrandLogo } from "../components/common/KineticBrandLogo";

interface DemoAccount {
  id: string;
  titleEn: string;
  titleBn: string;
  badge: string;
  sub: string;
  email: string;
  pass: string;
  cardClass: string;
  iconBoxClass: string;
  titleHoverClass: string;
  badgeClass: string;
  chevronHoverClass: string;
  spinnerColorClass: string;
  icon: "user" | "doctor" | "pending" | "support" | "admin";
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "patient",
    titleEn: "Continue as Demo Patient",
    titleBn: "ডেমো রোগী হিসেবে প্রবেশ করুন",
    badge: "রহিমা বেগম",
    sub: "Health ID: SS-PT-884920 • Patient Portal",
    email: "patient.demo@shasthosetu.local",
    pass: "PatientDemo#2026",
    cardClass: "lg-demo-card-patient",
    iconBoxClass:
      "bg-cyan-950 border border-cyan-500/40 text-cyan-400 group-hover:bg-cyan-400 group-hover:text-slate-950",
    titleHoverClass: "group-hover:text-cyan-300",
    badgeClass: "bg-cyan-950 text-cyan-300 border border-cyan-800/60",
    chevronHoverClass: "group-hover:text-cyan-400",
    spinnerColorClass: "border-cyan-400",
    icon: "user",
  },
  {
    id: "doctor",
    titleEn: "Continue as Approved Doctor",
    titleBn: "অনুমোদিত চিকিৎসক হিসেবে প্রবেশ করুন",
    badge: "Dr. Farhana",
    sub: "BMDC #91044 • Video & Telemedicine Desk",
    email: "dr.farhana@shasthosetu.local",
    pass: "DoctorDemo#2026",
    cardClass: "lg-demo-card-doctor",
    iconBoxClass:
      "bg-indigo-950 border border-indigo-500/40 text-indigo-300 group-hover:bg-indigo-400 group-hover:text-slate-950",
    titleHoverClass: "group-hover:text-indigo-300",
    badgeClass: "bg-indigo-950 text-indigo-300 border border-indigo-800/60",
    chevronHoverClass: "group-hover:text-indigo-400",
    spinnerColorClass: "border-indigo-400",
    icon: "doctor",
  },
  {
    id: "support",
    titleEn: "Continue as Support Desk",
    titleBn: "সাপোর্ট ডেস্ক হিসেবে প্রবেশ করুন",
    badge: "Zero-PHI Desk",
    sub: "Desk ID: SUP-BD-204 • Voice & Ticket Queue",
    email: "support.demo@shasthosetu.local",
    pass: "SupportDemo#2026",
    cardClass: "lg-demo-card-support",
    iconBoxClass:
      "bg-amber-950 border border-amber-500/40 text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950",
    titleHoverClass: "group-hover:text-amber-300",
    badgeClass: "bg-amber-950 text-amber-300 border border-amber-800/60",
    chevronHoverClass: "group-hover:text-amber-400",
    spinnerColorClass: "border-amber-400",
    icon: "support",
  },
  {
    id: "admin",
    titleEn: "Continue as System Admin",
    titleBn: "সিস্টেম অ্যাডমিন হিসেবে প্রবেশ করুন",
    badge: "Senior Registrar",
    sub: "Staff ID: ADM-REG-1001 • Full Ops & Governance",
    email: "admin.demo@shasthosetu.local",
    pass: "AdminDemo#2026",
    cardClass: "lg-demo-card-admin",
    iconBoxClass:
      "bg-emerald-950 border border-emerald-500/40 text-[#34D399] group-hover:bg-[#34D399] group-hover:text-slate-950",
    titleHoverClass: "group-hover:text-[#34D399]",
    badgeClass: "bg-emerald-950 text-[#34D399] border border-emerald-800/60",
    chevronHoverClass: "group-hover:text-[#34D399]",
    spinnerColorClass: "border-[#34D399]",
    icon: "admin",
  },
  {
    id: "doctor-pending",
    titleEn: "Doctor Pending Verification",
    titleBn: "অপেক্ষমান চিকিৎসক (Pending Gate)",
    badge: "Dr. Kamal",
    sub: "Pending Review Gate • Read-Only Onboarding",
    email: "dr.pending@shasthosetu.local",
    pass: "DoctorDemo#2026",
    cardClass: "lg-demo-card-doctor",
    iconBoxClass:
      "bg-slate-900 border border-slate-700 text-slate-300 group-hover:bg-indigo-400 group-hover:text-slate-950",
    titleHoverClass: "group-hover:text-indigo-200",
    badgeClass: "bg-slate-900 text-slate-300 border border-slate-700",
    chevronHoverClass: "group-hover:text-indigo-300",
    spinnerColorClass: "border-indigo-300",
    icon: "pending",
  },
];

function isRedirectAllowedForRole(target: string | null, role: string): target is string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return false;
  if (target.startsWith("/patient") && role !== "PATIENT") return false;
  if (target.startsWith("/doctor") && role !== "DOCTOR") return false;
  if (target.startsWith("/admin") && role !== "ADMIN") return false;
  if (target.startsWith("/support") && role !== "SUPPORT") return false;
  return true;
}

function DemoRoleIcon({ kind }: { kind: DemoAccount["icon"] }) {
  switch (kind) {
    case "user":
      return <User className="w-4 h-4" />;
    case "doctor":
      return <Stethoscope className="w-4 h-4" />;
    case "pending":
      return <Clock className="w-4 h-4" />;
    case "support":
      return <Headphones className="w-4 h-4" />;
    case "admin":
      return <ShieldCheck className="w-4 h-4" />;
  }
}

export function LoginPage() {
  const { locale, setLocale } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleDemoAccounts = DEMO_ACCOUNTS;

  const performLogin = async (idVal: string, pwVal: string, demoId?: string) => {
    setError(null);
    setSubmitting(true);
    setActiveDemoId(demoId ?? null);
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
        setError(
          locale === "bn"
            ? "ভুল ইমেইল বা পাসওয়ার্ড। অনুগ্রহ করে আবার যাচাই করুন।"
            : "Invalid credentials. Please verify your email/phone and password."
        );
      }
    } finally {
      setSubmitting(false);
      setActiveDemoId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLogin(identifier, password);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-8 overflow-hidden lg-login-backdrop text-slate-100">
      <div className="w-full max-w-[520px] mx-auto relative z-10">
        {/* Brand Header with LandGuard Kinetic Animated Shield Logo */}
        <div className="text-center mb-5">
          <div className="inline-block mb-2">
            <KineticBrandLogo to="/" tagline="SECURE CLINICAL TELEMEDICINE" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            {locale === "bn" ? "স্বাস্থ্যসেতু অ্যাক্সেস পোর্টাল" : "Access Clinical Portal"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {locale === "bn"
              ? "অনুমোদিত অ্যাকাউন্ট দিয়ে সাইন ইন করুন অথবা নিচের ডেমো রোল বেছে নিন"
              : "Sign in with authorized credentials or select a demonstration role"}
          </p>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div
            role="alert"
            data-testid="login-error-alert"
            className="mb-4 p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-3 shadow-lg"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Glass Card Container (1-to-1 Land-Guard Glass Card) */}
        <div className="lg-glass-login-card p-6 sm:p-8 rounded-2xl relative shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  {locale === "bn" ? "ইমেইল অথবা ফোন নম্বর" : "Email Address or Phone"}
                </label>

                {/* Language Switcher Pill */}
                <div className="inline-flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700/80 font-mono text-[10.5px] shadow-inner">
                  <button
                    type="button"
                    onClick={() => setLocale("en")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      locale === "en"
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale("bn")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      locale === "bn"
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="patient.demo@shasthosetu.local"
                  data-testid="login-identifier-input"
                  className="lg-glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                {locale === "bn" ? "পাসওয়ার্ড" : "Password"}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="login-password-input"
                  className="lg-glass-input w-full pl-10 pr-10 py-3 rounded-xl text-sm placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 rounded p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-cyan-400"
                />
                <span>{locale === "bn" ? "সেশন মনে রাখুন (Argon2id)" : "Remember session (Argon2id)"}</span>
              </label>
              <span className="text-slate-400 font-mono text-[11px] bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
                24h TTL
              </span>
            </div>

            {/* Submit Button with Shimmer Motion */}
            <button
              type="submit"
              disabled={submitting}
              data-testid="login-submit-btn"
              className="lg-btn-primary w-full py-3 px-4 rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 mt-2 shadow-lg shadow-cyan-500/25"
            >
              <span>
                {submitting && !activeDemoId
                  ? locale === "bn"
                    ? "প্রবেশ করা হচ্ছে..."
                    : "Signing in..."
                  : locale === "bn"
                    ? "অ্যাকাউন্টে সাইন ইন করুন"
                    : "Sign In to Account"}
              </span>
              {submitting && !activeDemoId ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0b1329] px-3.5 text-slate-400 font-mono tracking-wider">
                {locale === "bn" ? "অথবা তাৎক্ষণিক ডেমো প্রবেশ" : "Or Quick Demo Entry"}
              </span>
            </div>
          </div>

          {/* One-Click Demo Role Cards */}

          <div className="space-y-2.5">
            {visibleDemoAccounts.map((acc) => {
              const isBusy = submitting && activeDemoId === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  disabled={submitting}
                  data-testid={`quick-demo-${acc.id}`}
                  onClick={() => {
                    setIdentifier(acc.email);
                    setPassword(acc.pass);
                    void performLogin(acc.email, acc.pass, acc.id);
                  }}
                  className={`lg-demo-card ${acc.cardClass} w-full text-left p-3 rounded-xl flex items-center justify-between group disabled:opacity-65`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${acc.iconBoxClass}`}
                    >
                      <DemoRoleIcon kind={acc.icon} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs sm:text-sm font-bold text-white flex flex-wrap items-center gap-2 ${acc.titleHoverClass}`}
                      >
                        <span className="truncate">{locale === "bn" ? acc.titleBn : acc.titleEn}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${acc.badgeClass}`}
                        >
                          {acc.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{acc.sub}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isBusy ? (
                      <span
                        className={`w-3.5 h-3.5 border-2 ${acc.spinnerColorClass} border-t-transparent rounded-full animate-spin`}
                      />
                    ) : (
                      <ChevronRight
                        className={`lg-chevron-icon w-4 h-4 text-slate-400 transition-transform ${acc.chevronHoverClass}`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Register / Apply Doctor Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <Link to="/register" className="text-cyan-300 font-semibold hover:text-cyan-200 hover:underline">
              {locale === "bn" ? "নতুন রোগী নিবন্ধন →" : "Register New Patient →"}
            </Link>
            <Link to="/doctor-apply" className="text-emerald-300 font-semibold hover:text-emerald-200 hover:underline">
              {locale === "bn" ? "চিকিৎসক আবেদন →" : "Apply as Doctor →"}
            </Link>
          </div>
        </div>

        {/* Bottom Return-to-Home Cyber Glass Pill */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-cyan-300 hover:text-white bg-slate-900/95 hover:bg-slate-800/95 border border-cyan-500/50 hover:border-cyan-300 shadow-xl shadow-cyan-950/40 backdrop-blur-md transition-all group hover:scale-[1.02]"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span className="tracking-wide">
              {locale === "bn" ? "পাবলিক হোম পেজে ফিরে যান" : "Return to Public Welcome Page"}
            </span>
          </Link>
        </div>

        {/* Amber Synthetic Demo Disclaimer Notice */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/85 border border-amber-500/30 text-amber-300/90 text-[11px] sm:text-xs font-mono shadow-md backdrop-blur-md">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>SYNTHETIC DEMO:</strong> Clinical Research Benchmark • HttpOnly Session Auth
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
