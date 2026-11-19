import { useState } from "react";
import {
  Calendar,
  ChevronRight,
  Pill,
  Search,
  Stethoscope,
} from "lucide-react";
import type { Locale } from "../../lib/i18n";
import {
  MedicalPrescriptionDocument,
  type MedicalPrescriptionProps,
} from "./MedicalPrescriptionDocument";

interface PrescriptionArchiveViewProps {
  prescriptions: Array<MedicalPrescriptionProps["prescription"]>;
  locale: Locale;
  activePatientName?: string;
  activeBloodGroup?: string;
}

export function PrescriptionArchiveView({
  prescriptions,
  locale,
  activePatientName,
  activeBloodGroup,
}: PrescriptionArchiveViewProps) {
  const [selectedRx, setSelectedRx] = useState<
    MedicalPrescriptionProps["prescription"] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = prescriptions.filter((rx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rx.rx_reference.toLowerCase().includes(q) ||
      (rx.doctor_name || "").toLowerCase().includes(q) ||
      (rx.diagnosis_summary || "").toLowerCase().includes(q) ||
      (rx.doctor_specialty || "").toLowerCase().includes(q)
    );
  });

  if (selectedRx) {
    return (
      <div className="space-y-4">
        <MedicalPrescriptionDocument
          prescription={{
            ...selectedRx,
            patient_name: activePatientName || selectedRx.patient_name || "রহিমা বেগম (Rahima Begum)",
            patient_blood_group: activeBloodGroup || selectedRx.patient_blood_group || "O+",
          }}
          locale={locale}
          onClose={() => setSelectedRx(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-400" />
            {locale === "bn"
              ? "প্রেসক্রিপশন ইতিহাস ও ডিজিটাল আর্কাইভ"
              : "Prescription History & Digital Archive"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {locale === "bn"
              ? "আপনার পূর্বের ও বর্তমান চিকিৎসকদের ইস্যুকৃত সকল ই-প্রেসক্রিপশন দেখুন এবং মেডিকেল PDF ডাউনলোড করুন।"
              : "Access, review, and print medical-grade PDFs for all past and current clinician-signed prescriptions."}
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              locale === "bn"
                ? "প্রেসক্রিপশন বা ডাক্তার খুঁজুন..."
                : "Search by Rx code, doctor, or diagnosis..."
            }
            className="w-full min-h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Prescriptions List Cards */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
          {locale === "bn"
            ? "কোনো প্রেসক্রিপশন পাওয়া যায়নি।"
            : "No prescriptions found matching your query."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rx) => {
            let medCount = 1;
            if (rx.medications && Array.isArray(rx.medications)) {
              medCount = rx.medications.length;
            } else if (rx.medications_json) {
              try {
                const parsed = JSON.parse(rx.medications_json);
                if (Array.isArray(parsed)) medCount = parsed.length;
              } catch {
                medCount = 1;
              }
            }

            return (
              <div
                key={rx.rx_reference}
                className="bento-card rounded-2xl p-5 flex flex-col justify-between gap-4 border border-slate-800 hover:border-emerald-400/50 transition cursor-pointer"
                onClick={() => setSelectedRx(rx)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 rounded-lg">
                      {rx.rx_reference}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {rx.signed_at_utc ? new Date(rx.signed_at_utc).toLocaleDateString() : "Recent"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">{rx.doctor_name || "Specialist Doctor"}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {rx.doctor_specialty || "General Physician"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Diagnosis (সারসংক্ষেপ)
                    </span>
                    <p className="font-medium text-slate-200 line-clamp-2">
                      {rx.diagnosis_summary}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/20 px-2 py-0.5 rounded">
                    {medCount} Prescribed Medicines
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRx(rx);
                    }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{locale === "bn" ? "পূর্ণাঙ্গ প্রেসক্রিপশন" : "View & Print"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
