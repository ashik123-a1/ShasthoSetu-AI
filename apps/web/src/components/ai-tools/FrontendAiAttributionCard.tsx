import React, { useState } from "react";
import { Sparkles, Code2, CheckCircle2 } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { MedicationAdherenceMiniCard } from "./MedicationAdherenceMiniCard";
import { BloodUrgencyShareCard } from "./BloodUrgencyShareCard";
import { OcrSafetyGateExplainerCard } from "./OcrSafetyGateExplainerCard";
import { BmiHydrationGaugeCard } from "./BmiHydrationGaugeCard";
import { ClinicalDisclaimerReceiptBanner } from "./ClinicalDisclaimerReceiptBanner";

interface ToolItem {
  id: string;
  name: string;
  category: string;
  roleEn: string;
  roleBn: string;
  promptSample: string;
  previewComponent: React.ReactNode;
}

export function FrontendAiAttributionCard() {
  const { locale } = useI18n();
  const [selectedToolId, setSelectedToolId] = useState<string>("lovable");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const tools: ToolItem[] = [
    {
      id: "lovable",
      name: "Lovable.dev",
      category: "Interactive Prototype",
      roleEn: "Rapid interactive component prototyping for Patient Medication Adherence & Streak Tracker.",
      roleBn: "রোগীর ওষুধ খাওয়ার ধারাবাহিকতা ও রিমাইন্ডার ট্র্যাকার কম্পোনেন্ট প্রোটোটাইপিং।",
      promptSample: `Create a dark sapphire glassmorphic React component for a medication adherence tracker in Tailwind CSS with streak counter, medicine dose time, and a 'Mark as Taken' toggle button.`,
      previewComponent: <MedicationAdherenceMiniCard />,
    },
    {
      id: "v0",
      name: "v0 by Vercel",
      category: "Social Care Card",
      roleEn: "Emergency Blood Request social share card with masked donor contact.",
      roleBn: "মাস্কড কন্টাক্টসহ সোশ্যাল মিডিয়ায় জরুরি রক্তের রিকোয়েস্ট শেয়ার কার্ড ডিজাইন।",
      promptSample: `Design a high-contrast emergency blood donor request card in dark crimson/slate theme with blood group badge, hospital location, masked phone number, and a copy button.`,
      previewComponent: <BloodUrgencyShareCard />,
    },
    {
      id: "bolt",
      name: "Bolt.new",
      category: "Safety Flow Widget",
      roleEn: "Interactive 3-stage Prescription OCR safety refusal (HTTP 422) protocol explainer.",
      roleBn: "প্রেসক্রিপশন অস্পষ্ট হলে কেন HTTP ৪২২ এর মাধ্যমে থামানো হয় তার ৩ ধাপের ব্যাখ্যা উইজেট।",
      promptSample: `Build a 3-step clinical safety gate card explaining how ambiguous prescription OCR is rejected with HTTP 422 and routed to registered physicians.`,
      previewComponent: <OcrSafetyGateExplainerCard />,
    },
    {
      id: "cursor",
      name: "Cursor IDE (Claude 3.5 Sonnet)",
      category: "Telemetry Gauge",
      roleEn: "Bilingual BMI and daily hydration recommendation gauge with responsive glassmorphism.",
      roleBn: "ওজন এবং উচ্চতা দিয়ে লাইভ বডি মাস ইনডেক্স এবং দৈনিক পানি গ্রহণের লক্ষ্যমাত্রা পরিমাপক।",
      promptSample: `Develop an interactive BMI and water intake calculator card with responsive layout and color-coded status badges for clinical telemetry.`,
      previewComponent: <BmiHydrationGaugeCard />,
    },
    {
      id: "claude-artifacts",
      name: "Claude Artifacts",
      category: "Clinical Legal Banner",
      roleEn: "Standardized non-diagnostic clinical disclaimer banner for consultation checkout.",
      roleBn: "ক্লিনিক্যাল দায়মুক্তি এবং ৯৯৯ জরুরি সেবা সংক্রান্ত নোটিশ ব্যানার কম্পোনেন্ট।",
      promptSample: `Author a clinical disclaimer banner in React and Tailwind clarifying that AI provides triage guidance rather than definitive physician diagnosis, highlighting national 999 hotline.`,
      previewComponent: <ClinicalDisclaimerReceiptBanner />,
    },
  ];

  const currentTool = tools.find((t) => t.id === selectedToolId) || tools[0];

  const handleCopyPrompt = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  return (
    <div
      data-testid="frontend-ai-attribution-deck"
      className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{locale === "bn" ? "ফ্রন্টএন্ড এআই টুলস লেজার ও অ্যাট্রিবিউশন" : "Frontend AI Tools Attribution Ledger"}</span>
              <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                {locale === "bn" ? "৫টি এআই-সহায়তাপ্রাপ্ত উপাদান" : "5 AI-Assisted UI Components (Provenance Pending)"}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {locale === "bn"
                ? "৫টি ফ্রন্টএন্ড এআই প্ল্যাটফর্ম দিয়ে ডিজাইনকৃত ও ইন্টিগ্রেট করা উপাদানসমূহ (অরিজিনাল সেশন লগ পর্যালোচনাধীন)"
                : "5 production components prototyped with Lovable, v0, Bolt.new, Cursor & Claude Artifacts (Provenance In Review)"}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Tool Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => {
          const isSelected = tool.id === selectedToolId;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setSelectedToolId(tool.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{tool.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Tool Details & Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4 p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white font-mono">{currentTool.name}</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              {currentTool.category}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {locale === "bn" ? currentTool.roleBn : currentTool.roleEn}
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">{locale === "bn" ? "ব্যবহৃত আসল প্রম্পট:" : "Engineering Prompt:"}</span>
              <button
                type="button"
                onClick={() => handleCopyPrompt(currentTool.id, currentTool.promptSample)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
              >
                {copiedPromptId === currentTool.id ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <span>Copy Prompt</span>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-36">
              {currentTool.promptSample}
            </pre>
          </div>
        </div>

        {/* Live Rendered Component */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-slate-400 px-1">
            {locale === "bn" ? "লাইভ রেন্ডার প্রিভিউ:" : "Live Component Render Preview:"}
          </div>
          {currentTool.previewComponent}
        </div>
      </div>
    </div>
  );
}
