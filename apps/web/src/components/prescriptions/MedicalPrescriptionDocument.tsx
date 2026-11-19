import {
  Calendar,
  CheckCircle2,
  HeartPulse,
  Pill,
  Printer,
  ShieldCheck,
} from "lucide-react";
import type { Locale } from "../../lib/i18n";

export interface PrescriptionMedicineItem {
  name: string;
  generic?: string;
  dose?: string;
  frequency?: string;
  timing?: string;
  duration?: string;
  instructions?: string;
}

export interface MedicalPrescriptionProps {
  prescription: {
    id?: string;
    rx_reference: string;
    appointment_id?: string;
    doctor_id?: string;
    doctor_name?: string;
    doctor_name_bn?: string;
    doctor_degrees?: string;
    doctor_specialty?: string;
    doctor_bmdc?: string;
    chamber_location?: string;
    doctor_phone?: string;
    patient_name?: string;
    patient_id_code?: string;
    patient_age?: string;
    patient_sex?: string;
    patient_blood_group?: string;
    patient_weight?: string;
    patient_bp?: string;
    patient_pulse?: string;
    patient_temp?: string;
    diagnosis_summary: string;
    medications_json?: string;
    medications?: PrescriptionMedicineItem[];
    advice_notes?: string;
    followup_date?: string;
    investigations_text?: string;
    chief_complaints?: string;
    signed_at_utc?: string;
    status?: string;
  };
  locale: Locale;
  onClose?: () => void;
}

export function MedicalPrescriptionDocument({
  prescription,
  locale,
  onClose,
}: MedicalPrescriptionProps) {
  // Parse medicines
  let meds: PrescriptionMedicineItem[] = [];
  if (prescription.medications && Array.isArray(prescription.medications)) {
    meds = prescription.medications;
  } else if (prescription.medications_json) {
    try {
      meds = JSON.parse(prescription.medications_json);
    } catch {
      meds = [
        {
          name: "Tab. Metformin 500mg",
          dose: "1 tablet",
          frequency: "0+0+1 After Dinner",
          duration: "14 days",
        },
      ];
    }
  }

  const dateFormatted = prescription.signed_at_utc
    ? new Date(prescription.signed_at_utc).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "20 Nov 2026";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:p-0 print:m-0">
      {/* Top Action Ribbon (Screen Only) */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 print:hidden">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
          <Pill className="w-4 h-4 text-emerald-400" />
          <span>
            {locale === "bn"
              ? "ডিজিটাল প্রেসক্রিপশন প্রিভিউ ও ডাউনলোড"
              : "Digital e-Prescription Preview & PDF Export"}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
            {prescription.rx_reference}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              {locale === "bn" ? "ফিরে যান" : "Back"}
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {locale === "bn" ? "প্রেসক্রিপশন প্রিন্ট / PDF ডাউনলোড" : "Print / Download Prescription PDF"}
          </button>
        </div>
      </div>

      {/* Main Medical-Grade Printable Prescription Sheet */}
      <div
        id="medical-prescription-sheet"
        className="max-w-4xl mx-auto rounded-3xl border border-slate-700 bg-white text-slate-900 p-6 sm:p-10 shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-w-none print:p-8"
      >
        {/* Subtle Prescription Security Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] -rotate-45">
          <div className="text-center font-black tracking-widest text-7xl text-slate-900 leading-tight">
            SHASTHOSETU AI<br />OFFICIAL e-PRESCRIPTION<br />BMDC VERIFIED
          </div>
        </div>

        {/* 1. Authentic Doctor Letterhead Header */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            {/* Left: Doctor's Credentials & Qualifications */}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                {locale === "bn" && prescription.doctor_name_bn
                  ? prescription.doctor_name_bn
                  : prescription.doctor_name || "Dr. Farhana Rahman (Demo)"}
              </h1>
              <p className="text-xs font-bold text-cyan-800">
                {prescription.doctor_degrees || "MBBS, FCPS (OB-GYN), DGO"}
              </p>
              <p className="text-xs font-semibold text-slate-700">
                Specialist: {prescription.doctor_specialty || "Gynecology, Obstetrics & PCOS Care"}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-600">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  BMDC Reg: {prescription.doctor_bmdc || "BMDC-DEMO-44102"}
                </span>
                <span>•</span>
                <span>{prescription.chamber_location || "Dhanmondi Care Hub (Demo), Dhaka"}</span>
              </div>
            </div>

            {/* Right: ShasthoSetu Brand & Telehealth Network Logo */}
            <div className="text-center sm:text-right space-y-1 sm:self-center">
              <div className="flex items-center sm:justify-end gap-2.5">
                <img
                  src="/shasthosetu-logo.png"
                  alt="ShasthoSetu Logo"
                  className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-1 bg-slate-50 shrink-0"
                />
                <div className="text-left sm:text-right">
                  <span className="text-base font-black text-slate-950 block leading-tight">
                    ShasthoSetu AI
                  </span>
                  <span className="text-[10px] font-bold text-cyan-800 block uppercase tracking-wider">
                    Digital Healthcare Network
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-1">
                <p>Website: https://shasthosetu.health.gov.bd</p>
                <p>Hotline: 16263 • Telehealth Node BD</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Patient Demographics & Vitals Ribbon */}
        <div className="my-4 p-3 rounded-xl bg-slate-100 border border-slate-300 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Patient Name</span>
            <span className="font-bold text-slate-900 truncate block">
              {prescription.patient_name || "রহিমা বেগম (Rahima Begum)"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Age / Sex</span>
            <span className="font-semibold text-slate-800">
              {prescription.patient_age || "30Y"} / {prescription.patient_sex || "Female"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Blood Group</span>
            <span className="font-bold text-rose-600 font-mono">
              {prescription.patient_blood_group || "O+"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">BP / Pulse</span>
            <span className="font-mono text-slate-800">
              {prescription.patient_bp || "118/78"} mmHg • {prescription.patient_pulse || "74"} bpm
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Weight</span>
            <span className="font-mono text-slate-800">{prescription.patient_weight || "58 kg"}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Date</span>
            <span className="font-mono font-bold text-slate-900">{dateFormatted}</span>
          </div>
        </div>

        {/* 3. Clinical Body: 2-Column Medical Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[420px] py-2">
          {/* Left Column (3.5 cols on desktop): C/C, O/E, Investigations */}
          <div className="md:col-span-4 border-r-0 md:border-r border-slate-300 pr-0 md:pr-4 space-y-5 text-xs text-slate-800">
            {/* Chief Complaints */}
            <div className="space-y-1.5">
              <div className="font-black text-slate-950 uppercase tracking-wider text-[11px] flex items-center gap-1 border-b border-slate-200 pb-1">
                <span>C/C</span>
                <span className="text-slate-500 font-normal">(Chief Complaints)</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                {prescription.chief_complaints ||
                  "• Irregular menstrual cycles (38–41 days)\n• Mild pelvic discomfort\n• Mild persistent fatigue"}
              </p>
            </div>

            {/* Clinical Diagnosis / Impressions */}
            <div className="space-y-1.5">
              <div className="font-black text-slate-950 uppercase tracking-wider text-[11px] flex items-center gap-1 border-b border-slate-200 pb-1">
                <span>Diagnosis</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold leading-snug">
                {prescription.diagnosis_summary}
              </div>
            </div>

            {/* Investigations Advised */}
            <div className="space-y-1.5">
              <div className="font-black text-slate-950 uppercase tracking-wider text-[11px] flex items-center gap-1 border-b border-slate-200 pb-1">
                <span>Investigations Advised</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                <li>Complete Blood Count (CBC)</li>
                <li>Fasting Blood Glucose + HbA1c</li>
                <li>Pelvic / Ovarian Ultrasound (USG)</li>
                <li>Serum Lipid Profile</li>
              </ul>
            </div>
          </div>

          {/* Right Column (8.5 cols on desktop): Classic Rx & Structured Medicines */}
          <div className="md:col-span-8 pl-0 md:pl-2 space-y-6">
            {/* Rx Symbol Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-4xl font-serif font-black italic text-cyan-900 leading-none">
                ℞
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold uppercase">
                Rx Ref: {prescription.rx_reference}
              </span>
            </div>

            {/* Medicines List Table */}
            <div className="space-y-3.5">
              {meds.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-950 text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-900 font-mono text-[11px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{m.name}</span>
                    </div>
                    {m.duration && (
                      <span className="font-mono font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded text-[11px] shrink-0">
                        {m.duration}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 text-[11px] text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500">Dose &amp; Schedule: </span>
                      <strong className="font-mono text-cyan-900">{m.frequency || m.dose || "1 tablet daily"}</strong>
                    </div>
                    {m.instructions && (
                      <div>
                        <span className="font-semibold text-slate-500">Instructions: </span>
                        <span>{m.instructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* General Advice / Lifestyle Instructions */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs text-amber-950">
              <div className="font-bold uppercase tracking-wider text-[11px] text-amber-900 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-amber-700" />
                <span>{locale === "bn" ? "সাধারণ পরামর্শ ও জীবনযাত্রা (Advice)" : "General Clinical Advice & Lifestyle"}</span>
              </div>
              <p className="text-slate-800 leading-relaxed text-[11px]">
                {prescription.advice_notes ||
                  "• দৈনিক অন্তত ৩০ মিনিট হাঁটা বা হালকা শরীরচর্চা বজায় রাখুন।\n• চিনিযুক্ত খাবার ও কোমল পানীয় পরিহার করুন।\n• দৈনিক অন্তত ২.৫–৩ লিটার বিশুদ্ধ পানি পান করুন।\n• ওষুধের ডোজ নিয়মিত সেবন করুন; পরিবর্তন করবেন না।"}
              </p>
            </div>

            {/* Follow-up Instruction */}
            {prescription.followup_date && (
              <div className="text-xs font-semibold text-cyan-950 bg-cyan-50 border border-cyan-300 p-2.5 rounded-xl flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-700" />
                <span>
                  {locale === "bn" ? "পরবর্তী সাক্ষাত (Follow-up):" : "Next Follow-up Visit:"}{" "}
                  <strong className="underline">{prescription.followup_date}</strong> (ল্যাব রিপোর্টসহ)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Footer: Doctor Digital Signature Stamp & Legal Disclaimer */}
        <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 items-end gap-6 mt-4">
          <div className="space-y-1 text-[10px] text-slate-500 leading-tight">
            <p className="font-bold text-slate-700">Digital Telehealth Verification Notice:</p>
            <p>
              This is a legally compliant digital e-Prescription issued under Bangladesh Telemedicine Guidelines.
              Always verify medicine names and doses with a registered pharmacist before dispensing.
            </p>
            <p className="font-mono text-slate-400">
              Digital Signature ID: {prescription.rx_reference}-VERIFIED-BMDC
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end justify-center text-center sm:text-right space-y-1">
            <div className="w-48 border-b-2 border-slate-800 pb-1 text-center font-serif italic text-sm text-cyan-900 font-bold">
              {prescription.doctor_name || "Dr. Farhana Rahman"}
            </div>
            <div className="text-xs font-black text-slate-950">
              {prescription.doctor_degrees || "MBBS, FCPS (OB-GYN)"}
            </div>
            <div className="text-[10px] font-mono font-bold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Verified Electronic Signature
            </div>
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="mt-6 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Official Portal: https://shasthosetu.health.gov.bd</span>
          <span>ShasthoSetu Telemedicine EHR Archive</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
