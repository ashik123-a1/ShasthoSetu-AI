import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowRight,
  Compass,
  FlaskConical,
  Hospital,
  LocateFixed,
  MousePointerClick,
  Navigation,
  Pill,
  RotateCcw,
  Star,
  Stethoscope,
} from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { formatBdtFromPoisha } from "../../lib/formatters";
import { usePreferences } from "../../lib/preferences";

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
type DivisionKey =
  | "dhaka"
  | "chattogram"
  | "rajshahi"
  | "khulna"
  | "sylhet"
  | "barishal"
  | "rangpur"
  | "mymensingh";

interface DivisionHub {
  key: DivisionKey;
  shortEn: string;
  labelBn: string;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  pilotBadgeBn: string;
  pilotBadgeEn: string;
  isPilot: boolean;
  lat: number;
  lng: number;
  districts: string[];
}

const BD_CENTER: [number, number] = [23.8103, 90.4125];
const BD_INITIAL_ZOOM = 7;

const DIVISION_HUBS: DivisionHub[] = [
  {
    key: "dhaka",
    shortEn: "Dhaka",
    labelBn: "ঢাকা (Dhaka)",
    titleBn: "ঢাকা বিভাগ (Dhaka Division)",
    titleEn: "Dhaka Division",
    descBn: "মাতৃস্বাস্থ্য ও পিসিওএস কেয়ার, শিশু জরুরি ট্রায়াজ এবং মানব-যাচাইকৃত ওসিআর প্রেসক্রিপশন নেটওয়ার্কের কেন্দ্রীয় হাব।",
    descEn: "Central specialist hub coordinating PCOS endocrinology, pediatric red-flag care, 24h pharmacies, and verified telehealth slots.",
    pilotBadgeBn: "সক্রিয় হাব (ঢাকা কেন্দ্রীয়)",
    pilotBadgeEn: "ACTIVE CARE HUB",
    isPilot: true,
    lat: 23.8103,
    lng: 90.4125,
    districts: ["Dhaka", "Gazipur", "Narayanganj", "Tangail"],
  },
  {
    key: "chattogram",
    shortEn: "Ctg",
    labelBn: "চট্টগ্রাম (Ctg)",
    titleBn: "চট্টগ্রাম বিভাগ (Chattogram Division)",
    titleEn: "Chattogram Division",
    descBn: "বন্দর ও পার্বত্য-উপকূলীয় অঞ্চলের ডায়াগনস্টিক ল্যাব, মেডিক্যাল কলেজ এবং ডক্টর-ইন-দ্য-লুপ ওসিআর সেবা কেন্দ্র।",
    descEn: "Port & coastal healthcare corridor linking diagnostic labs, tertiary centers, and bilingual Safe-OCR prescription care.",
    pilotBadgeBn: "ডিজিটাল নেটওয়ার্ক",
    pilotBadgeEn: "REGIONAL NETWORK",
    isPilot: false,
    lat: 22.3569,
    lng: 91.7832,
    districts: ["Chattogram", "Chittagong", "Cox's Bazar", "Cumilla"],
  },
  {
    key: "rajshahi",
    shortEn: "Rajshahi",
    labelBn: "★ রাজশাহী (Rajshahi)",
    titleBn: "রাজশাহী বিভাগ (Rajshahi Division)",
    titleEn: "Rajshahi Division",
    descBn: "উত্তর-পশ্চিম বরেন্দ্র অঞ্চলের মাতৃ-শিশু টেলিমেডিসিন, ডায়াগনস্টিক স্যাম্পলিং এবং ফার্মেসি রেফারেল ক্লাস্টার।",
    descEn: "Northwest regional telehealth node serving Barind maternal screening, diagnostic sampling, and verified clinician referrals.",
    pilotBadgeBn: "★ কোর পাইলট হাব (রাজশাহী)",
    pilotBadgeEn: "★ CORE REGIONAL HUB",
    isPilot: true,
    lat: 24.3745,
    lng: 88.6042,
    districts: ["Rajshahi", "Bogura", "Pabna", "Natore"],
  },
  {
    key: "khulna",
    shortEn: "Khulna",
    labelBn: "★ খুলনা (Khulna)",
    titleBn: "খুলনা বিভাগ (Khulna Division)",
    titleEn: "Khulna Division",
    descBn: "দক্ষিণ-পশ্চিমাঞ্চলীয় উপকূল ও সুন্দরবন সংলগ্ন পরিবারগুলোর জন্য ২৪ ঘণ্টা জরুরি ওসিআর ও শিশু-চিকিৎসা সহায়তা।",
    descEn: "Southwest clinical support node enabling coastal families to book verified doctors and access nearby verified pharmacies.",
    pilotBadgeBn: "★ কোর পাইলট হাব (খুলনা)",
    pilotBadgeEn: "★ CORE REGIONAL HUB",
    isPilot: true,
    lat: 22.8456,
    lng: 89.5403,
    districts: ["Khulna", "Jashore", "Satkhira", "Kushtia"],
  },
  {
    key: "sylhet",
    shortEn: "Sylhet",
    labelBn: "সিলেট (Sylhet)",
    titleBn: "সিলেট বিভাগ (Sylhet Division)",
    titleEn: "Sylhet Division",
    descBn: "চা-বাগান ও হাওরাঞ্চলের পরিবারগুলোর জন্য বাংলা-প্রথম পরামর্শ, ডিজিটাল প্রেসক্রিপশন ভল্ট ও ওসমানী নেটওয়ার্ক।",
    descEn: "Haor and tea-estate family telehealth node with Bangla-first care planning and Osmani regional hospital links.",
    pilotBadgeBn: "ডিজিটাল নেটওয়ার্ক",
    pilotBadgeEn: "REGIONAL NETWORK",
    isPilot: false,
    lat: 24.8949,
    lng: 91.8687,
    districts: ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
  },
  {
    key: "barishal",
    shortEn: "Barishal",
    labelBn: "বরিশাল (Barishal)",
    titleBn: "বরিশাল বিভাগ (Barishal Division)",
    titleEn: "Barishal Division",
    descBn: "নদীবিধৌত দক্ষিণাঞ্চলে শিশু জ্বর-র‍্যাশ সতর্কীকরণ, টিকা সময়সূচী ও ২৪ ঘণ্টা মডেল ফার্মেসি সংযোগ।",
    descEn: "Riverine southern care hub connecting Sher-e-Bangla Medical corridors with pediatric triage and safe pharmacy routing.",
    pilotBadgeBn: "ডিজিটাল নেটওয়ার্ক",
    pilotBadgeEn: "REGIONAL NETWORK",
    isPilot: false,
    lat: 22.701,
    lng: 90.3535,
    districts: ["Barishal", "Barisal", "Patuakhali", "Bhola"],
  },
  {
    key: "rangpur",
    shortEn: "Rangpur",
    labelBn: "রংপুর (Rangpur)",
    titleBn: "রংপুর বিভাগ (Rangpur Division)",
    titleEn: "Rangpur Division",
    descBn: "উত্তরাঞ্চলের মা ও শিশুর প্রতিরোধমূলক স্বাস্থ্যসেবা, ল্যাব টেস্ট ও অনুমোদিত চিকিৎসকের স্লট বুকিং কেন্দ্র।",
    descEn: "Northern maternal and child preventive care center pairing lab test directories with verified online consultations.",
    pilotBadgeBn: "ডিজিটাল নেটওয়ার্ক",
    pilotBadgeEn: "REGIONAL NETWORK",
    isPilot: false,
    lat: 25.7439,
    lng: 89.2752,
    districts: ["Rangpur", "Dinajpur", "Kurigram", "Nilphamari"],
  },
  {
    key: "mymensingh",
    shortEn: "Mymensingh",
    labelBn: "ময়মনসিংহ (Mym)",
    titleBn: "ময়মনসিংহ বিভাগ (Mymensingh Division)",
    titleEn: "Mymensingh Division",
    descBn: "ব্রহ্মপুত্র অববাহিকার পিসিওএস স্ক্রিনিং, চর্মরোগ গবেষণা প্রোটোটাইপ ও চরপাড়া হাসপাতাল রেফারেল হাব।",
    descEn: "Brahmaputra basin healthcare hub connecting Charpara hospital referrals, PCOS journals, and dermatology prototypes.",
    pilotBadgeBn: "ডিজিটাল নেটওয়ার্ক",
    pilotBadgeEn: "REGIONAL NETWORK",
    isPilot: false,
    lat: 24.7471,
    lng: 90.4203,
    districts: ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
  },
];

function districtToDivisionKey(district?: string | null): DivisionKey {
  const norm = (district || "").toLowerCase();
  const found = DIVISION_HUBS.find((hub) =>
    hub.districts.some((d) => norm.includes(d.toLowerCase()))
  );
  return found?.key ?? "dhaka";
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

interface MapEntityPoint {
  id: string;
  kind: "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY" | "DOCTOR";
  divisionKey: DivisionKey;
  title: string;
  subtitle: string;
  district: string;
  address: string;
  lat: number;
  lon: number;
  meta: string;
  doctorId?: string;
}

/**
 * Land-Guard-ported Real Interactive Leaflet Bangladesh Map with GeoJSON Illuminated
 * National Border, ArcGIS Dark Basemap, 8-Division Pulsing Radar Pins & SQLite Facility Overlay.
 */
export function BangladeshCareMap({
  facilities,
  doctors,
  compact = false,
}: {
  facilities: MapFacility[];
  doctors: MapDoctor[];
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const divMarkersRef = useRef<Partial<Record<DivisionKey, L.Marker>>>({});

  const [selectedDivKey, setSelectedDivKey] = useState<DivisionKey>("dhaka");
  const [filter, setFilter] = useState<CategoryFilter>("ALL");
  const [flashCard, setFlashCard] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const entityPoints = useMemo<MapEntityPoint[]>(() => {
    const items: MapEntityPoint[] = [];

    facilities.forEach((f) => {
      const divKey = districtToDivisionKey(f.district);
      const hub = DIVISION_HUBS.find((h) => h.key === divKey) ?? DIVISION_HUBS[0];
      const lat = typeof f.latitude === "number" ? f.latitude : hub.lat + 0.015;
      const lon = typeof f.longitude === "number" ? f.longitude : hub.lng + 0.015;
      const upper = (f.facility_type || "HOSPITAL").toUpperCase();
      const kind: MapEntityPoint["kind"] =
        upper === "DIAGNOSTIC" ? "DIAGNOSTIC" : upper === "PHARMACY" ? "PHARMACY" : "HOSPITAL";

      items.push({
        id: f.id,
        kind,
        divisionKey: divKey,
        title: f.name,
        subtitle: upper,
        district: f.district,
        address: f.address,
        lat,
        lon,
        meta: f.phone || (f.last_verified_date ? `Verified ${f.last_verified_date}` : "SQLite Verified"),
      });
    });

    doctors.forEach((doc, idx) => {
      const divKey = districtToDivisionKey(doc.district);
      const hub = DIVISION_HUBS.find((h) => h.key === divKey) ?? DIVISION_HUBS[0];
      const offsetLat = ((idx % 3) - 1) * 0.045 + 0.025;
      const offsetLon = (((idx * 2) % 3) - 1) * 0.055 - 0.025;
      items.push({
        id: `doc-${doc.id}`,
        kind: "DOCTOR",
        divisionKey: divKey,
        title: locale === "bn" && doc.display_name_bn ? doc.display_name_bn : doc.display_name,
        subtitle: doc.specialty,
        district: doc.district,
        address: doc.practice_location,
        lat: hub.lat + offsetLat,
        lon: hub.lng + offsetLon,
        meta: `${formatBdtFromPoisha(doc.consultation_fee_minor_poisha, locale)} • ${doc.open_slots_count} slots`,
        doctorId: doc.id,
      });
    });

    return items;
  }, [facilities, doctors, locale]);

  const filteredPoints = useMemo(
    () => (filter === "ALL" ? entityPoints : entityPoints.filter((p) => p.kind === filter)),
    [entityPoints, filter]
  );

  const selectedHub = useMemo(
    () => DIVISION_HUBS.find((h) => h.key === selectedDivKey) ?? DIVISION_HUBS[0],
    [selectedDivKey]
  );

  const divisionEntities = useMemo(
    () => entityPoints.filter((p) => p.divisionKey === selectedDivKey),
    [entityPoints, selectedDivKey]
  );

  const divisionOpenSlots = useMemo(
    () =>
      doctors
        .filter((d) => districtToDivisionKey(d.district) === selectedDivKey)
        .reduce((sum, d) => sum + (d.open_slots_count || 0), 0),
    [doctors, selectedDivKey]
  );

  const selectDivision = (key: DivisionKey, fly = true) => {
    const hub = DIVISION_HUBS.find((h) => h.key === key);
    if (!hub) return;
    setSelectedDivKey(key);
    setFlashCard(true);
    window.setTimeout(() => setFlashCard(false), 500);

    const map = leafletMapRef.current;
    if (map && fly) {
      map.flyTo([hub.lat, hub.lng], 8.6, {
        duration: motionPaused ? 0 : 1.1,
        easeLinearity: 0.25,
      });
      const marker = divMarkersRef.current[key];
      if (marker) {
        window.setTimeout(() => {
          marker.openPopup();
        }, motionPaused ? 50 : 650);
      }
    }
  };

  const resetBdMap = () => {
    const map = leafletMapRef.current;
    if (map) {
      map.closePopup();
      map.flyTo(BD_CENTER, BD_INITIAL_ZOOM, { duration: motionPaused ? 0 : 1.0 });
    }
    setSelectedDivKey("dhaka");
  };

  const handleUseGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus(locale === "bn" ? "জিপিএস উপলব্ধ নয়।" : "GPS unavailable; showing national hubs.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setGpsCoords(coords);
        let nearest = DIVISION_HUBS[0];
        let minKm = Infinity;
        DIVISION_HUBS.forEach((h) => {
          const dist = haversineKm(coords.lat, coords.lon, h.lat, h.lng);
          if (dist < minKm) {
            minKm = dist;
            nearest = h;
          }
        });
        setGpsStatus(
          locale === "bn"
            ? `স্থানীয় অবস্থান শনাক্ত (~${minKm.toFixed(1)} কিমি: ${nearest.shortEn})`
            : `Local GPS pinned (~${minKm.toFixed(1)} km from ${nearest.shortEn})`
        );
        selectDivision(nearest.key, true);
      },
      () => {
        setGpsStatus(locale === "bn" ? "জিপিএস অনুমতি মেলেনি।" : "Location denied; select a division manually.");
      },
      { timeout: 5000 }
    );
  };

  // Initialize Real Leaflet Map (Land-Guard Architecture with StrictMode-safe teardown)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(el, {
      center: BD_CENTER,
      zoom: BD_INITIAL_ZOOM,
      minZoom: 6,
      maxZoom: 16,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      dragging: true,
      zoomControl: true,
      attributionControl: false,
    });

    leafletMapRef.current = map;

    // 1. Cyber Dark ArcGIS Basemap (exact match with Land-Guard)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 16 }
    ).addTo(map);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 16, opacity: 0.85 }
    ).addTo(map);

    // 2. Illuminate Real Bangladesh GeoJSON Boundary
    const abortCtrl = new AbortController();
    fetch("/geo/bangladesh_highres.geojson", { signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("highres missing"))))
      .catch(() => fetch("/geo/bangladesh.geojson", { signal: abortCtrl.signal }).then((r) => r.json()))
      .then((data) => {
        if (!leafletMapRef.current) return;
        L.geoJSON(data, {
          style: {
            color: "#10B981",
            weight: 2.8,
            opacity: 0.95,
            fillColor: "#06B6D4",
            fillOpacity: 0.16,
            dashArray: "3, 4",
          },
        }).addTo(map);
      })
      .catch(() => {
        // Resilient if aborted or offline
      });

    // 3. Dedicated dynamic marker layer group
    const layerGroup = L.layerGroup().addTo(map);
    markerLayerRef.current = layerGroup;

    // 4. Create Pulsing Radar Pins for all 8 Divisions
    const divMarkerMap: Partial<Record<DivisionKey, L.Marker>> = {};
    DIVISION_HUBS.forEach((hub) => {
      const icon = L.divIcon({
        className: "custom-radar-icon",
        html: `
          <div class="radar-pin-container">
            <div class="${hub.isPilot ? "radar-pulse-ring-pilot" : "radar-pulse-ring"}"></div>
            <div class="${hub.isPilot ? "radar-core-dot-pilot" : "radar-core-dot"}"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([hub.lat, hub.lng], { icon, zIndexOffset: hub.isPilot ? 400 : 250 }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; padding: 2px 4px; min-width: 190px;">
          <div style="font-size: 13px; font-weight: 800; color: #38bdf8; margin-bottom: 2px;">${escapeHtml(hub.titleBn)}</div>
          <div style="font-size: 10px; font-family: monospace; color: #f2c879; margin-bottom: 6px;">${escapeHtml(hub.pilotBadgeEn)}</div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.45;">${escapeHtml(hub.descEn)}</div>
        </div>
      `);
      marker.on("click", () => {
        setSelectedDivKey(hub.key);
        setFlashCard(true);
        window.setTimeout(() => setFlashCard(false), 450);
      });
      divMarkerMap[hub.key] = marker;
    });
    divMarkersRef.current = divMarkerMap;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 260);

    return () => {
      window.clearTimeout(resizeTimer);
      abortCtrl.abort();
      divMarkersRef.current = {};
      markerLayerRef.current = null;
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Sync filtered SQLite facility & approved doctor pins onto the dynamic Leaflet LayerGroup
  useEffect(() => {
    const group = markerLayerRef.current;
    if (!group) return;
    group.clearLayers();

    filteredPoints.forEach((pt) => {
      const color =
        pt.kind === "DOCTOR"
          ? "#818cf8"
          : pt.kind === "HOSPITAL"
          ? "#2dd4bf"
          : pt.kind === "DIAGNOSTIC"
          ? "#38bdf8"
          : "#f2c879";

      const dotIcon = L.divIcon({
        className: "custom-entity-dot",
        html: `<div style="width:11px;height:11px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 0 10px ${color};cursor:pointer;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const m = L.marker([pt.lat, pt.lon], { icon: dotIcon, zIndexOffset: 150 }).addTo(group);
      m.bindPopup(`
        <div style="font-family: inherit; padding: 2px 4px; min-width: 185px;">
          <div style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: ${color}; font-weight: 700;">${escapeHtml(pt.kind)} • ${escapeHtml(pt.district)}</div>
          <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin: 2px 0;">${escapeHtml(pt.title)}</div>
          <div style="font-size: 11px; color: #cbd5e1;">${escapeHtml(pt.subtitle)}</div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">${escapeHtml(pt.address)}</div>
          <div style="font-size: 10px; font-family: monospace; color: #38bdf8; margin-top: 4px;">${escapeHtml(pt.meta)}</div>
        </div>
      `);
      m.on("click", () => {
        setSelectedDivKey(pt.divisionKey);
      });
    });
  }, [filteredPoints]);

  const gpsDistKm = gpsCoords
    ? haversineKm(gpsCoords.lat, gpsCoords.lon, selectedHub.lat, selectedHub.lng)
    : null;

  return (
    <div
      data-testid="bangladesh-care-map"
      data-no-tilt="true"
      className="ss-sapphire-card relative rounded-3xl p-4 sm:p-6 space-y-5 text-white overflow-hidden"
    >
      {/* Atmospheric Aerial Map Backdrop from Land-Guard */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src="/images/backgrounds/dhaka-aerial-map-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center opacity-20 saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040914]/90 via-[#040914]/70 to-[#040914]/95" />
      </div>

      {/* Section Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-300">
            <Compass className="w-3.5 h-3.5" />
            {locale === "bn"
              ? "বাংলাদেশ জাতীয় স্বাস্থ্যসেবা ও ম্যাপ কভারেজ • ৮ বিভাগ"
              : "Nationwide Geographic Bangladesh Care Atlas • Leaflet + GeoJSON"}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold">
            {locale === "bn"
              ? "শুধুমাত্র বাংলাদেশ আলোকিত — হাসপাতাল, ল্যাব, ফার্মেসি ও ডাক্তার ম্যাপ"
              : "Only Bangladesh Illuminated — Interactive 8-Division Healthcare & Clinical Grid"}
          </h3>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Care Map Category Filters">
          {(
            [
              { id: "ALL", bn: "সকল", en: "All", icon: Compass },
              { id: "HOSPITAL", bn: "হাসপাতাল", en: "Hospitals", icon: Hospital },
              { id: "DIAGNOSTIC", bn: "ল্যাব", en: "Diagnostics", icon: FlaskConical },
              { id: "PHARMACY", bn: "ফার্মেসি", en: "24h Pharmacy", icon: Pill },
              { id: "DOCTOR", bn: "ডাক্তার", en: "Doctors", icon: Stethoscope },
            ] as const
          ).map((item) => {
            const IconComp = item.icon;
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={`min-h-11 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent font-bold"
                    : "bg-[#040a18]/75 border-sky-400/25 text-slate-200 hover:border-sky-400/50"
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{locale === "bn" ? item.bn : item.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Land-Guard Map + Division Inspector Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT COLUMN (7 cols): Interactive Leaflet Map Shell */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5 shadow-2xl flex flex-col justify-between gap-3">
          {/* Map Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                {locale === "bn" ? "সক্রিয় জাতীয় হেলথকেয়ার গ্রিড" : "Live National Care Grid"}
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-cyan-950/75 border border-cyan-500/35 text-cyan-300 text-[10px] font-mono font-bold">
                {locale === "bn" ? "বাংলাদেশ আলোকিত" : "Only BD Illuminated"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
                <span>{locale === "bn" ? "মাউস জুম ও ড্র্যাগ" : "Mouse Zoom & Pan"}</span>
              </span>
              <button
                type="button"
                onClick={handleUseGps}
                className="min-h-9 px-2.5 rounded-lg bg-slate-900 hover:bg-teal-500 hover:text-slate-950 text-teal-300 border border-teal-500/40 text-xs font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>{locale === "bn" ? "নিকটতম GPS" : "Nearest GPS"}</span>
              </button>
              <button
                type="button"
                onClick={resetBdMap}
                className="min-h-9 px-2.5 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{locale === "bn" ? "সমগ্র বাংলাদেশ" : "Reset Map"}</span>
              </button>
            </div>
          </div>

          {gpsStatus ? (
            <div className="text-[11px] font-mono text-teal-300 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              <span>{gpsStatus}</span>
            </div>
          ) : null}

          {/* Leaflet Canvas Container */}
          <div
            className={`relative w-full ${
              compact ? "h-[410px] sm:h-[460px]" : "h-[470px] sm:h-[530px]"
            } rounded-2xl overflow-hidden border border-slate-800 shadow-inner`}
          >
            <div ref={mapContainerRef} id="bd-leaflet-map" className="w-full h-full z-10" />
          </div>

          {/* Map Footnote Banner */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
            <span className="inline-flex items-center gap-1.5 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {locale === "bn"
                ? "কোর হাব: ঢাকা, রাজশাহী, খুলনা + ৮ বিভাগীয় নেটওয়ার্ক"
                : "Core Hubs: Dhaka, Rajshahi, Khulna + 8-Division Network"}
            </span>
            <span className="text-emerald-400 font-bold">
              {filteredPoints.length} SQLite Facilities &amp; Doctors Shown
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Division Healthcare Inspector & Quick Fly Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Selected Division Card */}
          <div
            className={`rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-5 sm:p-6 shadow-xl transition-all space-y-4 ${
              flashCard ? "ring-2 ring-cyan-400" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                {locale === "bn" ? "নির্বাচিত বিভাগ পরিচিতি" : "Division Profile"}
              </span>
              <span className="px-2.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold">
                {locale === "bn" ? selectedHub.pilotBadgeBn : selectedHub.pilotBadgeEn}
              </span>
            </div>

            <div>
              <h4 className="text-xl sm:text-2xl font-extrabold text-white">
                {locale === "bn" ? selectedHub.titleBn : selectedHub.titleEn}
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5">
                {locale === "bn" ? selectedHub.descBn : selectedHub.descEn}
              </p>
            </div>

            {/* 4 Live Division KPI Boxes */}
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">
                  {locale === "bn" ? "SQLite কেন্দ্র ও ডাক্তার" : "Listed Nodes"}
                </div>
                <div className="text-lg font-bold text-cyan-400 mt-0.5">{divisionEntities.length}</div>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">
                  {locale === "bn" ? "উপলব্ধ স্লট" : "Open Slots"}
                </div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">{divisionOpenSlots}</div>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">
                  {locale === "bn" ? "কেন্দ্রীয় স্থানাঙ্ক" : "Centroid"}
                </div>
                <div className="text-xs font-bold text-indigo-300 mt-1">
                  {selectedHub.lat.toFixed(3)}°N, {selectedHub.lng.toFixed(3)}°E
                </div>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">
                  {gpsDistKm !== null ? "GPS Distance" : "OCR / Safety"}
                </div>
                <div className="text-sm font-bold text-teal-400 mt-0.5">
                  {gpsDistKm !== null ? `${gpsDistKm.toFixed(1)} km` : "Zero-PHI"}
                </div>
              </div>
            </div>

            {/* Real SQLite Facilities Inside This Division */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {divisionEntities.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {locale === "bn"
                    ? "এই বিভাগে এই ফিল্টারে কোনো সক্রিয় কেন্দ্র পাওয়া যায়নি — উপরে 'সকল' চাপুন।"
                    : "No nodes match the current category filter in this division."}
                </p>
              ) : (
                divisionEntities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-slate-950/75 border border-white/10 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.subtitle} • {item.address}
                      </div>
                    </div>
                    {item.doctorId ? (
                      <Link
                        to={`/doctors/${item.doctorId}`}
                        className="shrink-0 text-[11px] font-bold text-sky-300 hover:underline"
                      >
                        Book →
                      </Link>
                    ) : (
                      <span className="shrink-0 font-mono text-[10px] text-[#2dd4bf]">{item.district}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 8-Division Quick Select ("Click to Inspect & Fly Map") */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 space-y-2.5">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>{locale === "bn" ? "ক্লিক করে ম্যাপে ফ্লাই করুন:" : "Click to Inspect & Fly Map:"}</span>
              <span className="text-[10px] text-cyan-400 font-mono">8 DIVISIONS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 text-xs font-mono">
              {DIVISION_HUBS.map((hub) => {
                const active = selectedDivKey === hub.key;
                return (
                  <button
                    key={hub.key}
                    type="button"
                    onClick={() => selectDivision(hub.key, true)}
                    className={`min-h-10 px-2.5 py-1.5 rounded-lg border text-left truncate flex items-center gap-1.5 cursor-pointer transition-colors ${
                      active
                        ? "bg-sky-400/20 border-sky-400 text-sky-200 font-bold"
                        : hub.isPilot
                        ? "bg-amber-950/40 hover:bg-amber-950/70 border-amber-500/40 text-amber-200"
                        : "bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 border-slate-800 text-slate-300"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        hub.isPilot ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                    <span className="truncate">{hub.labelBn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom CTA Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-bold text-white">
                {locale === "bn"
                  ? "আপনার নিকটতম অনুমোদিত চিকিৎসক খুঁজতে চান?"
                  : "Ready to book an approved doctor in your division?"}
              </h5>
              <p className="text-[11px] text-slate-300">
                {locale === "bn"
                  ? "সারাদেশের সব বিভাগের যাচাইকৃত স্লট ও কেয়ার ম্যাপ উপলব্ধ।"
                  : "Real GeoJSON boundary + SQLite verified clinicians & 24h centers."}
              </p>
            </div>
            <Link
              to={compact ? "/care-map" : "/doctors"}
              className="min-h-10 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shrink-0 inline-flex items-center gap-1 transition-colors"
            >
              <span>{compact ? (locale === "bn" ? "পূর্ণ ম্যাপ" : "Full Atlas") : (locale === "bn" ? "ডাক্তার" : "Doctors")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
