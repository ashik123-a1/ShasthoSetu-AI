import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  Compass,
  Hospital,
  Phone,
  Pill,
  Search,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { BangladeshCareMap, type MapDoctor, type MapFacility } from "../components/map/BangladeshCareMap";
import {
  DoctorInstantCallModal,
  DoctorPortraitCard,
  SYMPTOM_CHIPS,
  type RichDoctorCard,
} from "../components/doctors/DoctorPortraitCard";
import { DepartmentSectorGrid } from "../components/doctors/DepartmentSectorGrid";
import { EmptyState, Skeleton } from "../components/ui";

interface FindCareDoctor extends MapDoctor, Omit<RichDoctorCard, "open_slots_count"> {
  degrees: string;
  experience_years: number;
  practice_location: string;
  languages_csv: string;
  consultation_modality: string;
}

type JumpTarget = "doctors" | "map" | "facilities";

const SECTION_DOM_IDS: Record<JumpTarget, string> = {
  doctors: "find-doctors",
  map: "care-atlas",
  facilities: "facilities-dir",
};

function scrollToSection(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function FindCarePage() {
  const { locale } = useI18n();
  const [searchParams] = useSearchParams();
  const initialParam = searchParams.get("tab") as JumpTarget | null;
  const [activeJump, setActiveJump] = useState<JumpTarget>(
    initialParam && SECTION_DOM_IDS[initialParam] ? initialParam : "doctors"
  );

  const [doctors, setDoctors] = useState<FindCareDoctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<FindCareDoctor[]>([]);
  const [facilities, setFacilities] = useState<MapFacility[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedDept, setSelectedDept] = useState(searchParams.get("specialty") || "");
  const [showAllDoctors, setShowAllDoctors] = useState(searchParams.get("showAll") === "1");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [facType, setFacType] = useState<"ALL" | "HOSPITAL" | "CLINIC" | "DIAGNOSTIC" | "PHARMACY">("ALL");
  const [callTarget, setCallTarget] = useState<{ doc: RichDoctorCard; mode: "VIDEO" | "AUDIO" } | null>(null);

  useEffect(() => {
    const tParam = searchParams.get("tab") as JumpTarget | null;
    if (tParam && SECTION_DOM_IDS[tParam]) {
      setActiveJump(tParam);
      const timer = window.setTimeout(() => scrollToSection(SECTION_DOM_IDS[tParam]), 180);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (query.trim()) qs.set("q", query.trim());
        if (selectedDept) qs.set("specialty", selectedDept);
        if (onlineOnly) qs.set("online_only", "true");
        const [docRes, allDocRes, svcRes] = await Promise.all([
          apiGet<{ doctors: FindCareDoctor[] }>(`/v1/public/doctors?${qs.toString()}`),
          apiGet<{ doctors: FindCareDoctor[] }>("/v1/public/doctors"),
          apiGet<{ facilities: MapFacility[] }>("/v1/public/services"),
        ]);
        if (!active) return;
        setDoctors(docRes.doctors || []);
        setAllDoctors(allDocRes.doctors || []);
        setFacilities(svcRes.facilities || []);
      } catch {
        if (active) {
          setDoctors([]);
          setFacilities([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query, selectedDept, onlineOnly]);

  const handleJump = (target: JumpTarget) => {
    setActiveJump(target);
    scrollToSection(SECTION_DOM_IDS[target]);
  };

  const filteredFacilities = facilities.filter((f) => {
    const typeOk = facType === "ALL" || f.facility_type === facType;
    const textOk =
      !query.trim() ||
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.district.toLowerCase().includes(query.toLowerCase()) ||
      f.address.toLowerCase().includes(query.toLowerCase());
    return typeOk && textOk;
  });

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="find-care-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-doctors-consult.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-12 flex-1">
        {/* Top Hero + Smooth-Scroll Quick-Jump Anchor Bar */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#38bdf8]">
                FIND CARE • DOCTORS, 8-DIVISION CARE ATLAS &amp; FACILITIES (SCROLL DOWN)
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {locale === "bn"
                  ? "চিকিৎসক, ৮-বিভাগ মানচিত্র, হাসপাতাল ও ফার্মেসি"
                  : "Find Verified Demo Doctors, 8-Division Atlas & Nearby Care"}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? "কোনো লুকানো ট্যাব নয়—নিচে স্ক্রল করলেই পাচ্ছেন বিশেষজ্ঞ ডাক্তার তালিকা, বাংলাদেশের ৮ বিভাগের লাইভ স্বাস্থ্য-মানচিত্র এবং হাসপাতাল ও ফার্মেসি ডিরেক্টরি।"
                  : "Scroll down seamlessly through all three care layers: verified clinicians with live slot booking, the 8-division Bangladesh interactive Care Atlas map, and reference hospitals & pharmacies."}
              </p>
            </div>

            {/* Smooth-Scroll Section Jump Pills (No Hiding!) */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["doctors", locale === "bn" ? "০১. ডাক্তার তালিকা ↓" : "01. Doctors Directory ↓"],
                  ["map", locale === "bn" ? "০২. ৮-বিভাগ ম্যাপ ↓" : "02. 8-Division Map ↓"],
                  ["facilities", locale === "bn" ? "০৩. হাসপাতাল ও ফার্মেসি ↓" : "03. Hospitals & Pharmacies ↓"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleJump(k)}
                  className={`min-h-11 px-4 rounded-full text-xs font-bold transition cursor-pointer ${
                    activeJump === k
                      ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 shadow"
                      : "bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Unified Global Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-7 flex items-center gap-2 rounded-2xl border border-white/15 bg-[#040a18]/80 px-4 min-h-12">
              <Search className="w-4 h-4 text-[#38bdf8] shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  locale === "bn"
                    ? "উপসর্গ, ডাক্তার, জেলা বা হাসপাতালের নাম লিখুন (সকল সেকশনে ফিল্টার হবে)..."
                    : "Filter doctors & facilities by specialty, symptom, district, hospital..."
                }
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="md:col-span-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setOnlineOnly((v) => !v)}
                className={`min-h-12 px-4 rounded-2xl border text-xs font-semibold cursor-pointer transition ${
                  onlineOnly
                    ? "bg-teal-400/20 border-teal-400 text-teal-200"
                    : "bg-[#040a18]/80 border-white/15 text-slate-300"
                }`}
              >
                {onlineOnly ? "✓ Online Now Only" : "Show Online Now"}
              </button>
              <Link
                to="/doctors"
                className="min-h-12 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                Full Slot Directory →
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 01: VERIFIED DEMO DOCTORS DIRECTORY */}
        <section id="find-doctors" className="scroll-mt-28 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#38bdf8]">
                01 • APPROVED CLINICIANS (43 DOCTORS • 8 DEPARTMENTS) &amp; LIVE CALLS
              </span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5">
                <Stethoscope className="w-5 h-5 text-[#38bdf8]" />
                {locale === "bn" ? "যাচাইকৃত ডাক্তারদের তালিকা" : "Verified Demo Doctors Directory"}
              </h2>
            </div>
            <span className="font-mono text-xs text-cyan-300">{doctors.length} clinicians matched</span>
          </div>

          {/* 8 Clinical Department Sector Cards (Click a Sector or View All to Reveal Doctor Profiles) */}
          <DepartmentSectorGrid
            doctors={allDoctors}
            selectedKey={selectedDept}
            locale={locale}
            showingAll={showAllDoctors}
            onSelectSector={(key) => {
              setSelectedDept(key);
              setShowAllDoctors(true);
            }}
            onToggleShowAll={() => {
              if (showAllDoctors || selectedDept) {
                setSelectedDept("");
                setQuery("");
                setOnlineOnly(false);
                setShowAllDoctors(false);
              } else {
                setShowAllDoctors(true);
              }
            }}
          />

          {/* 8 Symptom Quick-Select Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Quick Symptoms:
            </span>
            {SYMPTOM_CHIPS.map((chip) => (
              <button
                key={chip.q}
                type="button"
                onClick={() => setQuery(chip.q)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                  query.toLowerCase() === chip.q
                    ? "bg-amber-400 text-slate-950 border-amber-300 font-bold"
                    : "bg-slate-900/90 border-slate-700 text-slate-300 hover:border-cyan-400/50"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {!selectedDept && !query.trim() && !onlineOnly && !showAllDoctors ? (
            <div className="bento-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 border-cyan-500/25">
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white">
                  {locale === "bn"
                    ? "উপরে যেকোনো ডিপার্টমেন্ট বা উপসর্গে ক্লিক করে বিশেষজ্ঞ ডাক্তার দেখুন"
                    : "Select any department card or symptom above to explore specialist profiles"}
                </div>
                <p className="text-xs text-slate-400">
                  {allDoctors.length || 43} verified demo doctors ready with instant Video/Audio consultation rooms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllDoctors(true)}
                className="min-h-10 px-4 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs cursor-pointer"
              >
                {locale === "bn" ? "সব ডাক্তার দেখুন (৪৩ জন)" : `Browse All ${allDoctors.length || 43} Doctors →`}
              </button>
            </div>
          ) : loading ? (
            <Skeleton className="h-56 w-full" />
          ) : doctors.length === 0 ? (
            <EmptyState
              title={locale === "bn" ? "কোনো অনুমোদিত চিকিৎসক পাওয়া যায়নি" : "No approved demo clinicians matched"}
              description={locale === "bn" ? "ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।" : "Adjust your symptom or specialty query."}
              actionLabel={locale === "bn" ? "সব দেখুন" : "Reset Filter"}
              onAction={() => {
                setQuery("");
                setSelectedDept("");
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
                    setSelectedDept("");
                    setQuery("");
                    setOnlineOnly(false);
                    setShowAllDoctors(false);
                  }}
                  className="text-xs font-bold text-cyan-300 hover:underline cursor-pointer"
                >
                  ← {locale === "bn" ? "সকল ডিপার্টমেন্টে ফিরুন" : "Back to Department Grid"}
                </button>
                <span className="text-xs font-mono text-slate-400">Showing {doctors.length} specialist(s)</span>
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
        </section>

        <DoctorInstantCallModal callTarget={callTarget} onClose={() => setCallTarget(null)} />

        {/* SECTION 02: INTERACTIVE 8-DIVISION BANGLADESH CARE ATLAS MAP */}
        <section id="care-atlas" className="scroll-mt-28 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf]">
                02 • LAND-GUARD GEOJSON + LEAFLET 8-DIVISION HEALTH ATLAS
              </span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5">
                <Compass className="w-5 h-5 text-[#2dd4bf]" />
                {locale === "bn" ? "বাংলাদেশ ৮-বিভাগ ইন্টারেক্টিভ কেয়ার ম্যাপ" : "Interactive 8-Division Care Atlas Map"}
              </h2>
            </div>
            <Link to="/blood-connect" className="text-xs font-mono font-bold text-rose-300 hover:underline">
              Open 5/10/20 km Blood Donor Map →
            </Link>
          </div>

          <div className="ss-sapphire-card rounded-3xl p-4 sm:p-6">
            <BangladeshCareMap facilities={facilities} doctors={doctors} />
          </div>
        </section>

        {/* SECTION 03: HOSPITALS, CLINICS, DIAGNOSTICS & PHARMACIES DIRECTORY */}
        <section id="facilities-dir" className="scroll-mt-28 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#f2c879]">
                03 • HOSPITALS, DIAGNOSTIC LABS &amp; PHARMACIES
              </span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5">
                <Hospital className="w-5 h-5 text-[#f2c879]" />
                {locale === "bn" ? "হাসপাতাল, ক্লিনিক ও ফার্মেসি ডিরেক্টরি" : "Reference Hospitals, Clinics & Pharmacies"}
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["ALL", "HOSPITAL", "CLINIC", "DIAGNOSTIC", "PHARMACY"] as const).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFacType(ft)}
                  className={`min-h-10 px-3.5 rounded-xl text-[11px] font-mono font-bold cursor-pointer border transition ${
                    facType === ft
                      ? "bg-[#38bdf8] text-slate-950 border-transparent"
                      : "bg-[#040a18]/80 border-white/15 text-slate-300 hover:border-sky-400/50"
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFacilities.map((fac) => (
                <article
                  key={fac.id}
                  className="ss-sapphire-card rounded-3xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-sky-300">
                      {fac.facility_type === "PHARMACY" ? (
                        <Pill className="w-3.5 h-3.5 text-[#f2c879]" />
                      ) : fac.facility_type === "HOSPITAL" ? (
                        <Hospital className="w-3.5 h-3.5 text-[#38bdf8]" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-[#2dd4bf]" />
                      )}
                      {fac.facility_type} • {fac.district}
                    </div>
                    <h3 className="font-bold text-base text-white">{fac.name}</h3>
                    <p className="text-xs text-slate-300">{fac.address}</p>
                    {fac.phone && (
                      <p className="text-[11px] font-mono text-slate-400 inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {fac.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleJump("map")}
                      className="min-h-10 px-3 rounded-full border border-sky-400/35 bg-sky-400/10 text-sky-200 text-[11px] font-semibold cursor-pointer hover:bg-sky-400/20"
                    >
                      Locate on Map ↑
                    </button>
                    {fac.facility_type === "HOSPITAL" && (
                      <Link
                        to="/blood-connect"
                        className="min-h-10 px-3 rounded-full border border-rose-400/35 bg-rose-500/15 text-rose-200 text-[11px] font-semibold inline-flex items-center justify-center"
                      >
                        Blood Connect
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
