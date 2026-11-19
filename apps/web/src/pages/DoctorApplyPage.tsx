import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Stethoscope } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";

export function DoctorApplyPage() {
  const { locale } = useI18n();
  const { doctorApply } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [degrees, setDegrees] = useState("MBBS, FCPS");
  const [specialty, setSpecialty] = useState("Internal Medicine");
  const [bmdcDemoReg, setBmdcDemoReg] = useState("BMDC-DEMO-77101");
  const [feeBdt, setFeeBdt] = useState(500);
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await doctorApply({
        full_name: fullName,
        email,
        password,
        degrees,
        specialty,
        bmdc_demo_reg: bmdcDemoReg,
        consultation_fee_bdt: Number(feeBdt),
        bio,
      });
      navigate("/doctor/onboarding-status", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Doctor application failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24 pb-12 px-4 overflow-x-clip">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-doctors-consult.jpg" mode="adaptive" />
      <PublicFloatingHeader />
      <div className="relative z-10 max-w-xl mx-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[var(--color-primary)]" />
            {locale === "bn" ? "চিকিৎসক নিবন্ধন আবেদন (ডেমো যাচাইকরণ)" : "Doctor Onboarding Application"}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {locale === "bn"
              ? "আবেদনের পর আপনার প্রোফাইল PENDING অবস্থায় থাকবে। অ্যাডমিন অনুমোদন (APPROVED) না দেওয়া পর্যন্ত পাবলিক লিস্টিং ও স্লট খোলা হবে না।"
              : "Applications begin strictly in PENDING state until Admin verification grants APPROVED status."}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <label className="block space-y-1 text-sm font-medium">
            <span>Full Name (Doctor Display Name)</span>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm font-medium">
              <span>Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Password (min 8)</span>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm font-medium">
              <span>Degrees</span>
              <input type="text" required value={degrees} onChange={(e) => setDegrees(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Specialty</span>
              <input type="text" required value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm font-medium">
              <span>BMDC Format Demo Reg</span>
              <input type="text" required value={bmdcDemoReg} onChange={(e) => setBmdcDemoReg(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Consultation Fee (BDT)</span>
              <input type="number" min={0} max={5000} value={feeBdt} onChange={(e) => setFeeBdt(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
            </label>
          </div>
          <label className="block space-y-1 text-sm font-medium">
            <span>Clinical Bio (Fictional Demo)</span>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm" />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-12 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm cursor-pointer"
          >
            {locale === "bn" ? "চিকিৎসক আবেদন জমা দিন" : "Submit Doctor Application"}
          </button>
        </form>

        <div className="text-xs text-center pt-2 border-t border-[var(--color-border)]">
          <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline min-h-11 inline-flex items-center">
            ← {locale === "bn" ? "লগইন পাতায় ফিরুন" : "Back to Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
