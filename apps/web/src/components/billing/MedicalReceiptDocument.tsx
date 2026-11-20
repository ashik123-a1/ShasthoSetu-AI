import {
  Building2,
  CheckCircle2,
  FileCheck2,
  Globe,
  Phone,
  Printer,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { formatBdtFromPoisha } from "../../lib/formatters";

export interface MedicalReceiptProps {
  receipt: {
    id?: string;
    receipt_number: string;
    payment_id?: string;
    booking_reference?: string;
    appointment_id?: string;
    patient_name?: string;
    patient_id_code?: string;
    patient_blood_group?: string;
    patient_district?: string;
    doctor_name?: string;
    doctor_name_bn?: string;
    doctor_degrees?: string;
    doctor_specialty?: string;
    doctor_bmdc?: string;
    chamber_location?: string;
    amount_minor_poisha?: number;
    payment_method?: string;
    status?: string;
    issued_at_utc?: string;
    disclaimer_label?: string;
  };
  locale: Locale;
  onClose?: () => void;
}

export function MedicalReceiptDocument({ receipt, locale, onClose }: MedicalReceiptProps) {
  const methodMap: Record<string, string> = {
    DEMO_BKASH: "ShasthoPay MFS (Simulated)",
    DEMO_NAGAD: "Digital Direct Pay (Simulated)",
    DEMO_CARD: "Smart Health Card / Debit (Simulated)",
    DEMO_FREE: "Govt Health Waiver (Free)",
  };

  const paymentMethodLabel = methodMap[receipt.payment_method || ""] || receipt.payment_method || "ShasthoPay MFS (Simulated)";
  const feeAmount = Number(receipt.amount_minor_poisha || 50000);
  const formattedFee = formatBdtFromPoisha(feeAmount, locale);
  const dateFormatted = receipt.issued_at_utc
    ? new Date(receipt.issued_at_utc).toLocaleString("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " (BST)"
    : "20 Nov 2026, 10:30 AM (BST)";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:p-0 print:m-0" data-testid="demo-receipt-card">
      {/* Top Action Bar (Screen Only) */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 print:hidden">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>{locale === "bn" ? "মেডিকেল ইনভয়েস প্রিভিউ ও প্রিন্ট" : "Medical Invoice & Receipt Preview"}</span>
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
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {locale === "bn" ? "মেডিকেল রসিদ প্রিন্ট / PDF ডাউনলোড" : "Print / Download Medical PDF"}
          </button>
        </div>
      </div>

      {/* Main Medical-Grade Printable Invoice Sheet */}
      <div
        id="medical-receipt-sheet"
        className="max-w-3xl mx-auto rounded-3xl border border-slate-700 bg-white text-slate-900 p-6 sm:p-10 shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-w-none print:p-8"
      >
        {/* Subtle Security Watermark Across Receipt */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.035] -rotate-45">
          <div className="text-center font-black tracking-widest text-6xl text-slate-900 leading-tight">
            SHASTHOSETU AI<br />MEDICAL TELEHEALTH<br />SIMULATED RECEIPT
          </div>
        </div>

        {/* 1. Header with Official Logo & Clinic Information */}
        <div className="border-b-2 border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/shasthosetu-logo.png"
                alt="ShasthoSetu Logo"
                className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-slate-50 shrink-0"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
                  ShasthoSetu AI • স্বাস্থ্যসেতু
                </h1>
                <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider">
                  National Telehealth Care Network &amp; Digital Health Registry
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  Central Healthcare Dispatch Hub • Dhaka 1000, Bangladesh
                </p>
              </div>
            </div>

            <div className="text-center sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono text-xs font-bold">
                ✓ {receipt.status === "DEMO_PAID" ? "PAID / SIMULATED" : receipt.status || "PAID"}
              </span>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <p className="flex items-center sm:justify-end gap-1">
                  <Globe className="w-3 h-3 text-cyan-700" />
                  <a
                    href="https://shasthosetu.health.gov.bd"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline font-mono text-cyan-800"
                  >
                    https://shasthosetu.health.gov.bd
                  </a>
                </p>
                <p className="flex items-center sm:justify-end gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span className="font-mono">Helpline: 16263 / +880 9612-SHASTHO</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Receipt Meta Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Receipt Number</span>
            <span className="font-mono font-black text-slate-900 text-sm">{receipt.receipt_number}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Issue Date (BST)</span>
            <span className="font-mono text-slate-800 font-semibold">{dateFormatted}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Mode</span>
            <span className="font-mono font-bold text-cyan-800">{paymentMethodLabel}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Booking Reference</span>
            <span className="font-mono font-bold text-slate-900">{receipt.booking_reference || "APT-DEMO-9001"}</span>
          </div>
        </div>

        {/* 3. Patient & Attending Doctor Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-200">
          {/* Patient Card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>{locale === "bn" ? "রোগীর তথ্য" : "Patient Credentials"}</span>
            </div>
            <div className="space-y-1 text-xs text-slate-700">
              <p className="text-sm font-black text-slate-950">
                {receipt.patient_name || "রহিমা বেগম (Rahima Begum)"}
              </p>
              <div className="flex flex-wrap gap-x-3 text-[11px] font-mono text-slate-600">
                <span>Health ID: <strong>{receipt.patient_id_code || "SS-PT-884920"}</strong></span>
                <span>Blood: <strong className="text-rose-600">{receipt.patient_blood_group || "O+"}</strong></span>
              </div>
              <p className="text-[11px] text-slate-600">
                Location: {receipt.patient_district || "Dhaka"}, Bangladesh • Self/Owned Profile
              </p>
            </div>
          </div>

          {/* Attending Physician Card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>{locale === "bn" ? "পরামর্শক চিকিৎসক" : "Attending Clinician"}</span>
            </div>
            <div className="space-y-1 text-xs text-slate-700">
              <p className="text-sm font-black text-slate-950">
                {locale === "bn" && receipt.doctor_name_bn ? receipt.doctor_name_bn : receipt.doctor_name || "Dr. Farhana Rahman (Demo)"}
              </p>
              <p className="text-[11px] font-semibold text-cyan-800">
                {receipt.doctor_degrees || "MBBS, FCPS (OB-GYN)"} • {receipt.doctor_specialty || "Gynecology & PCOS"}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  {receipt.doctor_bmdc || "BMDC-DEMO-44102"}
                </span>
                <span>•</span>
                <span>{receipt.chamber_location || "Dhanmondi Care Hub, Dhaka"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Itemized Medical Charges Table */}
        <div className="my-6 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{locale === "bn" ? "সেবা ও খরচের বিস্তারিত হিসাব" : "Itemized Medical Service Charges"}</span>
          </div>
          <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                <th className="py-2.5 px-3">SL</th>
                <th className="py-2.5 px-3">Service Description</th>
                <th className="py-2.5 px-3">Specialty / Unit</th>
                <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="py-3 px-3 font-mono font-bold">01</td>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-950">
                    Telehealth Specialist Clinical Consultation (20 Min)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Encrypted WebRTC HD Video/Audio Session with digital clinical note
                  </div>
                </td>
                <td className="py-3 px-3">{receipt.doctor_specialty || "General Medicine"}</td>
                <td className="py-3 px-3 text-right font-mono font-bold">{formattedFee}</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold">02</td>
                <td className="py-3 px-3">
                  <div className="font-medium text-slate-900">National Health Telemedicine Platform Surcharge</div>
                  <div className="text-[11px] text-slate-500">Zero-PHI safe EHR Vault indexing &amp; notification dispatch</div>
                </td>
                <td className="py-3 px-3">Infrastructure</td>
                <td className="py-3 px-3 text-right font-mono text-slate-600">৳ 50.00</td>
              </tr>
              <tr className="bg-emerald-50/50">
                <td className="py-3 px-3 font-mono font-bold text-emerald-800">03</td>
                <td className="py-3 px-3 text-emerald-800">
                  <div className="font-bold">Digital Bangladesh Health Access Subsidy (100% Waiver)</div>
                  <div className="text-[11px] text-emerald-700">Government promotional digital healthcare incentive</div>
                </td>
                <td className="py-3 px-3 text-emerald-700 font-semibold">Promotion</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">- ৳ 50.00</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-sm border-t-2 border-slate-950">
                <td colSpan={3} className="py-3 px-4 text-right tracking-wider uppercase font-mono text-xs">
                  {locale === "bn" ? "পরিশোধিত মোট পরিমাণ (Total Paid):" : "Net Settled Amount (Simulated Paid):"}
                </td>
                <td className="py-3 px-4 text-right font-mono text-base font-black text-amber-300">
                  {formattedFee}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 5. Authorization Stamps, Signatures & Disclaimer */}
        <div className="pt-4 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Digital Telehealth Transaction</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              {receipt.disclaimer_label ||
                "SIMULATED / DEMO MEDICAL RECEIPT — Strictly for training, demonstration, and research evaluation. No real financial transaction was executed."}
            </p>
            <p className="text-[10px] font-mono text-slate-400">
              Auth Hash: SHA256-SS-RCP-{(receipt.receipt_number || "9001").replace(/-/g, "")}-V2
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end justify-center text-center sm:text-right space-y-1">
            <div className="w-44 border-b border-slate-400 pb-1 text-center font-serif italic text-xs text-slate-700">
              ShasthoSetu Accounts
            </div>
            <div className="text-[11px] font-bold text-slate-900">Central Telehealth Accounts Registry</div>
            <div className="text-[10px] font-mono text-slate-500">Government of Bangladesh Partner Node</div>
          </div>
        </div>

        {/* 6. Footer Disclaimer Bar */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Official Portal: https://shasthosetu.health.gov.bd</span>
          <span>Printed from ShasthoSetu Verified Patient Portal</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
