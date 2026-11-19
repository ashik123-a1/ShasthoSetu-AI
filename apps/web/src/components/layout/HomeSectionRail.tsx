import { useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";

export interface RailSectionItem {
  id: string;
  num: string;
  labelEn: string;
  labelBn: string;
}

const HOME_SECTIONS: RailSectionItem[] = [
  { id: "hero", num: "01", labelEn: "Care Twin Hero", labelBn: "হিরো টুইন" },
  { id: "core-modules", num: "02", labelEn: "Core Features", labelBn: "মূল ফিচার" },
  { id: "care-map", num: "03", labelEn: "Care Map", labelBn: "কেয়ার ম্যাপ" },
  { id: "journey", num: "04", labelEn: "Doctors", labelBn: "চিকিৎসক" },
  { id: "care-twin", num: "05", labelEn: "4-Layer Care", labelBn: "৪-স্তর সেবা" },
  { id: "challenge", num: "06", labelEn: "Safety & Science", labelBn: "নিরাপত্তা ও এআই" },
  { id: "impact", num: "07", labelEn: "Metrics", labelBn: "পরিসংখ্যান" },
  { id: "preview", num: "08", labelEn: "Services & FAQ", labelBn: "সেবা ও প্রশ্ন" },
  { id: "final-cta", num: "09", labelEn: "Launch", labelBn: "শুরু করুন" },
];

/** Fixed top-edge scroll progress & chapter jump bar modeled cleanly after AgriSense Fusion HomeSectionRail. */
export function HomeSectionRail() {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredSec, setHoveredSec] = useState<(RailSectionItem & { leftPct: number }) | null>(null);

  useEffect(() => {
    let rafId = 0;
    const updateScrollState = () => {
      rafId = 0;
      const docEl = document.documentElement;
      const scrollTop = window.scrollY || docEl.scrollTop || 0;
      const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)));

      let currentIdx = 0;
      const probeY = scrollTop + window.innerHeight * 0.35;
      for (let i = 0; i < HOME_SECTIONS.length; i += 1) {
        const el = document.getElementById(HOME_SECTIONS[i].id);
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
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

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
      aria-label="Homepage Section Progress & Jump Rail"
      className="fixed top-0 left-0 right-0 z-50 h-3 print:hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-950/60 backdrop-blur-sm overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${Math.max(3, progress)}%`,
            background: "linear-gradient(90deg, #38bdf8 0%, #2dd4bf 55%, #f2c879 100%)",
            boxShadow: "0 0 12px rgba(56, 189, 248, 0.8)",
            transition: motionPaused ? "none" : "width 0.08s linear",
          }}
        />
      </div>

      {HOME_SECTIONS.map((sec, idx) => {
        const leftPct = (idx / (HOME_SECTIONS.length - 1)) * 94 + 3;
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
            className="absolute top-0 w-7 h-3 bg-transparent border-0 p-0 cursor-pointer flex justify-center items-start"
          >
            <span
              className="rounded-b transition-all"
              style={{
                width: hovered ? "10px" : reached ? "6px" : "4px",
                height: hovered ? "6px" : "4px",
                background: hovered ? "#f2c879" : reached ? "#ffffff" : "rgba(255,255,255,0.32)",
                boxShadow: hovered ? "0 0 8px rgba(242,200,121,0.9)" : "none",
              }}
            />
          </button>
        );
      })}

      {hoveredSec && (
        <div
          style={{ left: `clamp(80px, ${hoveredSec.leftPct}%, calc(100vw - 110px))`, transform: "translateX(-50%)" }}
          className="fixed top-3.5 px-2.5 py-1 rounded-full bg-slate-950/95 border border-sky-400/40 text-white text-[11px] font-semibold whitespace-nowrap pointer-events-none shadow-lg"
        >
          <span className="font-mono text-sky-400 mr-1.5">{hoveredSec.num}</span>
          {locale === "bn" ? hoveredSec.labelBn : hoveredSec.labelEn}
        </div>
      )}
    </div>
  );
}
