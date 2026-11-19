import { useState } from "react";
import { Scale, Droplets } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export function BmiHydrationGaugeCard() {
  const { locale } = useI18n();
  const [weightKg, setWeightKg] = useState<number>(68);
  const [heightCm, setHeightCm] = useState<number>(170);

  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  const waterTargetL = Number((weightKg * 0.033).toFixed(1));

  let categoryEn = "Normal";
  let categoryBn = "স্বাভাবিক";
  let color = "text-emerald-400";

  if (bmi < 18.5) {
    categoryEn = "Underweight";
    categoryBn = "কম ওজন";
    color = "text-amber-400";
  } else if (bmi >= 25 && bmi < 29.9) {
    categoryEn = "Overweight";
    categoryBn = "অতিরিক্ত ওজন";
    color = "text-amber-400";
  } else if (bmi >= 30) {
    categoryEn = "Obese";
    categoryBn = "স্থূলতা";
    color = "text-rose-400";
  }

  return (
    <div
      data-testid="ai-tool-bmi-hydration"
      className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-teal-950/40 border border-teal-500/30 shadow-lg text-slate-100 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-500/50 flex items-center justify-center text-teal-300">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">
              {locale === "bn" ? "বিএমআই ও হাইড্রেশন ক্যালকুলেটর" : "BMI & Hydration Metric Gauge"}
            </h4>
            <p className="text-[10px] text-teal-300/80 font-mono">
              {locale === "bn" ? "কার্সর-ডিজাইন এআই উইজেট" : "Cursor-Assisted Component"}
            </p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 border border-slate-700 ${color}`}>
          {locale === "bn" ? categoryBn : categoryEn}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-teal-400" />
            <span>{locale === "bn" ? "বডি মাস ইনডেক্স (BMI)" : "Body Mass Index"}</span>
          </div>
          <div className="text-2xl font-black font-mono text-white">{bmi}</div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <input
              type="range"
              min="40"
              max="120"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="w-16 accent-teal-400 cursor-pointer"
            />
            <span>{weightKg} kg</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>{locale === "bn" ? "দৈনিক পানি গ্রহণ লক্ষ্য" : "Daily Water Target"}</span>
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300">{waterTargetL} L</div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <input
              type="range"
              min="140"
              max="200"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-16 accent-cyan-400 cursor-pointer"
            />
            <span>{heightCm} cm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
