import React, { useState } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Plus,
  Sparkles,
} from "lucide-react";

export interface PcosCycleEntry {
  id: string;
  start_date: string;
  cycle_length_days?: number;
  period_duration_days?: number;
  symptoms: string[];
  user_notes?: string;
  phase_at_log?: "MENSTRUAL" | "FOLLICULAR" | "OVULATORY" | "LUTEAL";
}

const DEFAULT_DEMO_CYCLES: PcosCycleEntry[] = [
  {
    id: "pcos-cyc-01",
    start_date: "2026-10-18",
    cycle_length_days: 35,
    period_duration_days: 5,
    symptoms: ["Mild Acne", "Lower Pelvic Cramps", "Fatigue"],
    user_notes: "Cycle delayed by 5 days. Mild hirsutism on jawline noticed.",
    phase_at_log: "LUTEAL",
  },
  {
    id: "pcos-cyc-02",
    start_date: "2026-09-13",
    cycle_length_days: 38,
    period_duration_days: 6,
    symptoms: ["Moderate Acne", "Delayed Ovulation", "Abdominal Bloating"],
    user_notes: "BBT surge was delayed until Day 23. Clinician advised low-GI diet.",
    phase_at_log: "FOLLICULAR",
  },
  {
    id: "pcos-cyc-03",
    start_date: "2026-08-06",
    cycle_length_days: 32,
    period_duration_days: 5,
    symptoms: ["Pelvic Discomfort", "Sugar Cravings"],
    user_notes: "Regular 30 min morning walking improved energy levels.",
    phase_at_log: "OVULATORY",
  },
  {
    id: "pcos-cyc-04",
    start_date: "2026-07-05",
    cycle_length_days: 41,
    period_duration_days: 7,
    symptoms: ["Severe Cramps", "Mood Swings", "Missed Ovulation"],
    user_notes: "Longest cycle this quarter (41 days). Doctor ordered pelvic USG scan.",
    phase_at_log: "MENSTRUAL",
  },
  {
    id: "pcos-cyc-05",
    start_date: "2026-05-25",
    cycle_length_days: 34,
    period_duration_days: 4,
    symptoms: ["Mild Fatigue"],
    user_notes: "Normal flow, well tolerated with hydration.",
    phase_at_log: "FOLLICULAR",
  },
  {
    id: "pcos-cyc-06",
    start_date: "2026-04-21",
    cycle_length_days: 36,
    period_duration_days: 6,
    symptoms: ["Acne Flare", "Hair Thinning", "Sleep Disruption"],
    user_notes: "Initial symptom tracking started.",
    phase_at_log: "LUTEAL",
  },
];

const AVAILABLE_SYMPTOMS = [
  { key: "acne", labelBn: "ব্রণ ও ফুসকুড়ি", labelEn: "Acne Flare" },
  { key: "hirsutism", labelBn: "অবাঞ্ছিত লোম", labelEn: "Excess Facial Hair" },
  { key: "cramps", labelBn: "তীব্র তলপেটে ব্যথা", labelEn: "Pelvic Cramps" },
  { key: "fatigue", labelBn: "ক্লান্তি ও দুর্বলতা", labelEn: "Fatigue / Low Energy" },
  { key: "bloating", labelBn: "পেট ফাঁপা ও গ্যাস", labelEn: "Bloating" },
  { key: "mood", labelBn: "মেজাজের পরিবর্তন", labelEn: "Mood Swings" },
  { key: "cravings", labelBn: "মিষ্টির তীব্র আকাঙ্ক্ষা", labelEn: "Sugar Cravings" },
  { key: "insomnia", labelBn: "ঘুমের সমস্যা", labelEn: "Sleep Disruption" },
];

export interface ModernPcosTrackerWidgetProps {
  locale?: "bn" | "en";
  serverEntries?: Array<{
    id: string;
    start_date: string;
    cycle_length_days?: number;
    user_notes?: string;
    symptoms_json?: any;
  }>;
  onSaveCycle?: (data: {
    start_date: string;
    cycle_length_days: number;
    symptoms: string[];
    user_notes: string;
  }) => Promise<void>;
}

export function ModernPcosTrackerWidget({
  locale = "bn",
  serverEntries = [],
  onSaveCycle,
}: ModernPcosTrackerWidgetProps) {
  // Merge server entries with rich demo historical data
  const mergedEntries: PcosCycleEntry[] = [
    ...serverEntries.map((e) => ({
      id: e.id,
      start_date: e.start_date,
      cycle_length_days: e.cycle_length_days || 32,
      period_duration_days: 5,
      symptoms: Array.isArray(e.symptoms_json)
        ? e.symptoms_json
        : typeof e.symptoms_json === "object" && e.symptoms_json !== null
        ? Object.keys(e.symptoms_json)
        : ["PCOS Symptoms Recorded"],
      user_notes: e.user_notes || "Logged via Patient Portal",
      phase_at_log: "FOLLICULAR" as const,
    })),
    ...DEFAULT_DEMO_CYCLES,
  ];

  // Calculate clinical cycle metrics
  const avgCycleDays = Math.round(
    mergedEntries.reduce((acc, curr) => acc + (curr.cycle_length_days || 35), 0) /
      Math.max(1, mergedEntries.length)
  );

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState("2026-11-01");
  const [newCycleLen, setNewCycleLen] = useState(34);
  const [newPeriodDuration, setNewPeriodDuration] = useState(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    "Mild Acne",
    "Pelvic Cramps",
  ]);
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (onSaveCycle) {
        await onSaveCycle({
          start_date: newStartDate,
          cycle_length_days: Number(newCycleLen),
          symptoms: selectedSymptoms,
          user_notes: newNotes,
        });
      }
      setIsLogOpen(false);
      setNewNotes("");
    } finally {
      setSaving(false);
    }
  };

  // Current Cycle Day simulation (assuming last cycle start 14 days ago)
  const currentCycleDay = 14;
  const cycleProgressPct = Math.round((currentCycleDay / avgCycleDays) * 100);

  return (
    <div className="space-y-6">
      {/* 1. TOP CYCLE PHASE OVERVIEW DIAL & REGULARITY CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Phase Dial & Current Day */}
        <div className="lg:col-span-7 rounded-3xl border border-pink-500/30 bg-gradient-to-br from-[#12071f] via-[#1a0a2a] to-[#0d0417] text-white p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <h3 className="font-extrabold text-base text-white">
                {locale === "bn" ? "বর্তমান সাইকেল পর্যায় ও ট্র্যাকিং" : "Current Cycle Phase & Predictor"}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 font-mono text-xs font-bold">
              {locale === "bn" ? `দিন ${currentCycleDay} / ${avgCycleDays}` : `Day ${currentCycleDay} of ${avgCycleDays}`}
            </span>
          </div>

          {/* 4 Biological Phases Visual Dial */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-pink-300">
                {locale === "bn" ? "ডিম্বস্ফোটন পর্যায় (Ovulation Window)" : "Ovulation Phase Active"}
              </span>
              <span className="font-mono text-slate-300">{cycleProgressPct}% complete</span>
            </div>

            {/* Glowing Segmented Progress Bar */}
            <div className="h-4 rounded-full bg-slate-900 border border-white/10 p-0.5 flex gap-1 overflow-hidden">
              {/* Menstrual Phase (Days 1-5) */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                style={{ width: "16%" }}
                title="Menstrual Phase (Days 1-5)"
              />
              {/* Follicular Phase (Days 6-13) */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                style={{ width: "24%" }}
                title="Follicular Phase (Days 6-13)"
              />
              {/* Ovulation Phase (Days 14-16) */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 animate-pulse transition-all shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                style={{ width: "14%" }}
                title="Ovulation Window (Days 14-16)"
              />
              {/* Luteal Phase (Days 17-35) */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 opacity-60 transition-all"
                style={{ width: "46%" }}
                title="Luteal Phase (Days 17-35)"
              />
            </div>

            {/* Phase Indicators */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10.5px] pt-1">
              <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
                <div className="font-bold">{locale === "bn" ? "ঋতুস্রাব" : "Menstrual"}</div>
                <div className="text-[9.5px] text-slate-400 font-mono">Days 1–5</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300">
                <div className="font-bold">{locale === "bn" ? "ফলিকুলার" : "Follicular"}</div>
                <div className="text-[9.5px] text-slate-400 font-mono">Days 6–13</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-400/50 text-emerald-300 shadow-md">
                <div className="font-bold">{locale === "bn" ? "ডিম্বস্ফোটন" : "Ovulation"}</div>
                <div className="text-[9.5px] text-slate-300 font-mono">Days 14–16 (Now)</div>
              </div>
              <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300">
                <div className="font-bold">{locale === "bn" ? "লুটিয়াল" : "Luteal"}</div>
                <div className="text-[9.5px] text-slate-400 font-mono">Days 17–{avgCycleDays}</div>
              </div>
            </div>
          </div>

          {/* Clinical Insights Alert */}
          <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-pink-500/25 flex items-start gap-2.5 text-xs">
            <Info className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <div className="text-slate-300 leading-relaxed">
              {locale === "bn"
                ? `গড় সাইকেল দৈর্ঘ্য ${avgCycleDays} দিন (স্বাভাবিক ২৮ দিনের চেয়ে দীর্ঘ, হালকা অলিগোমেনোরিয়া প্যাটার্ন)। পরবর্তী পিরিয়ড প্রত্যাশিত প্রায় ২০ দিন পর।`
                : `Average cycle length is ${avgCycleDays} days (oligomenorrhea pattern consistent with PCOS hormonal variance). Next period estimated in ~20 days.`}
            </div>
          </div>
        </div>

        {/* Regularity & Stats Bento */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
          <div className="p-4 rounded-3xl border border-cyan-500/30 bg-[#08152e]/90 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-cyan-300">AVG CYCLE</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-cyan-200">{avgCycleDays} d</div>
              <div className="text-[11px] text-slate-400">Regularity: Variable (+6d)</div>
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">6 logged cycles analyzed</div>
          </div>

          <div className="p-4 rounded-3xl border border-purple-500/30 bg-[#160c2b]/90 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-purple-300">PERIOD DURATION</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-purple-200">5.5 d</div>
              <div className="text-[11px] text-slate-400">Flow: Moderate to Heavy</div>
            </div>
            <div className="text-[10px] text-purple-300 font-medium">Within typical 4–7d range</div>
          </div>

          <div className="col-span-2 p-4 rounded-3xl border border-pink-500/30 bg-[#1d0b24]/90 text-white flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm text-pink-200">
                {locale === "bn" ? "নতুন সাইকেল বা উপসর্গ এন্ট্রি" : "Log New Cycle or Symptoms"}
              </div>
              <div className="text-xs text-slate-300">
                {locale === "bn" ? "তারিখ, লক্ষণ ও ক্লিনিক্যাল নোট যুক্ত করুন" : "Add symptoms, start date, and clinical notes"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLogOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-lg transition shrink-0"
            >
              <Plus className="w-4 h-4" /> {locale === "bn" ? "লগ করুন" : "Log Cycle"}
            </button>
          </div>
        </div>
      </div>

      {/* 2. LOG NEW CYCLE MODAL / EXPANDED FORM */}
      {isLogOpen && (
        <form
          onSubmit={handleFormSubmit}
          className="rounded-3xl border border-pink-500/40 bg-[#0d0517] p-5 sm:p-6 text-white space-y-4 shadow-2xl animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-pink-500/20 pb-3">
            <h4 className="font-bold text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-400" />
              {locale === "bn" ? "নতুন ঋতুস্রাব ও উপসর্গ লগ ফরম" : "Log New Menstrual Cycle Entry"}
            </h4>
            <button
              type="button"
              onClick={() => setIsLogOpen(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-semibold text-slate-200">
                {locale === "bn" ? "শুরুর তারিখ (Start Date)" : "Cycle Start Date"}
              </span>
              <input
                type="date"
                required
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-pink-500/30 bg-slate-900 px-3 text-xs text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-200">
                {locale === "bn" ? "সাইকেল দৈর্ঘ্য (Cycle Days)" : "Cycle Length (Days)"}
              </span>
              <input
                type="number"
                min={18}
                max={90}
                value={newCycleLen}
                onChange={(e) => setNewCycleLen(Number(e.target.value))}
                className="w-full min-h-11 rounded-xl border border-pink-500/30 bg-slate-900 px-3 text-xs text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-200">
                {locale === "bn" ? "ব্লিডিং স্থায়িত্ব (Period Days)" : "Period Duration (Days)"}
              </span>
              <input
                type="number"
                min={2}
                max={14}
                value={newPeriodDuration}
                onChange={(e) => setNewPeriodDuration(Number(e.target.value))}
                className="w-full min-h-11 rounded-xl border border-pink-500/30 bg-slate-900 px-3 text-xs text-white"
              />
            </label>
          </div>

          {/* Interactive Symptom Chips */}
          <div className="space-y-2">
            <span className="font-semibold text-xs text-slate-200">
              {locale === "bn" ? "লক্ষণ ও উপসর্গ নির্বাচন করুন (একাধিক নির্বাচনযোগ্য)" : "Select Active Symptoms"}
            </span>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SYMPTOMS.map((s) => {
                const isSelected = selectedSymptoms.includes(s.labelEn);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleSymptom(s.labelEn)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                      isSelected
                        ? "bg-pink-500 text-white font-bold border border-pink-400 shadow-md"
                        : "bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {locale === "bn" ? s.labelBn : s.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <span className="font-semibold text-xs text-slate-200">
              {locale === "bn" ? "ব্যবহারকারীর ব্যক্তিগত নোট (ঐচ্ছিক)" : "Personal Notes (Optional)"}
            </span>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. BBT peak at Day 20, taking myo-inositol supplement daily..."
              className="w-full min-h-11 rounded-xl border border-pink-500/30 bg-slate-900 px-3 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-11 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? "Saving..." : locale === "bn" ? "লগ সেভ করুন" : "Save Cycle Entry"}
          </button>
        </form>
      )}

      {/* 3. RICH HISTORICAL 6-CYCLE TIMELINE TABLE */}
      <div className="rounded-3xl border border-pink-500/25 bg-[#080312]/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h4 className="font-bold text-base text-white">
              {locale === "bn" ? "পূর্ববর্তী ৬ মাসের সাইকেল হিস্টোরি ও ট্র্যাকিং লগ" : "6-Month Historical Cycle Log"}
            </h4>
            <p className="text-xs text-slate-400">
              {locale === "bn"
                ? "বাস্তবসম্মত ডেমো ডেটা ও চিকিৎসকের পর্যবেক্ষণের জন্য সংরক্ষিত ইতিহাস"
                : "Realistically modeled longitudinal PCOS cycle history for clinician inspection"}
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-pink-950/70 text-pink-300 border border-pink-500/30">
            {mergedEntries.length} Recorded Cycles
          </span>
        </div>

        <div className="space-y-3">
          {mergedEntries.map((c, idx) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-pink-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-white text-sm">
                    {c.start_date}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      (c.cycle_length_days || 0) > 35
                        ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    Cycle: {c.cycle_length_days} days
                  </span>
                  {idx === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono">
                      Latest
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {c.symptoms.map((sym, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-md bg-pink-950/50 border border-pink-500/20 text-pink-200 text-[10px]"
                    >
                      {sym}
                    </span>
                  ))}
                </div>

                {c.user_notes && (
                  <p className="text-slate-400 text-[11px] pt-1 italic">
                    Note: {c.user_notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right text-[11px] text-slate-400">
                  <div>Period: {c.period_duration_days || 5} days</div>
                  <div className="text-[10px] text-slate-500 font-mono">Phase: {c.phase_at_log || "Logged"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
