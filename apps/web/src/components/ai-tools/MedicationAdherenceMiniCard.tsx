import { useState } from "react";
import { Pill, CheckCircle2, Clock } from "lucide-react";
import { useI18n } from "../../lib/i18n";

interface MedicationAdherenceProps {
  initialStreakDays?: number;
  adherencePercentage?: number;
  medicineName?: string;
  dosageTime?: string;
  onTake?: () => void;
}

export function MedicationAdherenceMiniCard({
  initialStreakDays = 6,
  adherencePercentage = 94,
  medicineName = "Tab. Paracetamol 500mg",
  dosageTime = "02:00 PM (After Lunch)",
  onTake,
}: MedicationAdherenceProps) {
  const { locale } = useI18n();
  const [taken, setTaken] = useState(false);
  const streak = taken ? initialStreakDays + 1 : initialStreakDays;

  return (
    <div
      data-testid="ai-tool-medication-adherence"
      className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-cyan-950/40 border border-cyan-500/30 shadow-lg text-slate-100 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">
              {locale === "bn" ? "ওষুধ গ্রহণ ও নিয়মানুবর্তিতা" : "Medication Adherence Track"}
            </h4>
            <p className="text-[10px] text-cyan-300/80 font-mono">
              {locale === "bn" ? "লভেবল-ডিজাইন এআই উইজেট" : "Lovable-Assisted Component"}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 border border-emerald-500/50 text-emerald-300">
          {streak} {locale === "bn" ? "দিনের ধারাবাহিকতা" : "Days Streak"}
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">{medicineName}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{dosageTime}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono font-bold text-cyan-400">{adherencePercentage}%</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wider">
            {locale === "bn" ? "পালন হার" : "Adherence"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={taken}
          onClick={() => {
            setTaken(true);
            onTake?.();
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            taken
              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-600/50 cursor-default"
              : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {taken
            ? locale === "bn"
              ? "গ্রহণ সম্পন্ন"
              : "Marked Taken"
            : locale === "bn"
              ? "এখনই সেবন চিহ্নিত করুন"
              : "Mark as Taken"}
        </button>
      </div>
    </div>
  );
}
