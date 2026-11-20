import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock,
  Droplet,
  FlaskConical,
  HeartPulse,
  Home,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { formatBdtFromPoisha } from "../../lib/formatters";
import type { Locale } from "../../lib/i18n";
import {
  SimulatedPaymentCheckoutModal,
  type SimulatedPaymentSuccessPayload,
} from "../billing/SimulatedPaymentCheckoutModal";
import { DiagnosticTestVisual } from "./DiagnosticTestVisual";

export interface DiagnosticPanelItem {
  id: string;
  code: string;
  name_bn: string;
  name_en: string;
  category: string;
  sample_type: string;
  fee_minor_poisha: number;
  turnaround_hours: number;
}

const DIAG_SECTORS = [
  { key: "ALL", labelEn: "All Panels (12)", labelBn: "সকল ১২টি ল্যাব টেস্ট", icon: FlaskConical, color: "text-cyan-300" },
  { key: "Hematology", labelEn: "Hematology & Blood", labelBn: "রক্ত রোগ ও সিবিসি", icon: Droplet, color: "text-rose-400" },
  { key: "Metabolic", labelEn: "Metabolic & Diabetes", labelBn: "ডায়াবেটিস ও মেটাবলিক", icon: Activity, color: "text-emerald-300" },
  { key: "Endocrinology", labelEn: "Hormones & Thyroid", labelBn: "হরমোন ও থাইরয়েড", icon: Sparkles, color: "text-sky-300" },
  { key: "Cardiology", labelEn: "Cardiology & Lipid", labelBn: "লিপিড ও হৃদরোগ", icon: HeartPulse, color: "text-amber-300" },
  { key: "Infectious", labelEn: "Infectious & Dengue", labelBn: "ডেঙ্গু ও সংক্রামক", icon: ShieldCheck, color: "text-purple-300" },
];

export function DiagnosticLabSectorGrid({
  tests,
  locale,
  onBookTest,
}: {
  tests: DiagnosticPanelItem[];
  locale: Locale;
  onBookTest?: (test: DiagnosticPanelItem) => void;
}) {
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [bookedNotice, setBookedNotice] = useState<string | null>(null);
  const [checkoutTest, setCheckoutTest] = useState<DiagnosticPanelItem | null>(null);

  const filteredTests = tests.filter((t) => {
    if (selectedSector === "ALL") return true;
    return t.category.toLowerCase().includes(selectedSector.toLowerCase()) ||
           (selectedSector === "Cardiology" && (t.code.includes("LIP") || t.code.includes("ECG"))) ||
           (selectedSector === "Metabolic" && (t.code.includes("FBG") || t.category === "Metabolic"));
  });

  const handleBooking = (test: DiagnosticPanelItem) => {
    if (onBookTest) {
      onBookTest(test);
    } else {
      setCheckoutTest(test);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sector Category Cards (Click a Sector to reveal tests) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {DIAG_SECTORS.map((sec) => {
          const Icon = sec.icon;
          const isSelected = selectedSector === sec.key;
          const count = tests.filter((t) => {
            if (sec.key === "ALL") return true;
            return t.category.toLowerCase().includes(sec.key.toLowerCase()) ||
                   (sec.key === "Cardiology" && (t.code.includes("LIP") || t.code.includes("ECG"))) ||
                   (sec.key === "Metabolic" && (t.code.includes("FBG") || t.category === "Metabolic"));
          }).length;

          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => setSelectedSector(sec.key)}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? "bg-gradient-to-br from-cyan-950/70 via-slate-900 to-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] scale-[1.02]"
                  : "bg-slate-950/70 hover:bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${sec.color}`} />
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {count}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs text-white leading-tight">
                  {locale === "bn" ? sec.labelBn : sec.labelEn}
                </div>
                <div className="text-[10px] font-mono text-cyan-300/80 mt-0.5">
                  Click to inspect
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {bookedNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <span>{bookedNotice}</span>
          <span className="font-mono text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
            DEMO CONFIRMED
          </span>
        </div>
      )}

      {/* Revealed Filtered Diagnostic Test Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            className="ss-sapphire-card rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-cyan-400/60 transition group"
          >
            <div className="flex items-start gap-3.5">
              <DiagnosticTestVisual code={test.code} category={test.category} />

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {test.code}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> {test.turnaround_hours}h TAT
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition line-clamp-1">
                  {locale === "bn" ? test.name_bn : test.name_en}
                </h4>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>{test.category}</span>
                  <span>•</span>
                  <span className="truncate">{test.sample_type}</span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">Test Fee</span>
                <span className="font-mono font-extrabold text-sm text-[#f2c879]">
                  {formatBdtFromPoisha(test.fee_minor_poisha, locale)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hidden sm:inline-flex items-center gap-1">
                  <Home className="w-3 h-3" /> Home Collect
                </span>
                <button
                  type="button"
                  onClick={() => handleBooking(test)}
                  className="min-h-8 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 hover:text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition"
                >
                  {locale === "bn" ? "অর্ডার ডেমো" : "Book Lab"} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SimulatedPaymentCheckoutModal
        isOpen={Boolean(checkoutTest)}
        category="DIAGNOSTIC"
        title={locale === "bn" ? "ডায়াগনস্টিক ল্যাব টেস্ট ও হোম কালেকশন বুকিং" : "Diagnostic Lab Panel & Home Collection Checkout"}
        itemDescription={
          checkoutTest
            ? `${checkoutTest.code} — ${locale === "bn" ? checkoutTest.name_bn : checkoutTest.name_en} (${checkoutTest.sample_type})`
            : ""
        }
        amountPoisha={checkoutTest?.fee_minor_poisha || 0}
        onSuccess={(payload: SimulatedPaymentSuccessPayload) => {
          setBookedNotice(
            locale === "bn"
              ? `ল্যাব টেস্ট বুকিং ও পেমেন্ট সফল (${checkoutTest?.code})! রসিদ: ${payload.receiptNumber} (${payload.transactionId}) — অ্যাডমিন ব্যাংক ড্যাশবোর্ডে যুক্ত হয়েছে।`
              : `Lab Order & Payment Confirmed (${checkoutTest?.code})! Receipt: ${payload.receiptNumber} (${payload.transactionId}) synced to Admin Treasury.`
          );
          setCheckoutTest(null);
        }}
        onClose={() => setCheckoutTest(null)}
      />
    </div>
  );
}
