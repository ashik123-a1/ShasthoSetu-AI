import {
  Activity,
  Baby,
  Bone,
  Heart,
  HeartPulse,
  Pill,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ClinicalSector {
  key: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export const CLINICAL_SECTORS: ClinicalSector[] = [
  {
    key: "General Physician",
    titleBn: "জেনারেল ফিজিশিয়ান",
    titleEn: "General Physician",
    subtitleBn: "প্রাইমারি কেয়ার ও জ্বর",
    subtitleEn: "Primary Care & Acute Illnesses",
    icon: Stethoscope,
    iconColor: "text-sky-300",
    iconBg: "bg-sky-500/15 border-sky-400/35",
  },
  {
    key: "Pediatrics",
    titleBn: "পেডিয়াট্রিক্স",
    titleEn: "Pediatrics",
    subtitleBn: "শিশু স্বাস্থ্য বিষয়ক পরামর্শ",
    subtitleEn: "Child Health & Immunizations",
    icon: Baby,
    iconColor: "text-emerald-300",
    iconBg: "bg-emerald-500/15 border-emerald-400/35",
  },
  {
    key: "Gynecology",
    titleBn: "গাইনী ও অবস",
    titleEn: "Gynecology & Obs",
    subtitleBn: "স্ত্রী, পিসিওএস ও প্রসূতি",
    subtitleEn: "Women's Health, PCOS & Pregnancy",
    icon: HeartPulse,
    iconColor: "text-pink-300",
    iconBg: "bg-pink-500/15 border-pink-400/35",
  },
  {
    key: "Dermatology",
    titleBn: "ডার্মাটোলজি",
    titleEn: "Dermatology",
    subtitleBn: "চর্ম, চুল, র‍্যাশ ও এলার্জি",
    subtitleEn: "Skin, Viral Rash & Hair Care",
    icon: Sparkles,
    iconColor: "text-amber-300",
    iconBg: "bg-amber-500/15 border-amber-400/35",
  },
  {
    key: "Internal Medicine",
    titleBn: "ইন্টারনাল মেডিসিন",
    titleEn: "Internal Medicine",
    subtitleBn: "জেনারেল হেলথ ও দীর্ঘমেয়াদি রোগ",
    subtitleEn: "Adult Complex Care & Fever",
    icon: Pill,
    iconColor: "text-cyan-300",
    iconBg: "bg-cyan-500/15 border-cyan-400/35",
  },
  {
    key: "Endocrinology",
    titleBn: "এন্ডোক্রিনোলজি",
    titleEn: "Endocrinology",
    subtitleBn: "ডায়াবেটিস, থাইরয়েড ও হরমোন",
    subtitleEn: "Diabetes, Thyroid & Hormones",
    icon: Activity,
    iconColor: "text-indigo-300",
    iconBg: "bg-indigo-500/15 border-indigo-400/35",
  },
  {
    key: "Cardiology",
    titleBn: "কার্ডিওলজি",
    titleEn: "Cardiology",
    subtitleBn: "হৃদরোগ, বুক ব্যথা ও রক্তচাপ",
    subtitleEn: "Heart, BP & ECG Review",
    icon: Heart,
    iconColor: "text-rose-300",
    iconBg: "bg-rose-500/15 border-rose-400/35",
  },
  {
    key: "Orthopedics",
    titleBn: "অর্থোপেডিক্স",
    titleEn: "Orthopedics",
    subtitleBn: "হাড়, জয়েন্ট ও কোমর ব্যথা",
    subtitleEn: "Bones, Joints & Sports Injury",
    icon: Bone,
    iconColor: "text-teal-300",
    iconBg: "bg-teal-500/15 border-teal-400/35",
  },
];

export function DepartmentSectorGrid({
  doctors,
  selectedKey = "",
  locale = "bn",
  showAllButton = true,
  showingAll = false,
  onSelectSector,
  onToggleShowAll,
}: {
  doctors: Array<{ specialty: string }>;
  selectedKey?: string;
  locale?: "bn" | "en";
  showAllButton?: boolean;
  showingAll?: boolean;
  onSelectSector: (sectorKey: string) => void;
  onToggleShowAll?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {locale === "bn" ? "ডিপার্টমেন্ট অনুযায়ী ডাক্তার খুঁজুন" : "Find Doctors by Clinical Department"}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {locale === "bn"
              ? "যেকোনো একটি ডিপার্টমেন্টে ক্লিক করলেই ওই বিভাগের সকল ডাক্তার দেখতে পাবেন"
              : "Tap any clinical department below to view specialists in that sector"}
          </p>
        </div>

        {showAllButton && onToggleShowAll && (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="min-h-10 px-4 rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <Users className="w-3.5 h-3.5" />
            {showingAll
              ? locale === "bn"
                ? "ডিপার্টমেন্টে ফিরুন"
                : "Back to Departments"
              : locale === "bn"
                ? `সব ডাক্তার দেখুন (${doctors.length || 43} জন)`
                : `View All Doctors (${doctors.length || 43})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {CLINICAL_SECTORS.map((sec) => {
          const Icon = sec.icon;
          const count = doctors.filter((d) =>
            d.specialty.toLowerCase().includes(sec.key.toLowerCase())
          ).length;
          const active = selectedKey === sec.key;

          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => onSelectSector(sec.key)}
              className={`bento-card rounded-2xl p-4 sm:p-5 text-center flex flex-col items-center justify-between gap-2.5 cursor-pointer transition group ${
                active
                  ? "kpi-card-active border-cyan-400 bg-cyan-500/15"
                  : "hover:border-cyan-400/60"
              }`}
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 ${sec.iconBg}`}
              >
                <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${sec.iconColor}`} />
              </div>

              <div className="space-y-1">
                <div className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-200">
                  {locale === "bn" ? sec.titleBn : sec.titleEn}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {locale === "bn" ? sec.subtitleBn : sec.subtitleEn}
                </p>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 font-mono text-[10px] font-semibold text-cyan-300">
                {count || 5} {locale === "bn" ? "জন ডাক্তার" : "Doctors"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
