import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { LocalDevicePreviewCard } from "../components/consultations/LocalDevicePreviewCard";

export function PublicConsultationsPage() {
  const { locale } = useI18n();

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24 overflow-x-clip">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-doctors-consult.jpg" mode="adaptive" />
      <PublicFloatingHeader />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 mb-2">
              LOCAL DEVICE PREVIEW / DEMO CONSULTATION ROOM
            </span>
            <h1 className="text-3xl font-bold">
              {locale === "bn" ? "টেলিমেডিসিন পরামর্শ ও ডিভাইস পরীক্ষা" : "Consultations & Local Device Preview"}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {locale === "bn"
                ? "বাস্তব অ্যাপয়েন্টমেন্টের পূর্বে আপনার ক্যামেরা ও মাইক্রোফোন পরীক্ষা করুন। কোনো রিয়েল-টাইম কল ডেটা রেকর্ড বা স্ট্রিম করা হয় না।"
                : "Test local audio/video readiness safely. Also embedded inside the unified Health Services workspace."}
            </p>
          </div>
          <Link to="/services" className="min-h-11 px-5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm inline-flex items-center">
            {locale === "bn" ? "স্বাস্থ্য সেবা ওয়ার্কস্পেসে যান" : "Open Health Services Workspace"}
          </Link>
        </div>

        <LocalDevicePreviewCard darkCard={false} />
      </main>
      <PublicFooter />
    </div>
  );
}
