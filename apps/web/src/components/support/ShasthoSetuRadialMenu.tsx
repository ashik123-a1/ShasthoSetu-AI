import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Compass,
  Github,
  PhoneCall,
  Stethoscope,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TEAM_INFO } from "../../data/teamData";
import { useI18n } from "../../lib/i18n";

interface RadialMenuItem {
  id: string;
  label: string;
  shortLabel: string;
  sublabel: string;
  href?: string;
  action: () => void;
  icon: React.ReactNode;
  accentColor: string;
}

export function ShasthoSetuRadialMenu({
  onOpenTeamModal,
  onStartVoiceCall,
  githubUrl = TEAM_INFO.githubRepoUrl,
}: {
  onOpenTeamModal: () => void;
  onStartVoiceCall: () => void;
  githubUrl?: string;
}) {
  const resolvedGithubUrl =
    githubUrl && githubUrl.trim().length > 0
      ? githubUrl.trim()
      : "https://github.com/ashik123-a1/ShasthoSetu-AI";
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<RadialMenuItem | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key or outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const items: RadialMenuItem[] = [
    {
      id: "team",
      label: locale === "bn" ? "প্রকল্প টিম ডিরেক্টরি" : "Official Project Team",
      shortLabel: locale === "bn" ? "টিম" : "Team",
      sublabel: locale === "bn" ? "৫ জন প্রকৌশলী ও স্থাপত্য নেতৃত্ব" : "5-Member Engineering Leadership & Contacts",
      action: () => {
        setIsOpen(false);
        onOpenTeamModal();
      },
      icon: <Users className="w-3.5 h-3.5" />,
      accentColor: "#34D399",
    },
    {
      id: "github",
      label: "GitHub Repository",
      shortLabel: "GitHub",
      sublabel: locale === "bn" ? "অফিসিয়াল ওপেন-সোর্স কোডবেস" : "Official Project Source Code",
      href: resolvedGithubUrl,
      action: () => {
        setIsOpen(false);
      },
      icon: <Github className="w-3.5 h-3.5" />,
      accentColor: "#38BDF8",
    },
    {
      id: "voice",
      label: locale === "bn" ? "হ্যান্ডস-ফ্রি ভয়েস কল" : "Conversational Voice Call",
      shortLabel: locale === "bn" ? "ভয়েস" : "Voice",
      sublabel: locale === "bn" ? "লাইভ দ্বিভাষিক এআই কল সাপোর্ট" : "Direct Hands-Free Healthcare Speech",
      action: () => {
        setIsOpen(false);
        onStartVoiceCall();
      },
      icon: <PhoneCall className="w-3.5 h-3.5" />,
      accentColor: "#F59E0B",
    },
    {
      id: "caremap",
      label: locale === "bn" ? "৩ডি স্বাস্থ্য মানচিত্র" : "3D Care Map",
      shortLabel: locale === "bn" ? "ম্যাপ" : "Map",
      sublabel: locale === "bn" ? "৮ বিভাগীয় হাসপাতাল ও ক্লিনিক মানচিত্র" : "8-Division Interactive Health Facilities",
      action: () => {
        setIsOpen(false);
        navigate("/care-map");
      },
      icon: <Compass className="w-3.5 h-3.5" />,
      accentColor: "#2DD4BF",
    },
    {
      id: "services",
      label: locale === "bn" ? "ক্লিনিক্যাল সেবা সমূহ" : "Clinical Services",
      shortLabel: locale === "bn" ? "সেবা" : "Services",
      sublabel: locale === "bn" ? "ই-ফার্মা, ডায়াগনস্টিক ও বিশেষজ্ঞ" : "ePharma, Diagnostic Tests & Triage",
      action: () => {
        setIsOpen(false);
        navigate("/services");
      },
      icon: <Stethoscope className="w-3.5 h-3.5" />,
      accentColor: "#FB7185",
    },
  ];

  // Upward-only radial orbit configuration (angles 0° straight UP to -90° straight LEFT)
  const orbitConfig = [
    { angle: 0, radius: 88 },    // 1. Team: Straight UP (Outer)
    { angle: -22, radius: 64 },  // 2. GitHub: UP-slight-left (Inner)
    { angle: -45, radius: 88 },  // 3. Voice: UP-left (Outer)
    { angle: -68, radius: 64 },  // 4. Care Map: UP-left (Inner)
    { angle: -90, radius: 88 },  // 5. Services: Straight LEFT (Outer)
  ];

  return (
    <div
      ref={menuRef}
      className="radial-orbit-menu-root no-print"
      style={{
        position: "fixed",
        right: "28px",
        bottom: "76px",
        zIndex: 1240,
        width: "44px",
        height: "44px",
        userSelect: "none",
      }}
    >
      {/* Light Backdrop Overlay when Radial Menu is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            background: "rgba(3, 8, 20, 0.55)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            transition: "opacity 0.25s ease",
          }}
        />
      )}

      {/* Floating Tooltip Pill (Positioned above the orbit cluster) */}
      <div
        style={{
          position: "absolute",
          bottom: "104px",
          right: "50%",
          transform: `translateX(50%) ${
            isOpen && hoveredItem ? "translateY(0) scale(1)" : "translateY(6px) scale(0.92)"
          }`,
          opacity: isOpen && hoveredItem ? 1 : 0,
          pointerEvents: "none",
          transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          whiteSpace: "nowrap",
          zIndex: 30,
        }}
      >
        {hoveredItem && (
          <div
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "12px",
              background: "rgba(6, 18, 38, 0.96)",
              border: `1px solid ${hoveredItem.accentColor}60`,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.75)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: hoveredItem.accentColor,
                letterSpacing: "0.02em",
              }}
            >
              {hoveredItem.label}
            </div>
            <div style={{ fontSize: "0.62rem", color: "#94A3B8", marginTop: "1px" }}>
              {hoveredItem.sublabel}
            </div>
          </div>
        )}
      </div>

      {/* Upward-Fanning Radial Orbit Items */}
      {items.map((item, idx) => {
        const cfg = orbitConfig[idx] || { angle: -idx * 22, radius: 76 };
        const angle = cfg.angle;
        const radius = cfg.radius;
        const delay = idx * 30;

        return (
          <div
            key={item.id}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transformOrigin: "50% 50%",
              transform: `rotate(${angle}deg)`,
              pointerEvents: "none",
            }}
          >
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={item.action}
                aria-label={item.label}
                onMouseEnter={(e) => {
                  setHoveredItem(item);
                  e.currentTarget.style.transform = `translateY(-${radius}px) rotate(${-angle}deg) scale(1.15)`;
                  e.currentTarget.style.borderColor = item.accentColor;
                  e.currentTarget.style.boxShadow = `0 8px 22px rgba(0, 0, 0, 0.6), 0 0 16px ${item.accentColor}70`;
                }}
                onMouseLeave={(e) => {
                  setHoveredItem(null);
                  e.currentTarget.style.transform = `translateY(-${radius}px) rotate(${-angle}deg) scale(1)`;
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.boxShadow = `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${item.accentColor}25`;
                }}
                style={{
                  position: "absolute",
                  top: "1px",
                  left: "1px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: isOpen ? "flex" : "none",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1px",
                  background: "rgba(8, 22, 48, 0.94)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  boxShadow: `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${item.accentColor}25`,
                  color: "#FFFFFF",
                  textDecoration: "none",
                  cursor: "pointer",
                  opacity: isOpen ? 1 : 0,
                  pointerEvents: isOpen ? "auto" : "none",
                  transition:
                    "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                  transitionDelay: isOpen ? `${delay}ms` : "0ms",
                  transform: isOpen
                    ? `translateY(-${radius}px) rotate(${-angle}deg) scale(1)`
                    : `translateY(0px) rotate(${-angle}deg) scale(0.35)`,
                }}
              >
                <span style={{ color: item.accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </span>
                <span
                  style={{
                    fontSize: "0.48rem",
                    fontWeight: 700,
                    letterSpacing: "0.01em",
                    color: "#E2E8F0",
                    lineHeight: 1,
                  }}
                >
                  {item.shortLabel}
                </span>
              </a>
            ) : (
              <button
                type="button"
                onClick={item.action}
                aria-label={item.label}
                onMouseEnter={(e) => {
                  setHoveredItem(item);
                  e.currentTarget.style.transform = `translateY(-${radius}px) rotate(${-angle}deg) scale(1.15)`;
                  e.currentTarget.style.borderColor = item.accentColor;
                  e.currentTarget.style.boxShadow = `0 8px 22px rgba(0, 0, 0, 0.6), 0 0 16px ${item.accentColor}70`;
                }}
                onMouseLeave={(e) => {
                  setHoveredItem(null);
                  e.currentTarget.style.transform = `translateY(-${radius}px) rotate(${-angle}deg) scale(1)`;
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.boxShadow = `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${item.accentColor}25`;
                }}
                style={{
                  position: "absolute",
                  top: "1px",
                  left: "1px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: isOpen ? "flex" : "none",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1px",
                  background: "rgba(8, 22, 48, 0.94)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  boxShadow: `0 6px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${item.accentColor}25`,
                  color: "#FFFFFF",
                  cursor: "pointer",
                  opacity: isOpen ? 1 : 0,
                  pointerEvents: isOpen ? "auto" : "none",
                  transition:
                    "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                  transitionDelay: isOpen ? `${delay}ms` : "0ms",
                  transform: isOpen
                    ? `translateY(-${radius}px) rotate(${-angle}deg) scale(1)`
                    : `translateY(0px) rotate(${-angle}deg) scale(0.35)`,
                }}
              >
                <span style={{ color: item.accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </span>
                <span
                  style={{
                    fontSize: "0.48rem",
                    fontWeight: 700,
                    letterSpacing: "0.01em",
                    color: "#E2E8F0",
                    lineHeight: 1,
                  }}
                >
                  {item.shortLabel}
                </span>
              </button>
            )}
          </div>
        );
      })}

      {/* Central Trigger Button (Compact 38x38px FAB with Hamburger-to-X Morph) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle ShasthoSetu Radial Orbit Menu"
        title={isOpen ? "Close Radial Menu" : "Open ShasthoSetu Radial Menu (Team, GitHub, Voice, Care Map)"}
        style={{
          position: "relative",
          zIndex: 10,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: isOpen
            ? "rgba(239, 68, 68, 0.28)"
            : "linear-gradient(135deg, rgba(6, 182, 212, 0.35) 0%, rgba(8, 24, 52, 0.94) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: isOpen
            ? "1.5px solid rgba(239, 68, 68, 0.65)"
            : "1.5px solid rgba(56, 189, 248, 0.55)",
          boxShadow: isOpen
            ? "0 6px 20px rgba(239, 68, 68, 0.4)"
            : "0 6px 20px rgba(0, 0, 0, 0.5), 0 0 14px rgba(56, 189, 248, 0.35)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          outline: "none",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {/* Animated Hamburger (☰) to (✕) Morph */}
        <div
          style={{
            position: "relative",
            width: "15px",
            height: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              position: "absolute",
              width: "100%",
              height: "2px",
              backgroundColor: isOpen ? "#EF4444" : "#38BDF8",
              borderRadius: "2px",
              transition: "transform 0.3s ease, top 0.3s ease, background-color 0.25s ease",
              transform: isOpen ? "rotate(45deg)" : "translateY(-4.5px)",
            }}
          />
          <span
            style={{
              position: "absolute",
              width: "100%",
              height: "2px",
              backgroundColor: isOpen ? "#EF4444" : "#38BDF8",
              borderRadius: "2px",
              transition: "opacity 0.22s ease, transform 0.22s ease",
              opacity: isOpen ? 0 : 1,
              transform: isOpen ? "scaleX(0)" : "scaleX(1)",
            }}
          />
          <span
            style={{
              position: "absolute",
              width: "100%",
              height: "2px",
              backgroundColor: isOpen ? "#EF4444" : "#38BDF8",
              borderRadius: "2px",
              transition: "transform 0.3s ease, top 0.3s ease, background-color 0.25s ease",
              transform: isOpen ? "rotate(-45deg)" : "translateY(4.5px)",
            }}
          />
        </div>
      </button>

      {/* Orbit Pulsing Satellite Ring when Closed */}
      {!isOpen && (
        <span
          style={{
            position: "absolute",
            inset: "-4px",
            borderRadius: "50%",
            border: "1.5px dashed rgba(56, 189, 248, 0.65)",
            pointerEvents: "none",
            animation: "spin 12s linear infinite",
          }}
        />
      )}
    </div>
  );
}
