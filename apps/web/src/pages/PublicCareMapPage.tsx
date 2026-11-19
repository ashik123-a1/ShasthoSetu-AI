import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, FileText, MapPin, ShieldCheck } from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { BangladeshCareMap, type MapDoctor, type MapFacility } from "../components/map/BangladeshCareMap";

export function PublicCareMapPage() {
  const { locale } = useI18n();
  const [facilities, setFacilities] = useState<MapFacility[]>([]);
  const [doctors, setDoctors] = useState<MapDoctor[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [srv, docs] = await Promise.all([
          apiGet<{ facilities: MapFacility[] }>("/v1/public/services"),
          apiGet<{ doctors: MapDoctor[] }>("/v1/public/doctors"),
        ]);
        if (!active) return;
        setFacilities(srv.facilities || []);
        setDoctors(docs.doctors || []);
      } catch {
        // Resilient load
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip" data-testid="care-map-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/dhaka-aerial-map-bg.jpg" opacity={0.22} />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-sky-300">
              <Compass className="w-4 h-4" /> UJ-05 &amp; FR-FIND-01..04 • NATIONAL CARE NAVIGATION
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {locale === "bn" ? (
                <>
                  বাংলাদেশ{" "}
                  <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                    স্বাস্থ্যসেবা ও হাসপাতাল অ্যাটলাস
                  </span>
                </>
              ) : (
                <>
                  Interactive Bangladesh{" "}
                  <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                    Hospital &amp; Care Finder Map
                  </span>
                </>
              )}
            </h1>
          </div>

          <Link
            to="/doctors"
            className="min-h-11 px-5 rounded-full border border-sky-400/35 bg-sky-400/15 hover:bg-sky-400/25 text-sky-200 text-xs font-semibold inline-flex items-center gap-2"
          >
            {locale === "bn" ? "অনুমোদিত চিকিৎসক ডিরেক্টরি" : "Approved Doctor Directory"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <BangladeshCareMap facilities={facilities} doctors={doctors} />

        {/* Privacy-Controlled Referral Note & Transparency Bar */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="ss-sapphire-card rounded-2xl p-5 space-y-2">
            <div className="font-mono text-xs font-bold text-[#2dd4bf] flex items-center gap-2">
              <MapPin className="w-4 h-4" /> PROVENANCE &amp; DISTANCE TRANSPARENCY
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every marker uses real Bangladesh regional coordinates from SQLite `facilities` across all 8 divisions (Dhaka, Chattogram, Rajshahi, Sylhet, Khulna, Barishal, Rangpur, Mymensingh) with Haversine distance computed locally on-device—never leaking your GPS location to third parties.
            </p>
          </div>
          <div className="ss-sapphire-card rounded-2xl p-5 space-y-2">
            <div className="font-mono text-xs font-bold text-[#f2c879] flex items-center gap-2">
              <FileText className="w-4 h-4" /> PRIVACY-CONTROLLED CLINICAL REFERRAL (UJ-05)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ready to visit a clinician or tertiary hospital? Prepare a non-diagnostic symptom/cycle summary in the{" "}
              <Link to="/features/pcos" className="text-sky-300 underline">
                PCOS Care Studio
              </Link>{" "}
              or{" "}
              <Link to="/features/pediatric-rash" className="text-sky-300 underline">
                Pediatric Triage Workbench
              </Link>{" "}
              before opening directions.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-teal-300 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Zero fabricated ER beds or live waiting-room counts
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
