import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { AiHealthAssistant } from "../components/ai/AiHealthAssistant";

export function AiAssistantPage() {
  const { locale } = useI18n();

  return (
    <div
      className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white"
      data-testid="ai-assistant-page"
    >
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-services-lab.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-6 flex-1">
        <div className="flex items-center justify-between">
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#38bdf8] hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {locale === "bn" ? "স্বাস্থ্যসেবায় ফিরুন" : "Back to Health Services"}
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            SHASTHOSETU BILINGUAL RAG &amp; VOICE ASSISTANT
          </span>
        </div>

        <AiHealthAssistant portalMode="public" />
      </main>

      <PublicFooter />
    </div>
  );
}
