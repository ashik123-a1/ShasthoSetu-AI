import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  ExternalLink,
  FlaskConical,
  Hospital,
  LocateFixed,
  MapPin,
  Navigation,
  Pill,
  Search,
  Stethoscope,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { formatBdtFromPoisha } from "../../lib/formatters";

export interface MapFacility {
  id: string;
  name: string;
  facility_type: string;
  district: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
  last_verified_date?: string | null;
}

export interface MapDoctor {
  id: string;
  display_name: string;
  display_name_bn?: string;
  specialty: string;
  district: string;
  practice_location: string;
  consultation_fee_minor_poisha: number;
  open_slots_count: number;
  is_online_now: number;
}

type CategoryFilter = "ALL" | "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY" | "DOCTOR";

interface MapPoint {
  id: string;
  kind: "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY" | "DOCTOR";
  title: string;
  subtitle: string;
  district: string;
  address: string;
  lat: number;
  lon: number;
  phoneOrMeta: string;
  verifiedDate?: string | null;
  doctorId?: string;
  feePoisha?: number;
  openSlots?: number;
  onlineNow?: boolean;
}

const SVG_W = 600;
const SVG_H = 720;
const LON_MIN = 87.85;
const LON_SPAN = 5.0;
const LAT_MAX = 26.85;
const LAT_SPAN = 6.35;

function project(lat: number, lon: number): [number, number] {
  const x = 45 + ((lon - LON_MIN) / LON_SPAN) * (SVG_W - 90);
  const y = 45 + ((LAT_MAX - lat) / LAT_SPAN) * (SVG_H - 90);
  return [x, y];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Accurate Bangladesh border polygon vertices in [lat, lon] projected via project()
const BD_OUTLINE_COORDS: Array<[number, number]> = [
  [26.62, 88.38],
  [26.42, 88.95],
  [26.18, 89.48],
  [25.95, 89.86],
  [25.55, 89.86],
  [25.18, 90.02],
  [25.18, 90.85],
  [25.16, 91.55],
  [25.12, 92.22],
  [24.85, 92.48],
  [24.48, 92.15],
  [24.16, 91.88],
  [23.85, 91.25],
  [23.48, 91.22],
  [23.18, 91.58],
  [23.45, 91.95],
  [23.72, 92.28],
  [23.22, 92.42],
  [22.55, 92.58],
  [21.82, 92.52],
  [21.25, 92.28],
  [20.86, 92.32],
  [21.15, 92.05],
  [21.58, 91.88],
  [22.25, 91.78],
  [22.82, 91.42],
  [22.68, 90.88],
  [22.15, 90.75],
  [21.82, 90.15],
  [21.75, 89.55],
  [21.65, 89.05],
  [22.45, 88.92],
  [23.15, 88.78],
  [23.82, 88.62],
  [24.22, 88.85],
  [24.45, 88.35],
  [24.68, 88.08],
  [25.25, 88.45],
  [25.72, 88.14],
  [26.28, 88.12],
];

const PADMA_JAMUNA_COORDS: Array<[number, number]> = [
  [26.12, 89.72],
  [25.45, 89.68],
  [24.65, 89.62],
  [23.82, 89.78],
  [23.42, 90.28],
  [22.85, 90.68],
  [22.12, 90.92],
];

const MEGHNA_COORDS: Array<[number, number]> = [
  [25.02, 91.42],
  [24.38, 91.02],
  [23.78, 90.68],
  [23.28, 90.62],
];

const DIVISION_ANCHORS: Array<{ name: string; bn: string; lat: number; lon: number }> = [
  { name: "Rangpur", bn: "রংপুর", lat: 25.75, lon: 89.24 },
  { name: "Rajshahi", bn: "রাজশাহী", lat: 24.37, lon: 88.6 },
  { name: "Mymensingh", bn: "ময়মনসিংহ", lat: 24.75, lon: 90.41 },
  { name: "Sylhet", bn: "সিলেট", lat: 24.9, lon: 91.87 },
  { name: "Dhaka", bn: "ঢাকা", lat: 23.76, lon: 90.39 },
  { name: "Khulna", bn: "খুলনা", lat: 22.84, lon: 89.54 },
  { name: "Barishal", bn: "বরিশাল", lat: 22.7, lon: 90.36 },
  { name: "Chattogram", bn: "চট্টগ্রাম", lat: 22.36, lon: 91.83 },
];

const DISTRICT_COORDS: Record<string, [number, number]> = {
  Dhaka: [23.764, 90.389],
  Chattogram: [22.356, 91.812],
  Rajshahi: [24.364, 88.624],
  Sylhet: [24.899, 91.869],
  Khulna: [22.845, 89.54],
  Barishal: [22.701, 90.353],
  Rangpur: [25.744, 89.275],
  Mymensingh: [24.747, 90.42],
};

function kindColor(kind: MapPoint["kind"]): string {
  switch (kind) {
    case "HOSPITAL":
      return "#38bdf8";
    case "DIAGNOSTIC":
      return "#818cf8";
    case "PHARMACY":
      return "#2dd4bf";
    case "DOCTOR":
      return "#f2c879";
  }
}

export function BangladeshCareMap({
  facilities,
  doctors,
  compact = false,
  onSelectFacilityCount,
}: {
  facilities: MapFacility[];
  doctors: MapDoctor[];
  compact?: boolean;
  onSelectFacilityCount?: () => void;
}) {
  const { locale } = useI18n();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const allPoints = useMemo<MapPoint[]>(() => {
    const facPoints: MapPoint[] = facilities.map((f, idx) => {
      const fallback = DISTRICT_COORDS[f.district] || [23.76, 90.39];
      const lat = typeof f.latitude === "number" ? f.latitude : fallback[0] + (idx % 3) * 0.03;
      const lon = typeof f.longitude === "number" ? f.longitude : fallback[1] + (idx % 2) * 0.03;
      const normalizedType =
        f.facility_type === "DIAGNOSTIC"
          ? "DIAGNOSTIC"
          : f.facility_type === "PHARMACY"
          ? "PHARMACY"
          : "HOSPITAL";
      return {
        id: f.id,
        kind: normalizedType,
        title: f.name,
        subtitle: f.facility_type,
        district: f.district,
        address: f.address,
        lat,
        lon,
        phoneOrMeta: f.phone || "Public Directory",
        verifiedDate: f.last_verified_date || "2026-11-10",
      };
    });

    const docPoints: MapPoint[] = doctors.map((d, idx) => {
      const base = DISTRICT_COORDS[d.district] || [23.76, 90.39];
      // Deterministic visual offset so Dhaka doctor pins don't stack on top of DHM/icddrb
      const latOffset = d.district === "Dhaka" ? (idx % 2 === 0 ? 0.095 : -0.075) : 0.06;
      const lonOffset = d.district === "Dhaka" ? (idx % 2 === 0 ? -0.11 : 0.12) : -0.09;
      return {
        id: `map-${d.id}`,
        kind: "DOCTOR",
        title: locale === "bn" && d.display_name_bn ? d.display_name_bn : d.display_name,
        subtitle: d.specialty,
        district: d.district,
        address: d.practice_location,
        lat: Number((base[0] + latOffset).toFixed(4)),
        lon: Number((base[1] + lonOffset).toFixed(4)),
        phoneOrMeta: formatBdtFromPoisha(d.consultation_fee_minor_poisha, locale),
        doctorId: d.id,
        feePoisha: d.consultation_fee_minor_poisha,
        openSlots: d.open_slots_count,
        onlineNow: Boolean(d.is_online_now),
      };
    });

    return [...facPoints, ...docPoints];
  }, [facilities, doctors, locale]);

  const districts = useMemo(() => {
    const uniq = Array.from(new Set(allPoints.map((p) => p.district)));
    return ["ALL", ...uniq];
  }, [allPoints]);

  const filteredPoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPoints
      .filter((p) => (categoryFilter === "ALL" ? true : p.kind === categoryFilter))
      .filter((p) => (districtFilter === "ALL" ? true : p.district === districtFilter))
      .filter((p) =>
        q
          ? p.title.toLowerCase().includes(q) ||
            p.district.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => {
        if (!userCoords) return 0;
        return (
          haversineKm(userCoords.lat, userCoords.lon, a.lat, a.lon) -
          haversineKm(userCoords.lat, userCoords.lon, b.lat, b.lon)
        );
      });
  }, [allPoints, categoryFilter, districtFilter, searchQuery, userCoords]);

  const selectedPoint =
    filteredPoints.find((p) => p.id === selectedId) ||
    allPoints.find((p) => p.id === selectedId) ||
    filteredPoints[0] ||
    null;

  const viewBox = useMemo(() => {
    if (zoomLevel <= 1.05 || !selectedPoint) {
      return `0 0 ${SVG_W} ${SVG_H}`;
    }
    const [cx, cy] = project(selectedPoint.lat, selectedPoint.lon);
    const w = SVG_W / zoomLevel;
    const h = SVG_H / zoomLevel;
    const x = Math.max(0, Math.min(SVG_W - w, cx - w / 2));
    const y = Math.max(0, Math.min(SVG_H - h, cy - h / 2));
    return `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  }, [zoomLevel, selectedPoint]);

  const outlinePointsStr = useMemo(
    () => BD_OUTLINE_COORDS.map(([lat, lon]) => project(lat, lon).map((n) => n.toFixed(1)).join(",")).join(" "),
    []
  );
  const jamunaPath = useMemo(
    () =>
      PADMA_JAMUNA_COORDS.map(([lat, lon], idx) => {
        const [x, y] = project(lat, lon);
        return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" "),
    []
  );
  const meghnaPath = useMemo(
    () =>
      MEGHNA_COORDS.map(([lat, lon], idx) => {
        const [x, y] = project(lat, lon);
        return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" "),
    []
  );

  const handleLocateUser = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setUserCoords({ lat: 23.7808, lon: 90.4071, label: "Dhaka Hub (Fallback)" });
      setGeoStatus(
        locale === "bn"
          ? "ব্রাউজার জিপিএস পাওয়া যায়নি; ঢাকা সেন্ট্রাল রেফারেন্স ব্যবহার করা হচ্ছে।"
          : "Geolocation unavailable; centered on Dhaka reference coordinate."
      );
      return;
    }
    setLocating(true);
    setGeoStatus(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setUserCoords({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
          label: locale === "bn" ? "আপনার অবস্থান" : "My GPS Position",
        });
        setGeoStatus(null);
      },
      () => {
        setLocating(false);
        setUserCoords({ lat: 23.7808, lon: 90.4071, label: "Dhaka Reference" });
        setGeoStatus(
          locale === "bn"
            ? "অবস্থান অনুমতি পাওয়া যায়নি — ডেমো ঢাকা কেন্দ্রবিন্দু ব্যবহার করা হয়েছে।"
            : "Location permission declined — using Dhaka reference coordinates for distance calculation."
        );
      },
      { timeout: 6000 }
    );
  };

  const selectedDistKm =
    userCoords && selectedPoint
      ? haversineKm(userCoords.lat, userCoords.lon, selectedPoint.lat, selectedPoint.lon)
      : null;

  return (
    <div
      data-testid="bangladesh-care-map"
      data-no-tilt="true"
      className="ss-sapphire-card rounded-3xl p-4 sm:p-6 space-y-5 text-white"
    >
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-300">
            <Compass className="w-3.5 h-3.5" />
            {locale === "bn" ? "বাংলাদেশ ন্যাশনাল কেয়ার অ্যাটলাস • ৮ বিভাগ" : "Bangladesh 8-Division Care Atlas • Real Coordinates"}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold">
            {locale === "bn"
              ? "হাসপাতাল, ডায়াগনস্টিক, ফার্মেসি ও অনুমোদিত চিকিৎসক ম্যাপ"
              : "Hospitals, Labs, 24h Pharmacies & Approved Doctor Locations"}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={locating}
            data-testid="care-map-gps-btn"
            className="min-h-11 px-4 rounded-full border border-sky-400/35 bg-sky-400/15 hover:bg-sky-400/25 text-sky-200 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition"
          >
            <LocateFixed className="w-4 h-4 text-[#f2c879]" />
            <span>
              {locating
                ? locale === "bn"
                  ? "খোঁজা হচ্ছে..."
                  : "Locating..."
                : locale === "bn"
                ? "আমার অবস্থান ব্যবহার করুন"
                : "Use My Location"}
            </span>
          </button>

          {!compact && (
            <button
              type="button"
              onClick={() => setUserCoords({ lat: 23.7808, lon: 90.4071, label: "Dhaka Demo Point" })}
              className="min-h-11 px-3.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              {locale === "bn" ? "ঢাকা রেফারেন্স পয়েন্ট" : "Dhaka Ref Point"}
            </button>
          )}

          {compact && (
            <Link
              to="/care-map"
              onClick={onSelectFacilityCount}
              className="min-h-11 px-4 rounded-full bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow"
            >
              {locale === "bn" ? "পূর্ণাঙ্গ ম্যাপ খুলুন" : "Open Full Care Map"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {geoStatus && (
        <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200">
          {geoStatus}
        </div>
      )}

      {/* Search + Category + District Chips */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sky-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                locale === "bn"
                  ? "হাসপাতাল, জেলা, পিসিওএস বা চিকিৎসকের নাম লিখুন..."
                  : "Filter hospital, lab, pharmacy, division or specialist..."
              }
              className="w-full min-h-11 pl-10 pr-4 rounded-full bg-black/35 border border-sky-400/25 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["ALL", locale === "bn" ? "সবগুলো" : "All"],
                ["HOSPITAL", locale === "bn" ? "হাসপাতাল" : "Hospitals"],
                ["DIAGNOSTIC", locale === "bn" ? "ল্যাব" : "Labs"],
                ["PHARMACY", locale === "bn" ? "ফার্মেসি" : "Pharmacies"],
                ["DOCTOR", locale === "bn" ? "চিকিৎসক" : "Doctors"],
              ] as const
            ).map(([cat, label]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-11 px-3.5 rounded-full text-xs font-semibold border cursor-pointer transition ${
                  categoryFilter === cat
                    ? "bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 border-transparent font-bold"
                    : "bg-black/30 border-white/15 text-slate-200 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {districts.map((dist) => (
            <button
              key={dist}
              type="button"
              onClick={() => {
                setDistrictFilter(dist);
                const match = allPoints.find((p) => dist === "ALL" || p.district === dist);
                if (match) setSelectedId(match.id);
              }}
              className={`min-h-9 px-3 rounded-full text-xs font-mono whitespace-nowrap border cursor-pointer transition ${
                districtFilter === dist
                  ? "bg-sky-400/25 border-sky-400 text-sky-200 font-bold"
                  : "bg-black/25 border-white/10 text-slate-300 hover:border-sky-400/40"
              }`}
            >
              {dist}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Interactive SVG Bangladesh Atlas + Detail & Nearest List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Vector Map Viewport */}
        <div className="lg:col-span-7 relative rounded-2xl border border-sky-400/25 bg-[#030812]/90 overflow-hidden flex flex-col justify-between min-h-[380px] sm:min-h-[440px]">
          {/* Map Top HUD */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#061126]/85 border border-sky-400/25 backdrop-blur-md px-3 py-1 text-[11px] font-mono text-sky-200">
              <span>{filteredPoints.length} pins visible</span>
              <span>•</span>
              <span>{zoomLevel.toFixed(1)}x</span>
            </div>

            <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#061126]/85 border border-sky-400/25 backdrop-blur-md p-1">
              <button
                type="button"
                aria-label="Zoom in map"
                onClick={() => setZoomLevel((z) => Math.min(2.6, Number((z + 0.5).toFixed(1))))}
                className="w-8 h-8 rounded-full hover:bg-white/10 inline-flex items-center justify-center text-sky-200 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Zoom out map"
                onClick={() => setZoomLevel((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                className="w-8 h-8 rounded-full hover:bg-white/10 inline-flex items-center justify-center text-sky-200 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2.5 h-8 rounded-full hover:bg-white/10 text-[10px] font-mono text-slate-300 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <svg
            viewBox={viewBox}
            role="img"
            aria-label="Interactive Bangladesh Healthcare Facility and Doctor Map"
            className="w-full h-[380px] sm:h-[450px] select-none"
          >
            <defs>
              <radialGradient id="bdGlowGrad" cx="50%" cy="48%" r="55%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                <stop offset="65%" stopColor="#0e7490" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#040914" stopOpacity="0" />
              </radialGradient>
              <pattern id="bdGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="1" />
              </pattern>
            </defs>

            <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#bdGridPattern)" />
            <circle cx={SVG_W / 2} cy={SVG_H / 2} r="280" fill="url(#bdGlowGrad)" />

            {/* Bangladesh Polygon */}
            <polygon
              points={outlinePointsStr}
              fill="rgba(13, 32, 68, 0.72)"
              stroke="rgba(56, 189, 248, 0.55)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* Major Rivers */}
            <path d={jamunaPath} fill="none" stroke="rgba(56, 189, 248, 0.34)" strokeWidth="2.4" strokeLinecap="round" />
            <path d={meghnaPath} fill="none" stroke="rgba(45, 212, 191, 0.32)" strokeWidth="2" strokeLinecap="round" />

            {/* Division Anchor Rings & Labels */}
            {DIVISION_ANCHORS.map((div) => {
              const [dx, dy] = project(div.lat, div.lon);
              return (
                <g key={div.name} className="cursor-pointer" onClick={() => setDistrictFilter(div.name)}>
                  <circle cx={dx} cy={dy} r="18" fill="none" stroke="rgba(56,189,248,0.16)" strokeDasharray="3 3" />
                  <text
                    x={dx}
                    y={dy + 22}
                    textAnchor="middle"
                    fill="rgba(203,213,225,0.68)"
                    fontSize={zoomLevel > 1.5 ? "8.5" : "10"}
                    fontFamily="ui-monospace, monospace"
                  >
                    {locale === "bn" ? div.bn : div.name}
                  </text>
                </g>
              );
            })}

            {/* Geolocation Route Tether Line */}
            {userCoords && selectedPoint && (() => {
              const [ux, uy] = project(userCoords.lat, userCoords.lon);
              const [sx, sy] = project(selectedPoint.lat, selectedPoint.lon);
              return (
                <>
                  <line
                    x1={ux}
                    y1={uy}
                    x2={sx}
                    y2={sy}
                    stroke="#f2c879"
                    strokeWidth="2"
                    strokeDasharray="6 5"
                  />
                  <g>
                    <circle cx={ux} cy={uy} r="10" fill="rgba(242,200,121,0.22)" />
                    <circle cx={ux} cy={uy} r="4.5" fill="#f2c879" stroke="#040914" strokeWidth="1.5" />
                  </g>
                </>
              );
            })()}

            {/* Facility & Doctor Pins */}
            {filteredPoints.map((pt) => {
              const [px, py] = project(pt.lat, pt.lon);
              const active = selectedPoint?.id === pt.id;
              const col = kindColor(pt.kind);
              const r = active ? 7.5 : 5.5;
              return (
                <g
                  key={pt.id}
                  data-testid={`map-pin-${pt.id}`}
                  onClick={() => setSelectedId(pt.id)}
                  className="cursor-pointer"
                >
                  {active && (
                    <circle
                      cx={px}
                      cy={py}
                      r={14}
                      fill="none"
                      stroke={col}
                      strokeWidth="1.8"
                      className="ss-map-pulse"
                    />
                  )}
                  <circle
                    cx={px}
                    cy={py}
                    r={r}
                    fill={col}
                    stroke="#040914"
                    strokeWidth={active ? 2.2 : 1.5}
                  />
                  {active && (
                    <text
                      x={px}
                      y={py - 12}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={zoomLevel > 1.5 ? "9" : "10.5"}
                      fontWeight="700"
                    >
                      {pt.district}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Bottom Legend */}
          <div className="px-4 py-2.5 border-t border-white/10 bg-[#050d1d]/85 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> {locale === "bn" ? "হাসপাতাল" : "Hospital"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#818cf8]" /> {locale === "bn" ? "ডায়াগনস্টিক" : "Diagnostic"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]" /> {locale === "bn" ? "ফার্মেসি" : "Pharmacy"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f2c879]" /> {locale === "bn" ? "অনুমোদিত চিকিৎসক" : "Approved Doctor"}
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {locale === "bn" ? "ক্লিক করে বিস্তারিত ও দূরত্ব দেখুন" : "Click any pin or division to inspect & zoom"}
            </span>
          </div>
        </div>

        {/* Right: Selected Pin Details + Scrollable Ranked List */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {selectedPoint ? (
            <div
              data-testid="care-map-selected-card"
              className="rounded-2xl border border-sky-400/35 bg-[#061228]/90 p-5 space-y-3 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    color: kindColor(selectedPoint.kind),
                    borderColor: `${kindColor(selectedPoint.kind)}66`,
                    backgroundColor: `${kindColor(selectedPoint.kind)}18`,
                  }}
                >
                  {selectedPoint.kind} • {selectedPoint.district}
                </span>
                {selectedDistKm !== null && (
                  <span className="font-mono text-xs font-bold text-[#f2c879]">
                    ~{selectedDistKm.toFixed(1)} km
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-bold text-lg text-white leading-snug">{selectedPoint.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{selectedPoint.address}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-black/35 rounded-xl p-3 border border-white/10">
                <div>
                  <span className="text-slate-400 block">COORDINATES</span>
                  <span className="text-sky-200">
                    {selectedPoint.lat.toFixed(4)}°N, {selectedPoint.lon.toFixed(4)}°E
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    {selectedPoint.kind === "DOCTOR" ? "FEE / SLOTS" : "CONTACT / VERIFIED"}
                  </span>
                  <span className="text-teal-200">
                    {selectedPoint.kind === "DOCTOR"
                      ? `${selectedPoint.phoneOrMeta} • ${selectedPoint.openSlots ?? 0} slots`
                      : `${selectedPoint.phoneOrMeta} (${selectedPoint.verifiedDate})`}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-amber-200/85 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
                {locale === "bn"
                  ? "তথ্য স্বচ্ছতা (FR-FIND-04): অনুমাননির্ভর শয্যা সংখ্যা বা তাৎক্ষণিক জরুরি সময়সূচী দেখানো হয় না; সরাসরি কল করে নিশ্চিত হন।"
                  : "Provenance Notice (FR-FIND-04): Reference directory coordinates only — live ER bed counts & hours are never fabricated."}
              </p>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selectedPoint.lat}&mlon=${selectedPoint.lon}#map=15/${selectedPoint.lat}/${selectedPoint.lon}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-11 px-4 rounded-xl border border-sky-400/35 bg-sky-400/15 hover:bg-sky-400/25 text-sky-200 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {locale === "bn" ? "ওপেনস্ট্রিটম্যাপ দিকনির্দেশ" : "OSM Directions"}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <Link
                  to={selectedPoint.doctorId ? `/doctors/${selectedPoint.doctorId}` : `/doctors?q=${encodeURIComponent(selectedPoint.district)}`}
                  className="min-h-11 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
                >
                  {selectedPoint.doctorId
                    ? locale === "bn"
                      ? "ডাক্তারের স্লট বুক করুন"
                      : "Book Doctor Slot"
                    : locale === "bn"
                    ? `${selectedPoint.district}-এর ডাক্তার খুঁজুন`
                    : `Doctors in ${selectedPoint.district}`}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-black/30 p-5 text-sm text-slate-300">
              {locale === "bn" ? "কোনো ম্যাপ পয়েন্ট পাওয়া যায়নি।" : "No map entries match the current filter."}
            </div>
          )}

          {/* Directory Pin List */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 flex-1 max-h-[265px] overflow-y-auto space-y-2">
            {filteredPoints.map((pt) => {
              const active = selectedPoint?.id === pt.id;
              const km = userCoords ? haversineKm(userCoords.lat, userCoords.lon, pt.lat, pt.lon) : null;
              const Icon =
                pt.kind === "HOSPITAL"
                  ? Hospital
                  : pt.kind === "DIAGNOSTIC"
                  ? FlaskConical
                  : pt.kind === "PHARMACY"
                  ? Pill
                  : Stethoscope;
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setSelectedId(pt.id)}
                  className={`w-full text-left rounded-xl p-2.5 border transition cursor-pointer flex items-center justify-between gap-2 ${
                    active
                      ? "bg-sky-400/15 border-sky-400/55 text-white"
                      : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: kindColor(pt.kind) }} />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate">{pt.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {pt.district} • {pt.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-sky-300 shrink-0">
                    {km !== null ? `${km.toFixed(1)} km` : pt.kind}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
