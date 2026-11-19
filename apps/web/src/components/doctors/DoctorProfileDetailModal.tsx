import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Globe2,
  GraduationCap,
  HeartPulse,
  Languages,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Star,
  Stethoscope,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { formatBdtFromPoisha } from "../../lib/formatters";
import type { RichDoctorCard } from "./DoctorPortraitCard";

interface DoctorProfileDetailModalProps {
  doctor: RichDoctorCard | null;
  locale: Locale;
  onClose: () => void;
  onSelectForBooking?: (doctorId: string) => void;
  onStartCall?: (doc: RichDoctorCard, mode: "VIDEO" | "AUDIO") => void;
}

export function DoctorProfileDetailModal({
  doctor,
  locale,
  onClose,
  onSelectForBooking,
  onStartCall,
}: DoctorProfileDetailModalProps) {
  if (!doctor) return null;

  const avatar = doctor.avatar_url || "/images/doctors/doc-m-01.jpg";
  const rating = doctor.rating ?? 4.9;
  const reviewsCount = doctor.reviews_count ?? 142;
  const patientsCount = doctor.patients_seen ?? 380;
  const expYears = doctor.experience_years ?? 8;
  const followUpFee = doctor.followup_fee_minor_poisha || Math.round(doctor.consultation_fee_minor_poisha * 0.5);

  const symptomList = (doctor.symptom_tags_csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const languagesList = (doctor.languages_csv || "bn,en")
    .split(",")
    .map((l) => (l.trim().toLowerCase() === "bn" ? "বাংলা (Bengali)" : "English (Clinical)"));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doctor-profile-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-3xl border border-cyan-400/40 bg-[#071124] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header Bar with Gradient */}
        <div className="relative px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#0c1f3d] to-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-300">
              {locale === "bn" ? "যাচাইকৃত চিকিৎসকের সম্পূর্ণ প্রোফাইল" : "VERIFIED CLINICIAN PROFILE"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              {doctor.doctor_code || "SS-DOC"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Doctor Profile"
            className="w-9 h-9 rounded-full bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Top Hero Section: Avatar + Name + BMDC + Quick Stats */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative shrink-0">
              <img
                src={avatar}
                alt={doctor.display_name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-cyan-400 shadow-xl"
              />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold whitespace-nowrap inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {doctor.is_online_now ? "ONLINE NOW" : "AVAILABLE"}
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 id="doctor-profile-title" className="text-xl sm:text-2xl font-black text-white">
                  {locale === "bn" && doctor.display_name_bn ? doctor.display_name_bn : doctor.display_name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  {doctor.bmdc_demo_reg || "BMDC-DEMO-44102"}
                </span>
              </div>

              <p className="text-sm font-semibold text-cyan-300 flex items-center justify-center sm:justify-start gap-1.5">
                <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{doctor.degrees}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1 text-sky-300">
                  <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{doctor.specialty}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {doctor.practice_location}, {doctor.district}
                  </span>
                </div>
              </div>

              {/* Badges Bar: Experience + Rating + Patients */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                <div className="inline-flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-400/30 px-2.5 py-1 rounded-xl">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{rating}</span>
                  <span className="text-slate-400">({reviewsCount} reviews)</span>
                </div>

                <div className="inline-flex items-center gap-1 text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{expYears} Years Clinical Exp</span>
                </div>

                <div className="inline-flex items-center gap-1 text-xs font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 px-2.5 py-1 rounded-xl">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{patientsCount}+ Consultations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Follow-up Details Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-cyan-500/20">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  {locale === "bn" ? "নতুন পরামর্শ ফি (অনলাইন/চেম্বার)" : "First Consultation Fee"}
                </span>
                <span className="text-lg font-black font-mono text-amber-300">
                  {formatBdtFromPoisha(doctor.consultation_fee_minor_poisha, locale)}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30">
                20 Min Slot
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  {locale === "bn" ? "ফলো-আপ ফি (১৪ দিনের মধ্যে)" : "Follow-up Fee (Within 14d)"}
                </span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  {formatBdtFromPoisha(followUpFee, locale)}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 font-bold border border-emerald-400/30">
                50% Waiver
              </span>
            </div>
          </div>

          {/* Clinical Bio & Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              {locale === "bn" ? "চিকিৎসকের পরিচিতি ও অভিজ্ঞতা" : "About & Clinical Background"}
            </h3>
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-200 leading-relaxed space-y-2">
              <p>
                {locale === "bn" && doctor.bio_bn
                  ? doctor.bio_bn
                  : doctor.bio ||
                    "Experienced healthcare specialist offering digital consultations, verified e-prescriptions, and continuous patient follow-ups."}
              </p>
              <p className="text-slate-400">
                {locale === "bn"
                  ? "তিনি বাংলাদেশ মেডিকেল অ্যান্ড ডেন্টাল কাউন্সিল (বিএমডিসি) নিবন্ধিত এবং স্বাস্থ্যসেতু ডিজিটাল কেয়ার গ্রিডের অধীনে অনলাইন ভিডিও/অডিও পরামর্শ প্রদান করেন।"
                  : "Registered with Bangladesh Medical & Dental Council (BMDC), adhering strictly to clinical telehealth guidelines with human-verified electronic prescriptions."}
              </p>
            </div>
          </div>

          {/* Clinical Focus / Symptoms */}
          {symptomList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                {locale === "bn" ? "বিশেষজ্ঞ সেবাসমূহ ও লক্ষণ" : "Clinical Focus & Symptom Areas"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {symptomList.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-semibold capitalize"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Spoken Languages */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <Languages className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-300">{locale === "bn" ? "পরামর্শের ভাষা:" : "Languages Spoken:"}</span>
            <span>{languagesList.join(" • ")}</span>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onStartCall && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onStartCall(doctor, "VIDEO");
                    onClose();
                  }}
                  className="min-h-10 px-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  {locale === "bn" ? "ভিডিও কল" : "Video Call"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStartCall(doctor, "AUDIO");
                    onClose();
                  }}
                  className="min-h-10 px-3.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {locale === "bn" ? "অডিও কল" : "Audio Call"}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 px-4 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              {locale === "bn" ? "বন্ধ করুন" : "Close"}
            </button>
            {onSelectForBooking && (
              <button
                type="button"
                onClick={() => {
                  onSelectForBooking(doctor.id);
                  onClose();
                }}
                className="min-h-10 px-5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <CalendarCheck className="w-4 h-4" />
                {locale === "bn" ? "অ্যাপয়েন্টমেন্ট বুক করুন" : "Book Appointment with this Doctor"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
