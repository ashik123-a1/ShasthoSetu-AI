import { AlertTriangle } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export function ClinicalDisclaimerReceiptBanner() {
  const { locale } = useI18n();

  return (
    <div
      data-testid="ai-tool-clinical-disclaimer"
      className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-amber-950/30 border border-amber-500/30 shadow-lg text-slate-100 space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">
              {locale === "bn" ? "ক্লিনিক্যাল দায়মুক্তি ও ট্রায়াজ রসিদ বিজ্ঞপ্তি" : "Clinical Disclaimer & Triage Policy"}
            </h4>
            <p className="text-[10px] text-amber-300/80 font-mono">
              {locale === "bn" ? "ক্লড আর্টফ্যাক্টস-ডিজাইন এআই উইজেট" : "Claude Artifacts-Assisted Component"}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950 border border-amber-500/50 text-amber-300">
          Non-Diagnostic
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
        {locale === "bn"
          ? "স্বাস্থ্যসেতু একটি তথ্যমূলক প্রাথমিক স্বাস্থ্য ট্রায়াজ সহায়িকা। এটি কোনো লাইসেন্সপ্রাপ্ত চিকিৎসকের সরাসরি পরামর্শের বিকল্প নয়। তীব্র বুকে ব্যথা, শ্বাসকষ্ট, অসাড়তা বা জরুরি অবস্থায় অবিলম্বে জাতীয় জরুরি সেবা ৯৯৯ অথবা স্বাস্থ্য বাতায়ন ১৬২৬৩-এ যোগাযোগ করুন।"
          : "ShasthoSetu AI is an informational clinical triage guidance engine and does not replace the professional diagnostic judgment of a licensed physician. For acute emergencies, immediately contact National Emergency Service 999 or DGHS Hotline 16263."}
      </div>
    </div>
  );
}
