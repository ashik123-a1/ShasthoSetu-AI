import { ShieldCheck, FileWarning, Stethoscope } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export function OcrSafetyGateExplainerCard() {
  const { locale } = useI18n();

  const steps = [
    {
      num: "01",
      icon: FileWarning,
      titleEn: "Illegibility Detection",
      titleBn: "অস্পষ্টতা শনাক্তকরণ",
      descEn: "EasyOCR flags confidence below threshold or conflicting drug names.",
      descBn: "কম স্পষ্টতার হাতের লেখা এবং সন্দেহজনক ওষুধের নাম স্বয়ংক্রিয়ভাবে চিহ্নিত হয়।",
    },
    {
      num: "02",
      icon: ShieldCheck,
      titleEn: "HTTP 422 Safety Refusal",
      titleBn: "HTTP ৪২২ সেফটি গেট",
      descEn: "Halts automatic dispensing to prevent fatal dosage hallucinations.",
      descBn: "ভুল ওষুধ রোধে স্বয়ংক্রিয় প্রসেসিং থামিয়ে তাৎক্ষণিক সেফটি লক সক্রিয় হয়।",
    },
    {
      num: "03",
      icon: Stethoscope,
      titleEn: "BMDC Physician Sign-off",
      titleBn: "অনুমোদিত চিকিৎসকের অনুমোদন",
      descEn: "Transfers document to registered doctor queue for human validation.",
      descBn: "প্রেসক্রিপশনটি সরাসরি বিএমডিসি নিবন্ধিত চিকিৎসকের রিভিউ কিউতে চলে যায়।",
    },
  ];

  return (
    <div
      data-testid="ai-tool-ocr-safety-gate"
      className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-indigo-950/40 border border-indigo-500/30 shadow-lg text-slate-100 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">
              {locale === "bn" ? "প্রেসক্রিপশন সেফটি গেট আর্কিটেকচার" : "Prescription Safety Gate Protocol"}
            </h4>
            <p className="text-[10px] text-indigo-300/80 font-mono">
              {locale === "bn" ? "বোল্ট.নিউ-ডিজাইন এআই উইজেট" : "Bolt.new-Assisted Component"}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 border border-indigo-400 text-indigo-300">
          Fail-Closed 422
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.num}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-indigo-400">{st.num}</span>
                <Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="font-semibold text-white">
                {locale === "bn" ? st.titleBn : st.titleEn}
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                {locale === "bn" ? st.descBn : st.descEn}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
