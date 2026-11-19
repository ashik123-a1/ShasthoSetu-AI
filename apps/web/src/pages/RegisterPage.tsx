import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, UserPlus } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";

export function RegisterPage() {
  const { locale } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        full_name: fullName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        district,
        preferred_locale: locale,
      });
      navigate("/patient/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24 pb-12 px-4">
      <PublicFloatingHeader />
      <div className="max-w-lg mx-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-5">
        <div>
          <h1 className="text-2xl font-bold">
            {locale === "bn" ? "রোগী অ্যাকাউন্ট নিবন্ধন" : "Create Patient Account"}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {locale === "bn"
              ? "নিরাপত্তার স্বার্থে সাধারণ নিবন্ধনে শুধুমাত্র PATIENT ভূমিকা প্রদান করা হয়।"
              : "Public signup strictly provisions PATIENT accounts with Argon2id password protection."}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <label className="block space-y-1 text-sm font-medium">
            <span>{locale === "bn" ? "পূর্ণ নাম" : "Full Name"}</span>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" data-testid="register-name-input" />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>{locale === "bn" ? "ইমেইল" : "Email"}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" data-testid="register-email-input" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm font-medium">
              <span>{locale === "bn" ? "মোবাইল" : "Phone"}</span>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+88017..." className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>{locale === "bn" ? "জেলা" : "District"}</span>
              <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
          </div>
          <label className="block space-y-1 text-sm font-medium">
            <span>{locale === "bn" ? "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" : "Password (min 8 chars)"}</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" data-testid="register-password-input" />
          </label>
          <button
            type="submit"
            disabled={submitting}
            data-testid="register-submit-btn"
            className="w-full min-h-12 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            {locale === "bn" ? "নিবন্ধন সম্পন্ন করুন" : "Register Patient Account"}
          </button>
        </form>

        <div className="text-xs text-center pt-2 border-t border-[var(--color-border)]">
          <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline min-h-11 inline-flex items-center">
            {locale === "bn" ? "ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন" : "Already registered? Sign In"}
          </Link>
        </div>
      </div>
    </div>
  );
}
