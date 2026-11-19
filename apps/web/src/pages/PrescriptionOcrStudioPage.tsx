import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { PrescriptionOcrStudio } from "../components/ai/PrescriptionOcrStudio";

export function PrescriptionOcrStudioPage() {
  const { locale } = useI18n();

  return (
    <div
      className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white"
      data-testid="prescription-ocr-studio-page"
    >
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-prescription-ocr.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#2dd4bf] hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {locale === "bn" ? "স্বাস্থ্যসেবায় ফিরুন" : "Back to Health Services"}
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            BILINGUAL PRESCRIPTION OCR &amp; EXPLANATION WORKBENCH
          </span>
        </div>

        <PrescriptionOcrStudio />
      </main>

      <PublicFooter />
    </div>
  );
}
