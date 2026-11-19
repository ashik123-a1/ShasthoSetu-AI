import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  CalendarCheck,
  Hospital,
  MapPin,
  Phone,
  Pill,
  Search,
  Stethoscope,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { formatBdtFromPoisha } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { BangladeshCareMap, type MapDoctor, type MapFacility } from "../components/map/BangladeshCareMap";
import { EmptyState, Skeleton } from "../components/ui";

interface FindCareDoctor extends MapDoctor {
  degrees: string;
  experience_years: number;
  practice_location: string;
  languages_csv: string;
  consultation_modality: string;
}

type CareTab = "doctors" | "map" | "facilities";

export function FindCarePage() {
  const { locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as CareTab) || "doctors";
  const [tab, setTab] = useState<CareTab>(
    ["doctors", "map", "facilities"].includes(initialTab) ? initialTab : "doctors"
  );

  const [doctors, setDoctors] = useState<FindCareDoctor[]>([]);
  const [facilities, setFacilities] = useState<MapFacility[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [facType, setFacType] = useState<"ALL" | "HOSPITAL" | "CLINIC" | "DIAGNOSTIC" | "PHARMACY">("ALL");

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (query.trim()) qs.set("q", query.trim());
        if (onlineOnly) qs.set("online_only", "true");
        const [docRes, svcRes] = await Promise.all([
          apiGet<{ doctors: FindCareDoctor[] }>(`/v1/public/doctors?${qs.toString()}`),
          apiGet<{ facilities: MapFacility[] }>("/v1/public/services"),
        ]);
        if (!active) return;
        setDoctors(docRes.doctors || []);
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
  }, [query, onlineOnly]);

  const changeTab = (next: CareTab) => {
    setTab(next);
    setSearchParams({ tab: next });
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

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        {/* Top Hero & Tab Selector */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#38bdf8]">
                FIND CARE • DOCTORS, 8-DIVISION CARE ATLAS &amp; FACILITIES
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {locale === "bn"
                  ? "চিকিৎসক, হাসপাতাল, ক্লিনিক ও ফার্মেসি খুঁজুন"
                  : "Find Verified Demo Doctors, Hospitals & Nearby Care"}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? "বিশেষজ্ঞ ডাক্তার, বাংলাদেশের ৮ বিভাগের ইন্টারেক্টিভ স্বাস্থ্য-মানচিত্র এবং হাসপাতাল, ডায়াগনস্টিক ও ফার্মেসি ডিরেক্টরি একসাথে।"
                  : "Browse BMDC-format verified demo clinicians with atomic appointment locks, explore our 8-division Land-Guard care map, and locate reference hospitals & pharmacies."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["doctors", locale === "bn" ? "ডাক্তার খুঁজুন" : "Doctors Directory"],
                  ["map", locale === "bn" ? "৮-বিভাগ কেয়ার ম্যাপ" : "8-Division Map"],
                  ["facilities", locale === "bn" ? "হাসপাতাল ও ফার্মেসি" : "Hospitals & Pharmacies"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => changeTab(k)}
                  className={`min-h-11 px-4 rounded-full text-xs font-bold transition cursor-pointer ${
                    tab === k
                      ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 shadow"
                      : "bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab !== "map" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
              <div className="md:col-span-7 flex items-center gap-2 rounded-2xl border border-white/15 bg-[#040a18]/80 px-4 min-h-12">
                <Search className="w-4 h-4 text-[#38bdf8] shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    locale === "bn"
                      ? "উপসর্গ, ডাক্তার, জেলা বা হাসপাতালের নাম লিখুন..."
                      : "Filter by specialty, symptom, district, hospital or doctor..."
                  }
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {tab === "doctors" ? (
                <div className="md:col-span-5 flex items-center gap-3">
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
              ) : (
                <div className="md:col-span-5 flex flex-wrap gap-1.5">
                  {(["ALL", "HOSPITAL", "CLINIC", "DIAGNOSTIC", "PHARMACY"] as const).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFacType(ft)}
                      className={`min-h-12 px-3 rounded-xl text-[11px] font-mono font-bold cursor-pointer border transition ${
                        facType === ft
                          ? "bg-[#38bdf8] text-slate-950 border-transparent"
                          : "bg-[#040a18]/80 border-white/15 text-slate-300"
                      }`}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {loading && tab !== "map" ? (
          <Skeleton className="h-64 w-full" />
        ) : tab === "doctors" ? (
          doctors.length === 0 ? (
            <EmptyState
              title={locale === "bn" ? "কোনো অনুমোদিত চিকিৎসক পাওয়া যায়নি" : "No approved demo clinicians matched"}
              description={locale === "bn" ? "ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।" : "Adjust your symptom or specialty query."}
              actionLabel={locale === "bn" ? "সব দেখুন" : "Reset Filter"}
              onAction={() => {
                setQuery("");
                setOnlineOnly(false);
              }}
            />
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doc) => (
                <article
                  key={doc.id}
                  className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-sky-400/60 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-lg text-white">
                          {locale === "bn" && doc.display_name_bn ? doc.display_name_bn : doc.display_name}
                        </h2>
                        <p className="text-xs font-semibold text-sky-300">{doc.degrees}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
                          doc.is_online_now
                            ? "bg-teal-400/20 text-teal-200 border border-teal-400/35"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {doc.is_online_now ? "ONLINE DEMO" : "SCHEDULED"}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-[#38bdf8]" /> {doc.specialty} ({doc.experience_years} yrs)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#2dd4bf]" /> {doc.practice_location}, {doc.district}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-base text-[#f2c879]">
                        {formatBdtFromPoisha(doc.consultation_fee_minor_poisha, locale)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {doc.open_slots_count ?? 0} open slots
                      </div>
                    </div>
                    <Link
                      to={`/doctors/${doc.id}`}
                      className="min-h-11 px-4 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" /> Book Slot
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )
        ) : tab === "map" ? (
          <section className="ss-sapphire-card rounded-3xl p-4 sm:p-6">
            <BangladeshCareMap facilities={facilities} doctors={doctors} />
          </section>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <h2 className="font-bold text-base text-white">{fac.name}</h2>
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
                    onClick={() => changeTab("map")}
                    className="min-h-10 px-3 rounded-full border border-sky-400/35 bg-sky-400/10 text-sky-200 text-[11px] font-semibold cursor-pointer"
                  >
                    Locate on Map
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
          </section>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
