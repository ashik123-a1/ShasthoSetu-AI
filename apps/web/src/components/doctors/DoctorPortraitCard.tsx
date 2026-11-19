import { CalendarCheck, MapPin, PhoneCall, Star, Stethoscope, Video, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Locale } from "../../lib/i18n";
import { formatBdtFromPoisha } from "../../lib/formatters";
import { LiveConsultationCallStudio } from "../consultations/LiveConsultationCallStudio";

export interface RichDoctorCard {
  id: string;
  display_name: string;
  display_name_bn?: string;
  degrees: string;
  specialty: string;
  bmdc_demo_reg?: string;
  practice_location: string;
  district: string;
  experience_years: number;
  languages_csv?: string;
  symptom_tags_csv?: string;
  consultation_modality?: string;
  is_online_now: number;
  bio?: string;
  bio_bn?: string;
  consultation_fee_minor_poisha: number;
  followup_fee_minor_poisha?: number;
  open_slots_count?: number;
  avatar_url?: string;
  doctor_code?: string;
  rating?: number;
  reviews_count?: number;
  patients_seen?: number;
  avg_wait_minutes?: number;
  joined_date_label?: string;
  instant_hours_label?: string;
  appointment_hours_label?: string;
  workplace_history_json?: string;
}

export const DEPARTMENT_FILTERS = [
  { key: "", label: "All Departments", labelBn: "সকল বিভাগ", badge: "43 Doctors" },
  { key: "Gynecology", label: "Gynae & Obstetrics", labelBn: "স্ত্রীরোগ ও প্রসূতি", badge: "OB-GYN & PCOS" },
  { key: "Pediatrics", label: "Pediatrics", labelBn: "শিশু রোগ", badge: "Child Care" },
  { key: "Dermatology", label: "Dermatology", labelBn: "চর্ম ও এলার্জি", badge: "Skin & Rash" },
  { key: "Cardiology", label: "Cardiology", labelBn: "হৃদরোগ", badge: "Heart & BP" },
  { key: "Internal Medicine", label: "Internal Medicine", labelBn: "মেডিসিন", badge: "Adult Care" },
  { key: "Endocrinology", label: "Endocrinology", labelBn: "হরমোন ও ডায়াবেটিস", badge: "Thyroid / Sugar" },
  { key: "Orthopedics", label: "Orthopedics", labelBn: "অর্থোপেডিক্স", badge: "Bone & Joint" },
  { key: "General Physician", label: "General Physician", labelBn: "জেনারেল ফিজিশিয়ান", badge: "24/7 Primary" },
];

export const SYMPTOM_CHIPS = [
  { label: "Fever / জ্বর", q: "fever" },
  { label: "PCOS / Period", q: "pcos" },
  { label: "Skin Rash / চর্ম", q: "rash" },
  { label: "Child Cough", q: "child" },
  { label: "Chest / BP", q: "heart" },
  { label: "Diabetes / Thyroid", q: "thyroid" },
  { label: "Joint / Back Pain", q: "pain" },
  { label: "Pregnancy Care", q: "pregnancy" },
];

export function DoctorPortraitCard({
  doc,
  locale,
  onStartCall,
}: {
  doc: RichDoctorCard;
  locale: Locale;
  onStartCall: (doc: RichDoctorCard, mode: "VIDEO" | "AUDIO") => void;
}) {
  const avatar = doc.avatar_url || "/images/doctors/doc-m-01.jpg";
  const ratingVal = doc.rating ?? 4.9;
  const reviewsVal = doc.reviews_count ?? 142;

  return (
    <article
      data-testid={`doctor-card-${doc.id}`}
      className="bento-card rounded-3xl p-5 flex flex-col justify-between gap-4 hover:border-cyan-400/60 transition text-slate-100"
    >
      <div className="space-y-3">
        {/* Top Row: Portrait + Name + Online Pill */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <img
              src={avatar}
              alt={doc.display_name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-cyan-400/50 shadow-lg"
            />
            {Boolean(doc.is_online_now) && (
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0b1529] animate-pulse"
                title="Online Now"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                {doc.doctor_code || "SS-DOC"}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  doc.is_online_now
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {doc.is_online_now ? "ONLINE 24/7" : "APPOINTMENT"}
              </span>
            </div>

            <h3 className="font-bold text-base text-white mt-1 truncate">
              {locale === "bn" && doc.display_name_bn ? doc.display_name_bn : doc.display_name}
            </h3>
            <p className="text-xs font-semibold text-cyan-300 truncate">{doc.degrees}</p>
            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-mono mt-1">
              <span className="inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {ratingVal} ({reviewsVal})
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{doc.experience_years} yrs exp</span>
            </div>
          </div>
        </div>

        {/* Specialty Badge & Hospital */}
        <div className="space-y-1 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-medium text-sky-200">
            <Stethoscope className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{doc.specialty}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              {doc.practice_location}, {doc.district}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Fee & Action Buttons */}
      <div className="pt-3 border-t border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-mono font-extrabold text-base text-amber-300">
              {formatBdtFromPoisha(doc.consultation_fee_minor_poisha, locale)}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {doc.open_slots_count ?? 0} {locale === "bn" ? "স্লট খোলা" : "open slots"} •{" "}
              {doc.patients_seen ?? 420} visits
            </div>
          </div>

          <Link
            to={`/doctors/${doc.id}`}
            className="min-h-10 px-3.5 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 hover:opacity-95"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            {locale === "bn" ? "প্রোফাইল ও বুক" : "Profile & Book"}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onStartCall(doc, "VIDEO")}
            className="min-h-9 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" /> Video Call
          </button>
          <button
            type="button"
            onClick={() => onStartCall(doc, "AUDIO")}
            className="min-h-9 px-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Audio Call
          </button>
        </div>
      </div>
    </article>
  );
}

export function DoctorInstantCallModal({
  callTarget,
  onClose,
}: {
  callTarget: { doc: RichDoctorCard; mode: "VIDEO" | "AUDIO" } | null;
  onClose: () => void;
}) {
  if (!callTarget) return null;
  const { doc, mode } = callTarget;
  return (
    <div
      role="dialog"
      aria-label={`Live consultation call with ${doc.display_name}`}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-5xl rounded-3xl border border-cyan-400/40 bg-[#050c1b] p-4 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">
              INSTANT TELEMEDICINE CALL ROOM • {doc.doctor_code || doc.id}
            </span>
            <h2 className="text-lg font-bold text-white">{doc.display_name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close call modal"
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <LiveConsultationCallStudio
          roomId={`instant-${doc.id}`}
          counterpartyName={doc.display_name}
          counterpartyRole={`${doc.specialty} • ${doc.bmdc_demo_reg || "Verified BMDC"}`}
          counterpartyAvatar={doc.avatar_url || "/images/doctors/doc-m-01.jpg"}
          initialMode={mode}
          onEndCall={undefined}
        />
      </div>
    </div>
  );
}
