import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BriefcaseMedical,
  CalendarCheck,
  Clock,
  Film,
  Heart,
  MapPin,
  MessageSquare,
  PhoneCall,
  Search,
  Share2,
  Star,
  Stethoscope,
  Video,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { formatBdtFromPoisha, formatDhakaDateTime } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import {
  DEPARTMENT_FILTERS,
  DoctorInstantCallModal,
  DoctorPortraitCard,
  SYMPTOM_CHIPS,
  type RichDoctorCard,
} from "../components/doctors/DoctorPortraitCard";
import { DepartmentSectorGrid } from "../components/doctors/DepartmentSectorGrid";
import { EmptyState, Skeleton, TrustBadge } from "../components/ui";

interface OpenSlot {
  id: string;
  start_utc: string;
  end_utc: string;
  modality: string;
  capacity: number;
  reserved_count: number;
  state: string;
}

type ProfileTab = "info" | "experience" | "reviews" | "clips";

interface WorkplaceEntry {
  hospital?: string;
  role?: string;
  period?: string;
}

function parseWorkplaceHistory(raw: string | undefined, doc: RichDoctorCard): WorkplaceEntry[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as WorkplaceEntry[];
    } catch {
      // Fallback below
    }
  }
  return [
    {
      hospital: doc.practice_location,
      role: `Consultant • ${doc.specialty}`,
      period: "2020 – Present",
    },
    {
      hospital: `${doc.district} Medical College Teaching Hospital`,
      role: "Registrar / Resident Physician",
      period: "2016 – 2020",
    },
  ];
}

export function PublicDoctorsPage() {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const { locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [specialty, setSpecialty] = useState(searchParams.get("specialty") || "");
  const [showAllDoctors, setShowAllDoctors] = useState(searchParams.get("showAll") === "1");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [doctors, setDoctors] = useState<RichDoctorCard[]>([]);
  const [allDoctors, setAllDoctors] = useState<RichDoctorCard[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<RichDoctorCard | null>(null);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileTab, setProfileTab] = useState<ProfileTab>("info");
  const [liked, setLiked] = useState(false);
  const [callTarget, setCallTarget] = useState<{ doc: RichDoctorCard; mode: "VIDEO" | "AUDIO" } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        if (doctorId) {
          const res = await apiGet<{ doctor: RichDoctorCard; open_slots: OpenSlot[] }>(
            `/v1/public/doctors/${doctorId}`
          );
          if (active) {
            setSelectedDoc(res.doctor);
            setOpenSlots(res.open_slots || []);
          }
        } else {
          const qs = new URLSearchParams();
          if (q.trim()) qs.set("q", q.trim());
          if (specialty.trim()) qs.set("specialty", specialty.trim());
          if (onlineOnly) qs.set("online_only", "true");
          const [res, allRes] = await Promise.all([
            apiGet<{ doctors: RichDoctorCard[] }>(`/v1/public/doctors?${qs.toString()}`),
            apiGet<{ doctors: RichDoctorCard[] }>("/v1/public/doctors"),
          ]);
          if (active) {
            setDoctors(res.doctors || []);
            setAllDoctors(allRes.doctors || []);
          }
        }
      } catch {
        if (active) {
          setDoctors([]);
          setSelectedDoc(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [doctorId, q, specialty, onlineOnly]);

  const handleBookSlot = (slotId: string) => {
    if (!user || user.primary_role !== "PATIENT") {
      navigate(
        `/login?redirect=${encodeURIComponent(`/patient/doctors?doctorId=${selectedDoc?.id}&slotId=${slotId}`)}`
      );
      return;
    }
    navigate(`/patient/doctors?doctorId=${selectedDoc?.id}&slotId=${slotId}`);
  };

  return (
    <div className="ss-sapphire-always relative min-h-screen bg-[#070b16] text-slate-100 pt-24 overflow-x-clip">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-doctors-consult.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-28 space-y-6">
        {doctorId ? (
          loading ? (
            <Skeleton className="h-64 w-full" />
          ) : !selectedDoc ? (
            <EmptyState
              title={locale === "bn" ? "চিকিৎসক খুঁজে পাওয়া যায়নি" : "Approved doctor profile not found"}
              description={locale === "bn" ? "অনুমোদিত চিকিৎসক তালিকায় ফিরে যান।" : "Return to the directory of verified demo clinicians."}
              actionLabel={locale === "bn" ? "ডিরেক্টরিতে ফিরুন" : "Back to Doctors"}
              onAction={() => navigate("/doctors")}
            />
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Top Nav Bar */}
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/doctors"
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 inline-flex items-center min-h-10"
                >
                  ← {locale === "bn" ? "প্রোফাইল • সকল ডাক্তার" : "Profile • All Doctors"}
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLiked((v) => !v)}
                    aria-label="Favorite doctor"
                    className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition ${
                      liked
                        ? "bg-rose-500/20 border-rose-400 text-rose-400"
                        : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-rose-400"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? "fill-rose-400" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        void navigator.clipboard.writeText(window.location.href).catch(() => {});
                      }
                    }}
                    aria-label="Copy profile link"
                    className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:border-cyan-400 flex items-center justify-center cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DocTime Header Profile Card */}
              <section className="bento-card rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <div className="relative shrink-0">
                    <img
                      src={selectedDoc.avatar_url || "/images/doctors/doc-f-01.jpg"}
                      alt={selectedDoc.display_name}
                      className="w-28 h-32 sm:w-32 sm:h-36 rounded-2xl object-cover border-2 border-cyan-400/60 shadow-xl"
                    />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-sky-500 text-slate-950 font-extrabold text-[10px] shadow">
                      {selectedDoc.is_online_now
                        ? locale === "bn"
                          ? "তাৎক্ষণিক কল"
                          : "ONLINE NOW"
                        : locale === "bn"
                          ? "অ্যাপয়েন্টমেন্ট"
                          : "APPOINTMENT"}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                        {locale === "bn" && selectedDoc.display_name_bn
                          ? selectedDoc.display_name_bn
                          : selectedDoc.display_name}
                      </h1>
                      <TrustBadge kind="HUMAN_VERIFIED" />
                    </div>
                    <p className="text-sm text-slate-300 font-medium">{selectedDoc.degrees}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="px-3 py-1 rounded-lg bg-sky-500 text-slate-950 text-xs font-extrabold">
                        {selectedDoc.specialty}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-cyan-300">
                        {selectedDoc.doctor_code || "SS-DOC"}
                      </span>
                    </div>

                    {/* Instant Video & Audio Call Launchers */}
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setCallTarget({ doc: selectedDoc, mode: "VIDEO" })}
                        className="min-h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Video className="w-4 h-4" /> Start Video Call
                      </button>
                      <button
                        type="button"
                        onClick={() => setCallTarget({ doc: selectedDoc, mode: "AUDIO" })}
                        className="min-h-10 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" /> Start Audio Call
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3-Column DocTime Stats Strip (মোট অভিজ্ঞতা | মোট রেটিং | BMDC নম্বর) */}
                <div className="grid grid-cols-3 divide-x divide-slate-800 bg-slate-900/80 border border-slate-800 rounded-2xl py-3.5 px-2 text-center">
                  <div className="px-2">
                    <div className="text-[11px] text-slate-400">
                      {locale === "bn" ? "মোট অভিজ্ঞতা" : "Total Experience"}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                      {selectedDoc.experience_years}+ {locale === "bn" ? "বছর" : "Years"}
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-[11px] text-slate-400">
                      {locale === "bn" ? "মোট রেটিং" : "Rating"}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-amber-300 mt-0.5 inline-flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {selectedDoc.rating ?? 4.9} ({selectedDoc.reviews_count ?? 403})
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-[11px] text-slate-400">
                      {locale === "bn" ? "BMDC নম্বর" : "BMDC Reg"}
                    </div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-cyan-300 mt-0.5">
                      {selectedDoc.bmdc_demo_reg || "94543"}
                    </div>
                  </div>
                </div>

                {/* Workplace Line (কর্মস্থল) */}
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-sm">
                  <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[11px] text-slate-400">
                      {locale === "bn" ? "কর্মস্থল" : "Primary Workplace"}
                    </span>
                    <span className="font-bold text-white">
                      {selectedDoc.practice_location}, {selectedDoc.district}
                    </span>
                  </div>
                </div>

                {/* DocTime 4-Tab Switcher: তথ্য | অভিজ্ঞতা | রিভিউ | ক্লিপস */}
                <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                  {(
                    [
                      ["info", locale === "bn" ? "তথ্য" : "Info"],
                      ["experience", locale === "bn" ? "অভিজ্ঞতা" : "Experience"],
                      ["reviews", locale === "bn" ? "রিভিউ" : "Reviews"],
                      ["clips", locale === "bn" ? "ক্লিপস" : "Clips"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setProfileTab(key)}
                      className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                        profileTab === key
                          ? "bg-white text-slate-950 shadow"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: তথ্য (Info, Hours, 2x3 Metrics Grid, Bio, Open Slots) */}
                {profileTab === "info" && (
                  <div className="space-y-5">
                    {/* Consultation Hours Box */}
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs sm:text-sm">
                      <div>
                        <div className="font-bold text-cyan-300 flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          {locale === "bn" ? "তাৎক্ষণিক পরামর্শের সময়" : "Instant Consultation Hours"}
                        </div>
                        <p className="text-slate-200 mt-1 pl-6">
                          • {selectedDoc.instant_hours_label || "Sat - Wed (8:00 PM - 11:55 PM)"}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-800">
                        <div className="font-bold text-emerald-300 flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4" />
                          {locale === "bn" ? "অ্যাপয়েন্টমেন্ট পরামর্শের সময়" : "Scheduled Appointment Hours"}
                        </div>
                        <p className="text-slate-200 mt-1 pl-6">
                          • {selectedDoc.appointment_hours_label || "Sat - Fri (12:00 PM - 11:00 PM)"}
                        </p>
                      </div>
                    </div>

                    {/* 2x3 Metrics Grid (Fees, Patients Seen, Joined Date, Code, Avg Wait) */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm">
                      <div>
                        <div className="text-slate-400 text-xs">
                          {locale === "bn" ? "কনসালটেশন ফি (ভ্যাট সহ)" : "Consultation Fee"}
                        </div>
                        <div className="font-extrabold text-base text-amber-300 font-mono mt-0.5">
                          {formatBdtFromPoisha(selectedDoc.consultation_fee_minor_poisha, locale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">
                          {locale === "bn" ? "ফলো-আপ ফি (১৪-৩০ দিনের মধ্যে)" : "Follow-up Fee"}
                        </div>
                        <div className="font-extrabold text-base text-emerald-300 font-mono mt-0.5">
                          {formatBdtFromPoisha(
                            selectedDoc.followup_fee_minor_poisha ||
                              Math.round(selectedDoc.consultation_fee_minor_poisha * 0.65),
                            locale
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">
                          {locale === "bn" ? "রোগী দেখেছেন" : "Patients Seen"}
                        </div>
                        <div className="font-bold text-white mt-0.5">
                          {selectedDoc.patients_seen ?? 1574}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">
                          {locale === "bn" ? "যোগদান করেছেন" : "Joined ShasthoSetu"}
                        </div>
                        <div className="font-bold text-white mt-0.5">
                          {selectedDoc.joined_date_label || "June 02, 2022"}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">
                          {locale === "bn" ? "ডাক্তার কোড" : "Doctor Code"}
                        </div>
                        <div className="font-bold font-mono text-cyan-300 mt-0.5">
                          {selectedDoc.doctor_code || "DT7041"}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">
                          {locale === "bn" ? "গড় অপেক্ষার সময়" : "Average Wait Time"}
                        </div>
                        <div className="font-bold text-white mt-0.5">
                          {selectedDoc.avg_wait_minutes ?? 15} {locale === "bn" ? "মিনিট" : "minutes"}
                        </div>
                      </div>
                    </div>

                    {/* About Doctor */}
                    <div className="space-y-1.5">
                      <h2 className="text-sm font-bold text-cyan-300">
                        {locale === "bn" ? "ডাক্তার সম্পর্কে" : "About Doctor"}
                      </h2>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {locale === "bn" && selectedDoc.bio_bn ? selectedDoc.bio_bn : selectedDoc.bio}
                      </p>
                    </div>

                    {/* Open Bookable Time Slots */}
                    <div id="doctor-slots-section" className="pt-4 border-t border-slate-800 space-y-3">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-cyan-400" />
                        {locale === "bn" ? "উপলব্ধ সময়সূচী (Asia/Dhaka)" : "Available Time Slots (Asia/Dhaka)"}
                      </h2>
                      {openSlots.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          {locale === "bn" ? "বর্তমানে কোনো খালি স্লট নেই।" : "No open slots available right now."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {openSlots.map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => handleBookSlot(slot.id)}
                              data-testid={`book-slot-${slot.id}`}
                              className="min-h-14 p-3.5 rounded-2xl border border-slate-700 bg-slate-900/90 hover:border-cyan-400 hover:bg-cyan-500/10 text-left transition flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  {formatDhakaDateTime(slot.start_utc, locale)}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-cyan-400" /> {slot.modality}
                                </div>
                              </div>
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-400 text-slate-950">
                                {locale === "bn" ? "বুক" : "Book"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: অভিজ্ঞতা */}
                {profileTab === "experience" && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                      <BriefcaseMedical className="w-4 h-4" /> Clinical Career &amp; Hospital Tenure
                    </h2>
                    {parseWorkplaceHistory(selectedDoc.workplace_history_json, selectedDoc).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-white text-sm">{item.hospital || selectedDoc.practice_location}</div>
                          <div className="text-xs text-cyan-300">{item.role || selectedDoc.specialty}</div>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{item.period || "Active"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: রিভিউ */}
                {profileTab === "reviews" && (
                  <div className="space-y-3">
                    {[
                      { name: "Nusrat J.", rating: 5, text: "Clear guidance in Bangla and followed up properly on lab reports." },
                      { name: "Mahmud H.", rating: 5, text: "Video call started on time and explained medicine timings thoroughly." },
                      { name: "Farzana A.", rating: 5, text: "Compassionate specialist with structured e-prescription summary." },
                    ].map((rev) => (
                      <div key={rev.name} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white inline-flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> {rev.name} (Synthetic Review)
                          </span>
                          <span className="text-amber-300 font-mono">★★★★★ {rev.rating}.0</span>
                        </div>
                        <p className="text-xs text-slate-300">{rev.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 4: ক্লিপস */}
                {profileTab === "clips" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      `Understanding ${selectedDoc.specialty} red flags before your online visit`,
                      "How to prepare prior prescriptions & labs for Video Consultation",
                    ].map((clipTitle, idx) => (
                      <div key={clipTitle} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <div className="aspect-video rounded-xl bg-gradient-to-br from-cyan-950 to-slate-950 border border-cyan-500/30 flex items-center justify-center">
                          <Film className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div className="text-xs font-bold text-white">Clip #{idx + 1}: {clipTitle}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sticky Bottom CTA Bar (DocTime signature bottom bar) */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl z-30 rounded-2xl border border-cyan-400/40 bg-[#081229]/95 backdrop-blur-xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-400">
                    {locale === "bn" ? "কনসালটেশন ফি" : "Consultation Fee"}
                  </div>
                  <div className="text-lg font-black font-mono text-cyan-300">
                    {formatBdtFromPoisha(selectedDoc.consultation_fee_minor_poisha, locale)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (openSlots[0]) {
                      handleBookSlot(openSlots[0].id);
                    } else {
                      document.getElementById("doctor-slots-section")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="min-h-11 px-6 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-extrabold text-sm inline-flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  {locale === "bn" ? "অ্যাপয়েন্টমেন্ট বুক করুন" : "Book Appointment"}
                </button>
              </div>
            </div>
          )
        ) : (
          <>
            {/* Directory Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
                  <Stethoscope className="w-7 h-7 text-cyan-400" />
                  {locale === "bn" ? "৪৩ জন যাচাইকৃত চিকিৎসক খুঁজুন" : "Find Approved Demo Doctors (43 Specialists)"}
                </h1>
                <p className="text-sm text-slate-300 mt-1">
                  {locale === "bn"
                    ? "৮টি বিভাগে বিশেষজ্ঞ ডাক্তার, প্রোফাইল ও লাইভ ভিডিও/অডিও কনসাল্টেশন"
                    : "Filter Admin-verified clinicians across 8 departments by specialty, doctor code, symptom, or online status."}
                </p>
              </div>
              <Link
                to="/doctor-apply"
                className="min-h-11 px-4 rounded-xl border border-cyan-500/40 bg-slate-900/90 hover:bg-slate-800 text-cyan-200 text-sm font-semibold inline-flex items-center"
              >
                {locale === "bn" ? "ডাক্তার হিসেবে আবেদন করুন" : "Apply as a Doctor"}
              </Link>
            </div>

            {/* Sector Icon Grid (DocTime-matched Department Icons) */}
            <DepartmentSectorGrid
              doctors={allDoctors.length > 0 ? allDoctors : doctors}
              selectedKey={specialty}
              locale={locale}
              showingAll={showAllDoctors}
              onSelectSector={(key) => {
                setSpecialty(key);
                setShowAllDoctors(true);
              }}
              onToggleShowAll={() => {
                if (showAllDoctors || specialty) {
                  setSpecialty("");
                  setQ("");
                  setOnlineOnly(false);
                  setShowAllDoctors(false);
                } else {
                  setShowAllDoctors(true);
                }
              }}
            />

            {/* Search & Online Filter Row */}
            <div className="bento-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 min-h-11">
                <Search className="w-4 h-4 text-cyan-400" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={locale === "bn" ? "নাম, কোড বা উপসর্গ (pcos, SS7001, fever)..." : "Name, doctor code, or symptom (pcos, SS7001, fever)..."}
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  data-testid="doctors-search-input"
                />
              </div>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                aria-label="Specialty Filter"
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"
              >
                {DEPARTMENT_FILTERS.map((d) => (
                  <option key={d.key || "all"} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
              <label className="min-h-11 px-3 rounded-xl border border-slate-700 bg-slate-900 flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
                <span>{locale === "bn" ? "এখন অনলাইনে আছেন" : "Online Now Only"}</span>
              </label>
            </div>

            {/* Symptom Chips */}
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_CHIPS.map((c) => (
                <button
                  key={c.q}
                  type="button"
                  onClick={() => setQ(c.q)}
                  className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 cursor-pointer"
                >
                  {c.label}
                </button>
              ))}
            </div>

            {!specialty && !q.trim() && !onlineOnly && !showAllDoctors ? (
              <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 border-cyan-500/25">
                <div className="text-xs sm:text-sm text-slate-300">
                  {locale === "bn"
                    ? "উপরে যেকোনো ডিপার্টমেন্ট আইকনে ক্লিক করলে ওই বিভাগের সকল ডাক্তার দেখাবে।"
                    : "Choose any clinical department card or symptom chip above to reveal specialists."}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllDoctors(true)}
                  className="min-h-10 px-4 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {locale === "bn" ? "সব ৪৩ জন ডাক্তার দেখুন" : "View All 43 Doctors →"}
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            ) : doctors.length === 0 ? (
              <EmptyState
                title={locale === "bn" ? "কোনো চিকিৎসক পাওয়া যায়নি" : "No matching approved doctors"}
                description={locale === "bn" ? "অনুসন্ধান শর্ত পরিবর্তন করে আবার চেষ্টা করুন।" : "Adjust your search or specialty filter."}
                actionLabel={locale === "bn" ? "রিসেট করুন" : "Reset Filters"}
                onAction={() => {
                  setQ("");
                  setSpecialty("");
                  setOnlineOnly(false);
                  setShowAllDoctors(false);
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSpecialty("");
                      setQ("");
                      setOnlineOnly(false);
                      setShowAllDoctors(false);
                    }}
                    className="text-xs font-bold text-cyan-300 hover:underline cursor-pointer"
                  >
                    ← {locale === "bn" ? "সকল ডিপার্টমেন্টে ফিরুন" : "Back to Department Sectors"}
                  </button>
                  <span className="text-xs font-mono text-slate-400">{doctors.length} clinicians displayed</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {doctors.map((doc) => (
                    <DoctorPortraitCard
                      key={doc.id}
                      doc={doc}
                      locale={locale}
                      onStartCall={(d, mode) => setCallTarget({ doc: d, mode })}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <DoctorInstantCallModal callTarget={callTarget} onClose={() => setCallTarget(null)} />
      <PublicFooter />
    </div>
  );
}
