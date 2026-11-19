import { useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Pause, Play, Stethoscope } from "lucide-react";

export interface HeroDoctorSlide {
  id: string;
  src: string;
  tag: string;
  titleEn: string;
  titleBn: string;
  captionEn: string;
  captionBn: string;
  accent: string;
}

export const HERO_DOCTOR_SLIDES: HeroDoctorSlide[] = [
  {
    id: "back-to-back",
    src: "/images/hero/hero-doctors-back-to-back.jpg",
    tag: "BMDC DEMO TEAM • UNIFIED CARE",
    titleEn: "Specialist Clinicians Standing Back-to-Back for Every Family",
    titleBn: "প্রতিটি পরিবারের পাশে দাঁড়ানো সমন্বিত বিশেষজ্ঞ চিকিৎসক দল",
    captionEn: "Coordinated gynecology, pediatrics, dermatology & safe digital follow-up",
    captionBn: "স্ত্রীরোগ, শিশুরোগ, চর্মরোগ ও নিরাপদ ডিজিটাল প্রেসক্রিপশন সমন্বয়",
    accent: "#38bdf8",
  },
  {
    id: "telemedicine",
    src: "/images/hero/hero-doctors-telemedicine.jpg",
    tag: "MATERNAL & CHILD CARE • TELEMEDICINE",
    titleEn: "Compassionate Family & Pediatric Video Consultations",
    titleBn: "মা ও শিশুর জন্য সহানুভূতিশীল টেলিমেডিসিন পরামর্শ",
    captionEn: "Verified slot reservations with Asia/Dhaka schedule clarity & isolation",
    captionBn: "শিশু-নির্ভরশীল প্রোফাইল ও এশিয়া/ঢাকা সময়সূচী অনুযায়ী নিশ্চিত বুকিং",
    accent: "#2dd4bf",
  },
  {
    id: "ai-lab",
    src: "/images/hero/hero-doctors-ai-lab.jpg",
    tag: "CLINICIAN-REVIEWED AI • NON-DIAGNOSTIC",
    titleEn: "Doctor-in-the-Loop Multimodal Research Diagnostics",
    titleBn: "চিকিৎসক-নিয়ন্ত্রিত মাল্টিমডাল গবেষণা ও ওসিআর বিশ্লেষণ",
    captionEn: "Human verification required before any OCR medicine enters your schedule",
    captionBn: "মানব যাচাই ছাড়া কোনো ওসিআর ওষুধ সময়সূচীতে যুক্ত হয় না",
    accent: "#f2c879",
  },
  {
    id: "care-team",
    src: "/images/hero/hero-doctors-team-care.jpg",
    tag: "8-DIVISION HOSPITAL ATLAS • BANGLADESH",
    titleEn: "Connected Care Network Across All 8 Divisions",
    titleBn: "বাংলাদেশের ৮টি বিভাগে সংযুক্ত স্বাস্থ্যসেবা নেটওয়ার্ক",
    captionEn: "Dhaka, Chattogram, Rajshahi, Sylhet, Khulna, Barishal, Rangpur & Mymensingh",
    captionBn: "ঢাকা, চট্টগ্রাম, রাজশাহী, সিলেট, খুলনা, বরিশাল, রংপুর ও ময়মনসিংহ",
    accent: "#818cf8",
  },
];

export function HeroDoctorShowcase({
  motionPaused,
  locale,
  activeIndex,
  onChangeIndex,
}: {
  motionPaused: boolean;
  locale: "bn" | "en";
  activeIndex?: number;
  onChangeIndex?: (idx: number) => void;
}) {
  const [internalIdx, setInternalIdx] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);

  const slideIdx = activeIndex ?? internalIdx;
  const setSlide = (next: number) => {
    const normalized = (next + HERO_DOCTOR_SLIDES.length) % HERO_DOCTOR_SLIDES.length;
    setInternalIdx(normalized);
    onChangeIndex?.(normalized);
  };

  const isRunning = autoCycle && !motionPaused;

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSlide(slideIdx + 1);
    }, 5200);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, slideIdx]);

  const current = HERO_DOCTOR_SLIDES[slideIdx] ?? HERO_DOCTOR_SLIDES[0];

  return (
    <div
      data-testid="hero-doctor-showcase"
      className="ss-glow-card relative w-full h-[350px] sm:h-[420px] rounded-3xl overflow-hidden border border-sky-400/35 bg-[#040a18] shadow-[0_24px_60px_rgba(2,8,24,0.75)]"
    >
      {/* Crossfading Ken-Burns Clinical Visuals */}
      {HERO_DOCTOR_SLIDES.map((slide, idx) => {
        const active = idx === slideIdx;
        return (
          <img
            key={slide.id}
            src={slide.src}
            alt={locale === "bn" ? slide.titleBn : slide.titleEn}
            className="absolute inset-0 w-full h-full object-cover object-center will-change-transform"
            style={{
              opacity: active ? 1 : 0,
              transform: active && !motionPaused ? "scale(1.06)" : "scale(1)",
              transition: motionPaused
                ? "opacity 0.25s ease"
                : "opacity 0.95s cubic-bezier(0.22, 1, 0.36, 1), transform 5.2s ease-out",
            }}
          />
        );
      })}

      {/* Atmospheric Sapphire Vignette Scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,9,20,0.42) 0%, rgba(4,9,20,0.06) 38%, rgba(4,9,20,0.88) 100%)",
        }}
      />

      {/* Top HUD Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 p-3.5 sm:p-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#040914]/80 border border-sky-400/35 backdrop-blur-md px-3 py-1 font-mono text-[10px] font-bold tracking-[0.14em] text-sky-300 uppercase">
          <Stethoscope className="w-3.5 h-3.5 text-[#2dd4bf]" />
          {current.tag}
        </span>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#040914]/80 border border-white/15 backdrop-blur-md px-2.5 py-1">
          <span className="font-mono text-[10px] font-bold text-white px-1">
            0{slideIdx + 1} / 0{HERO_DOCTOR_SLIDES.length}
          </span>
          <button
            type="button"
            onClick={() => setAutoCycle((a) => !a)}
            aria-label={autoCycle ? "Pause doctor showcase slideshow" : "Play doctor showcase slideshow"}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-sky-400/30 text-sky-200 inline-flex items-center justify-center cursor-pointer transition"
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Bottom Interactive Overlay Strip */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#2dd4bf]">
              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{locale === "bn" ? "স্বাস্থ্যসেতু অনুমোদিত ডেমো প্যানেল" : "Verified Clinical Showcase"}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
              {locale === "bn" ? current.titleBn : current.titleEn}
            </h2>
            <p className="text-xs text-slate-200/85 line-clamp-1">
              {locale === "bn" ? current.captionBn : current.captionEn}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSlide(slideIdx - 1)}
              aria-label="Previous doctor slide"
              className="w-9 h-9 rounded-full bg-[#040914]/80 hover:bg-sky-400 hover:text-slate-950 border border-white/20 text-white inline-flex items-center justify-center cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSlide(slideIdx + 1)}
              aria-label="Next doctor slide"
              className="w-9 h-9 rounded-full bg-[#040914]/80 hover:bg-sky-400 hover:text-slate-950 border border-white/20 text-white inline-flex items-center justify-center cursor-pointer transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Progress Dots */}
        <div className="grid grid-cols-4 gap-1.5">
          {HERO_DOCTOR_SLIDES.map((s, idx) => {
            const active = idx === slideIdx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlide(idx)}
                aria-label={`Show slide ${idx + 1}: ${s.titleEn}`}
                className="group py-1 cursor-pointer text-left"
              >
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    active ? "bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879]" : "bg-white/25 group-hover:bg-white/45"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
