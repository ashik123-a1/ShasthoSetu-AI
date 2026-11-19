import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";

export interface RailSectionItem {
  id: string;
  num: string;
  labelEn: string;
  labelBn: string;
}

const HOME_SECTIONS: RailSectionItem[] = [
  { id: "hero", num: "01", labelEn: "Hero Twin", labelBn: "হিরো টুইন" },
  { id: "pcos-chapter", num: "02", labelEn: "PCOS AI", labelBn: "পিসিওএস এআই" },
  { id: "viral-rash-chapter", num: "03", labelEn: "Viral Rash", labelBn: "ভাইরাল র‍্যাশ" },
  { id: "ocr-chapter", num: "04", labelEn: "Safe OCR", labelBn: "সেফ ওসিআর" },
  { id: "voice-chapter", num: "05", labelEn: "Bangla Voice", labelBn: "বাংলা ভয়েস" },
  { id: "dermoped-chapter", num: "06", labelEn: "DermoPed", labelBn: "ডার্মোপেড" },
  { id: "blood-journal-chapter", num: "07", labelEn: "Blood & Journal", labelBn: "ব্লাড ও জার্নাল" },
  { id: "care-map", num: "08", labelEn: "Care Map", labelBn: "কেয়ার ম্যাপ" },
  { id: "journey", num: "09", labelEn: "Doctors", labelBn: "চিকিৎসক" },
  { id: "care-twin", num: "10", labelEn: "4-Layer Care", labelBn: "৪-স্তর সেবা" },
  { id: "challenge", num: "11", labelEn: "Safety & Data", labelBn: "নিরাপত্তা ও ডেটা" },
  { id: "impact", num: "12", labelEn: "Observatory", labelBn: "পরিসংখ্যান" },
  { id: "preview", num: "13", labelEn: "Services & FAQ", labelBn: "সেবা ও প্রশ্ন" },
  { id: "final-cta", num: "14", labelEn: "Launch", labelBn: "শুরু করুন" },
];

const SERVICES_SECTIONS: RailSectionItem[] = [
  { id: "section-consultations", num: "01", labelEn: "Doctors & Care", labelBn: "চিকিৎসক ও সেবা" },
  { id: "section-ai-tools", num: "02", labelEn: "6 AI Workbenches", labelBn: "৬টি এআই টুল" },
  { id: "section-other-services", num: "03", labelEn: "Care Modules", labelBn: "স্বাস্থ্য মডিউল" },
];

const FIND_CARE_SECTIONS: RailSectionItem[] = [
  { id: "find-doctors", num: "01", labelEn: "Doctors", labelBn: "চিকিৎসক" },
  { id: "care-atlas", num: "02", labelEn: "Care Atlas", labelBn: "কেয়ার অ্যাটলাস" },
  { id: "facilities-dir", num: "03", labelEn: "Facilities", labelBn: "হাসপাতাল ও ফার্মেসি" },
];

const RESEARCH_SECTIONS: RailSectionItem[] = [
  { id: "res-3d-scanner", num: "01", labelEn: "3D Scanner", labelBn: "৩ডি স্ক্যানার" },
  { id: "res-models", num: "02", labelEn: "M01-M06 Models", labelBn: "৬টি মডেল" },
  { id: "res-story", num: "03", labelEn: "Pipelines", labelBn: "পাইপলাইন" },
  { id: "res-graphs", num: "04", labelEn: "Benchmarks", labelBn: "বেঞ্চমার্ক" },
  { id: "res-equations", num: "05", labelEn: "Equations", labelBn: "সূত্র ও অডিট" },
  { id: "res-register", num: "06", labelEn: "SHA Register", labelBn: "রেজিস্টার" },
  { id: "res-quiz", num: "07", labelEn: "Quiz Check", labelBn: "কুইজ যাচাই" },
  { id: "res-sandbox", num: "08", labelEn: "Sandbox", labelBn: "স্যান্ডবক্স" },
];

const BLOOD_CONNECT_SECTIONS: RailSectionItem[] = [
  { id: "bc-requests", num: "01", labelEn: "Find Blood", labelBn: "রক্ত খুঁজুন" },
  { id: "bc-map", num: "02", labelEn: "Radius Map", labelBn: "রেডিয়াস ম্যাপ" },
  { id: "bc-donor", num: "03", labelEn: "Become Donor", labelBn: "রক্তদাতা নিবন্ধন" },
  { id: "bc-tracking", num: "04", labelEn: "Consent & Track", labelBn: "কনসেন্ট ও ট্র্যাক" },
];

/**
 * Global AgriSense-style top scroll-progress bar with route-aware interactive chapter ticks.
 * Mounted globally across ALL pages so every route displays the luminous emerald-cyan-gold scroll rail.
 */
export function HomeSectionRail() {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredSec, setHoveredSec] = useState<(RailSectionItem & { leftPct: number }) | null>(null);

  const sections = useMemo<RailSectionItem[]>(() => {
    if (pathname === "/") return HOME_SECTIONS;
    if (pathname.startsWith("/services")) return SERVICES_SECTIONS;
    if (pathname.startsWith("/find-care")) return FIND_CARE_SECTIONS;
    if (pathname.startsWith("/blood-connect")) return BLOOD_CONNECT_SECTIONS;
    if (pathname === "/research") return RESEARCH_SECTIONS;
    return [];
  }, [pathname]);

  useEffect(() => {
    setHoveredSec(null);
    let rafId = 0;

    const updateScrollState = () => {
      rafId = 0;
      const docEl = document.documentElement;
      const scrollTop = window.scrollY || docEl.scrollTop || 0;
      const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)));

      if (sections.length === 0) {
        setActiveIndex(0);
        return;
      }

      let currentIdx = 0;
      const probeY = scrollTop + window.innerHeight * 0.35;
      for (let i = 0; i < sections.length; i += 1) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= probeY) {
          currentIdx = i;
        }
      }
      setActiveIndex(currentIdx);
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    const settleId = window.setTimeout(updateScrollState, 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.clearTimeout(settleId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [pathname, sections]);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: motionPaused ? "auto" : "smooth", block: "start" });
    }
  };

  return (
    <div
      data-testid="home-section-rail"
      role="navigation"
      aria-label={sections.length > 0 ? "Page Scroll Progress & Chapter Jump Rail" : "Page Scroll Progress"}
      className={`fixed top-0 left-0 right-0 z-[70] pointer-events-none print:hidden ${
        sections.length > 0 ? "h-3" : "h-1"
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#040a16]/75 backdrop-blur-sm overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${Math.max(4, progress)}%`,
            background: "linear-gradient(90deg, #10b981 0%, #2dd4bf 38%, #38bdf8 72%, #f2c879 100%)",
            boxShadow: "0 0 14px rgba(56, 189, 248, 0.85), 0 0 6px rgba(45, 212, 191, 0.75)",
            transition: motionPaused ? "none" : "width 0.08s linear",
          }}
        />
      </div>

      {sections.map((sec, idx) => {
        const leftPct = sections.length > 1 ? (idx / (sections.length - 1)) * 94 + 3 : 50;
        const reached = idx <= activeIndex;
        const hovered = hoveredSec?.id === sec.id;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => jumpTo(sec.id)}
            onMouseEnter={() => setHoveredSec({ ...sec, leftPct })}
            onMouseLeave={() => setHoveredSec(null)}
            onFocus={() => setHoveredSec({ ...sec, leftPct })}
            onBlur={() => setHoveredSec(null)}
            aria-label={`Jump to ${sec.num}: ${locale === "bn" ? sec.labelBn : sec.labelEn}`}
            style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
            className="pointer-events-auto absolute top-0 w-7 h-3 bg-transparent border-0 p-0 cursor-pointer flex justify-center items-start"
          >
            <span
              className="rounded-b transition-all"
              style={{
                width: hovered ? "10px" : reached ? "6px" : "4px",
                height: hovered ? "6px" : "4px",
                background: hovered ? "#f2c879" : reached ? "#ffffff" : "rgba(255,255,255,0.34)",
                boxShadow: hovered ? "0 0 8px rgba(242,200,121,0.9)" : "none",
              }}
            />
          </button>
        );
      })}

      {hoveredSec && (
        <div
          style={{ left: `clamp(80px, ${hoveredSec.leftPct}%, calc(100vw - 110px))`, transform: "translateX(-50%)" }}
          className="fixed top-4 px-2.5 py-1 rounded-full bg-slate-950/95 border border-sky-400/40 text-white text-[11px] font-semibold whitespace-nowrap pointer-events-none shadow-lg"
        >
          <span className="font-mono text-sky-400 mr-1.5">{hoveredSec.num}</span>
          {locale === "bn" ? hoveredSec.labelBn : hoveredSec.labelEn}
        </div>
      )}
    </div>
  );
}
