import { NavLink } from "react-router-dom";
import { Baby, CalendarHeart, Home, Radio, ScanText, Sparkles } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export interface HomeSubTabItem {
  id: string;
  code: string;
  to: string;
  end?: boolean;
  labelEn: string;
  labelBn: string;
  dotColor: string;
  icon: typeof Home;
}

export const HOME_SUB_TABS: HomeSubTabItem[] = [
  {
    id: "overview",
    code: "00",
    to: "/",
    end: true,
    labelEn: "Home Overview",
    labelBn: "হোম সারসংক্ষেপ",
    dotColor: "#38bdf8",
    icon: Home,
  },
  {
    id: "pcos",
    code: "01",
    to: "/features/pcos",
    labelEn: "PCOS & Ultrasound",
    labelBn: "পিসিওএস ও আল্ট্রাসাউন্ড",
    dotColor: "#2dd4bf",
    icon: CalendarHeart,
  },
  {
    id: "viral-rash",
    code: "02",
    to: "/features/viral-rash",
    labelEn: "Viral Rash AI",
    labelBn: "ভাইরাল র‍্যাশ এআই",
    dotColor: "#818cf8",
    icon: Sparkles,
  },
  {
    id: "ocr",
    code: "03",
    to: "/features/prescription-ocr",
    labelEn: "Prescription OCR",
    labelBn: "প্রেসক্রিপশন ওসিআর",
    dotColor: "#f2c879",
    icon: ScanText,
  },
  {
    id: "voice",
    code: "04",
    to: "/features/bangla-voice",
    labelEn: "Bangla Voice AI",
    labelBn: "বাংলা ভয়েস এআই",
    dotColor: "#c084fc",
    icon: Radio,
  },
  {
    id: "dermoped",
    code: "05",
    to: "/features/pediatric-rash",
    labelEn: "DermoPed AI",
    labelBn: "ডার্মোপেড ও শিশু ট্রায়াজ",
    dotColor: "#34d399",
    icon: Baby,
  },
];

/**
 * AgriSense-inspired pill sub-navigation inside the Home tab linking Home Overview
 * cleanly to all 5 dedicated AI & Clinical Care feature pages without altering the 7-tab main navbar.
 */
export function HomeSubTabBar({ className = "" }: { className?: string }) {
  const { locale } = useI18n();

  return (
    <nav
      aria-label={locale === "bn" ? "হোম এআই মডিউল নেভিগেশন" : "Home AI Module Pages"}
      data-testid="home-subtab-bar"
      className={`w-full overflow-x-auto pb-1 ${className}`}
    >
      <div className="ss-glass-capsule inline-flex min-w-max items-center gap-1 rounded-full p-1.5">
        {HOME_SUB_TABS.map((item) => {
          const IconComp = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              data-testid={`home-subtab-${item.id}`}
              className={({ isActive }) =>
                `min-h-11 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold shadow-[0_0_20px_rgba(56,189,248,0.35)]"
                    : "text-slate-200/85 hover:text-white hover:bg-white/10"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? "#041220" : item.dotColor }}
                    aria-hidden="true"
                  />
                  <IconComp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-[10px] opacity-75">{item.code}</span>
                  <span>{locale === "bn" ? item.labelBn : item.labelEn}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
