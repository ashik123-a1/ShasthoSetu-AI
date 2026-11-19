import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Droplets,
  HeartHandshake,
  Hospital,
  LocateFixed,
  Lock,
  MapPin,
  Phone,
  PlusCircle,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Star,
  Unlock,
  UserPlus,
  XCircle,
} from "lucide-react";
import { apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { Skeleton } from "../components/ui";

const LazyAiModuleScene3D = lazy(() =>
  import("../components/three/AiModuleScene3D").then((m) => ({
    default: m.AiModuleScene3D,
  }))
);

const BLOOD_GROUPS = ["ALL", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const DONOR_HUBS = [
  { name: "DMCH (Dhaka)", division: "Dhaka", district: "Dhaka", lat: 23.7259, lng: 90.3976 },
  { name: "icddr,b Mohakhali (Dhaka)", division: "Dhaka", district: "Dhaka", lat: 23.7776, lng: 90.4004 },
  { name: "CMCH (Chattogram)", division: "Chattogram", district: "Chattogram", lat: 22.3596, lng: 91.8305 },
  { name: "RMCH (Rajshahi)", division: "Rajshahi", district: "Rajshahi", lat: 24.3718, lng: 88.5806 },
  { name: "Osmani Medical (Sylhet)", division: "Sylhet", district: "Sylhet", lat: 24.9016, lng: 91.8533 },
  { name: "KMCH (Khulna)", division: "Khulna", district: "Khulna", lat: 22.8286, lng: 89.5382 },
  { name: "SBMCH (Barishal)", division: "Barishal", district: "Barishal", lat: 22.6865, lng: 90.3612 },
  { name: "RpMCH (Rangpur)", division: "Rangpur", district: "Rangpur", lat: 25.7647, lng: 89.2336 },
  { name: "MMCH (Mymensingh)", division: "Mymensingh", district: "Mymensingh", lat: 24.7421, lng: 90.4094 },
];

interface BloodOverview {
  stats: {
    total_donors: number;
    available_donors: number;
    open_requests: number;
    verified_emergencies: number;
    confirmed_donations: number;
    divisions_covered: number;
  };
  policies: {
    eligibility_policy_en: string;
    eligibility_policy_bn: string;
    compatibility_disclaimer_en: string;
    compatibility_disclaimer_bn: string;
  };
}

interface PublicDonor {
  id: string;
  display_name: string;
  blood_group: string;
  donation_type: string;
  last_donation_date: string | null;
  days_since_last_donation: number | null;
  availability_status: string;
  division: string;
  district: string;
  area_name: string;
  lat: number;
  lng: number;
  distance_km: number | null;
  trust_score: number;
  verified_donations_count: number;
  no_show_count: number;
  contact_privacy: string;
}

interface BloodMatchItem {
  id: string;
  request_id: string;
  donor_id: string;
  donor_name: string;
  donor_blood_group: string;
  donor_district: string;
  donor_trust_score: number;
  verified_donations_count: number;
  response_status: string;
  consent_phone_shared: boolean;
  requester_confirmed: boolean;
  donor_confirmed: boolean;
  contact_phone: string | null;
  contact_privacy: string;
}

interface BloodRequestItem {
  id: string;
  patient_ref_label: string;
  blood_group: string;
  units_required: number;
  units_fulfilled: number;
  urgency_level: string;
  hospital_name: string;
  hospital_verified: boolean;
  division: string;
  district: string;
  lat: number;
  lng: number;
  search_radius_km: number;
  notes: string;
  status: string;
  is_owner: boolean;
  matches_count: number;
  accepted_count: number;
  matches: BloodMatchItem[];
  created_at_utc: string;
}

interface MyBloodProfile {
  donor_profile: {
    id: string;
    display_name: string;
    blood_group: string;
    donation_type: string;
    last_donation_date: string | null;
    days_since_last_donation: number | null;
    availability_status: string;
    division: string;
    district: string;
    area_name: string;
    lat: number;
    lng: number;
    contact_phone: string;
    trust_score: number;
    verified_donations_count: number;
  } | null;
  my_requests: BloodRequestItem[];
  incoming_matches: Array<{
    id: string;
    request_id: string;
    patient_ref_label: string;
    blood_group: string;
    units_required: number;
    urgency_level: string;
    hospital_name: string;
    hospital_verified: number;
    division: string;
    district: string;
    request_status: string;
    response_status: string;
    consent_phone_shared: number;
    notified_at_utc: string;
  }>;
}

export function BloodConnectPage() {
  const { locale } = useI18n();
  const { authenticated, user } = useAuth();

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [overview, setOverview] = useState<BloodOverview | null>(null);
  const [requests, setRequests] = useState<BloodRequestItem[]>([]);
  const [nearbyDonors, setNearbyDonors] = useState<PublicDonor[]>([]);
  const [myProfile, setMyProfile] = useState<MyBloodProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  // Filters & Nearby Matching Controls
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [includeCompat, setIncludeCompat] = useState(false);
  const [radiusKm, setRadiusKm] = useState<"5" | "10" | "20" | "50" | "all">("20");
  const [hubIdx, setHubIdx] = useState(0);
  const [customCenter, setCustomCenter] = useState<{ lat: number; lng: number } | null>(null);

  // New Blood Request Form
  const [showPostForm, setShowPostForm] = useState(false);
  const [reqLabel, setReqLabel] = useState("Ward Emergency Support");
  const [reqGroup, setReqGroup] = useState("O+");
  const [reqUnits, setReqUnits] = useState(1);
  const [reqUrgency, setReqUrgency] = useState<"EMERGENCY" | "URGENT" | "SCHEDULED">("EMERGENCY");
  const [reqHospital, setReqHospital] = useState("Dhaka Medical College Hospital (DMCH)");
  const [reqRadius, setReqRadius] = useState<5 | 10 | 20>(10);
  const [reqNotes, setReqNotes] = useState("Hospital blood bank cross-match sample ready.");

  // Donor Registration Form
  const [donName, setDonName] = useState(user?.full_name || "");
  const [donGroup, setDonGroup] = useState("O+");
  const [donType, setDonType] = useState<"WHOLE_BLOOD" | "PLATELETS" | "PLASMA">("WHOLE_BLOOD");
  const [donLastDate, setDonLastDate] = useState("");
  const [donAvail, setDonAvail] = useState<"AVAILABLE" | "PAUSED" | "RECENTLY_DONATED">("AVAILABLE");
  const [donHubIdx, setDonHubIdx] = useState(0);
  const [donArea, setDonArea] = useState("Shahbagh / University Zone");
  const [donPhone, setDonPhone] = useState("+8801711000999");
  const [donPolicyAck, setDonPolicyAck] = useState(true);

  // Consent Accept Modal State
  const [consentTargetReq, setConsentTargetReq] = useState<BloodRequestItem | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  // Nearby Notification Selection & Feedback Stars
  const [selectedDonorIds, setSelectedDonorIds] = useState<string[]>([]);
  const [notifyTargetReqId, setNotifyTargetReqId] = useState<string>("");
  const [ratingByMatch, setRatingByMatch] = useState<Record<string, number>>({});

  // Leaflet Radius Map Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const activeCenter = customCenter ?? { lat: DONOR_HUBS[hubIdx].lat, lng: DONOR_HUBS[hubIdx].lng };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const qsNearby = new URLSearchParams({
        lat: String(activeCenter.lat),
        lng: String(activeCenter.lng),
        radius_km: radiusKm,
        include_compatible: String(includeCompat),
        available_only: "false",
      });
      if (filterGroup !== "ALL") qsNearby.set("blood_group", filterGroup);

      const qsReq = new URLSearchParams({ status_filter: "ACTIVE" });
      if (filterGroup !== "ALL") qsReq.set("blood_group", filterGroup);

      const [ovRes, reqRes, nearbyRes] = await Promise.all([
        apiGet<BloodOverview>("/v1/blood/overview"),
        apiGet<{ requests: BloodRequestItem[] }>(`/v1/blood/requests?${qsReq.toString()}`),
        apiGet<{ donors: PublicDonor[] }>(`/v1/blood/donors/nearby?${qsNearby.toString()}`),
      ]);
      setOverview(ovRes);
      setRequests(reqRes.requests || []);
      setNearbyDonors(nearbyRes.donors || []);

      if (authenticated) {
        try {
          const prof = await apiGet<MyBloodProfile>("/v1/blood/my-profile");
          setMyProfile(prof);
          if (prof.donor_profile) {
            setDonName(prof.donor_profile.display_name);
            setDonGroup(prof.donor_profile.blood_group);
            setDonAvail(prof.donor_profile.availability_status as typeof donAvail);
            setDonType(prof.donor_profile.donation_type as typeof donType);
            setDonLastDate(prof.donor_profile.last_donation_date || "");
            setDonArea(prof.donor_profile.area_name || "");
            setDonPhone(prof.donor_profile.contact_phone || "");
          } else if (user?.full_name && !donName) {
            setDonName(user.full_name);
          }
        } catch {
          setMyProfile(null);
        }
      } else {
        setMyProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGroup, includeCompat, radiusKm, hubIdx, customCenter, authenticated]);

  // Mount & update Leaflet radius map for continuous vertical Section 02
  useEffect(() => {
    if ((loading && !overview) || !mapRef.current) return;

    if (!leafletRef.current) {
      const map = L.map(mapRef.current, {
        center: [activeCenter.lat, activeCenter.lng],
        zoom: radiusKm === "5" ? 13 : radiusKm === "10" ? 12 : radiusKm === "20" ? 11 : 7,
        attributionControl: false,
      });
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      ).addTo(map);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16, opacity: 0.85 }
      ).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);
      leafletRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 120);
    }

    const map = leafletRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;
    lg.clearLayers();

    const targetZoom = radiusKm === "5" ? 13 : radiusKm === "10" ? 12 : radiusKm === "20" ? 11 : radiusKm === "50" ? 9 : 7;
    map.setView([activeCenter.lat, activeCenter.lng], targetZoom);

    if (radiusKm !== "all") {
      L.circle([activeCenter.lat, activeCenter.lng], {
        radius: Number(radiusKm) * 1000,
        color: "#fb7185",
        weight: 2,
        fillColor: "#f43f5e",
        fillOpacity: 0.14,
      }).addTo(lg);
    }

    const centerIcon = L.divIcon({
      className: "blood-center-pin",
      html: `<div style="width:16px;height:16px;border-radius:999px;background:#38bdf8;border:3px solid #fff;box-shadow:0 0 12px #38bdf8;"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([activeCenter.lat, activeCenter.lng], { icon: centerIcon })
      .bindPopup(`<b>Hospital / Target Anchor</b><br/>${DONOR_HUBS[hubIdx].name}`)
      .addTo(lg);

    nearbyDonors.forEach((d) => {
      const color = d.availability_status === "AVAILABLE" ? "#f43f5e" : "#94a3b8";
      const dIcon = L.divIcon({
        className: "blood-donor-pin",
        html: `<div style="padding:2px 6px;border-radius:999px;background:${color};color:#fff;font:700 10px monospace;border:1.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45);white-space:nowrap;">${d.blood_group}</div>`,
        iconSize: [34, 22],
        iconAnchor: [17, 11],
      });
      L.marker([d.lat, d.lng], { icon: dIcon })
        .bindPopup(
          `<div style="font-size:12px;"><b>${d.display_name}</b> (${d.blood_group})<br/>${d.area_name}, ${d.district}<br/>Dist: <b>${d.distance_km ?? "?"} km</b> • Phone: <i>Hidden until consent</i></div>`
        )
        .addTo(lg);
    });
  }, [loading, Boolean(overview), activeCenter.lat, activeCenter.lng, radiusKm, nearbyDonors, hubIdx]);

  useEffect(() => {
    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBannerMsg({ tone: "ok", text: "GPS coordinates anchored for radius donor search." });
      },
      () => setBannerMsg({ tone: "err", text: "GPS unavailable; using selected hospital hub coordinates." })
    );
  };

  const handleSaveDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    const hub = DONOR_HUBS[donHubIdx];
    try {
      await apiPost("/v1/blood/donors/register", {
        display_name: donName,
        blood_group: donGroup,
        donation_type: donType,
        last_donation_date: donLastDate || null,
        availability_status: donAvail,
        division: hub.division,
        district: hub.district,
        area_name: donArea,
        lat: hub.lat + 0.008,
        lng: hub.lng - 0.006,
        contact_phone: donPhone,
        screening_policy_acknowledged: donPolicyAck,
      });
      setBannerMsg({ tone: "ok", text: "Donor profile saved cleanly! Phone remains masked until you explicitly accept a request." });
      await loadAllData();
    } catch (err) {
      setBannerMsg({ tone: "err", text: err instanceof Error ? err.message : "Failed to save donor profile." });
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const hub = DONOR_HUBS[hubIdx];
    try {
      const res = await apiPost<{ notified_donors_count: number }>("/v1/blood/requests", {
        patient_ref_label: reqLabel,
        blood_group: reqGroup,
        units_required: reqUnits,
        urgency_level: reqUrgency,
        hospital_name: reqHospital,
        division: hub.division,
        district: hub.district,
        lat: activeCenter.lat,
        lng: activeCenter.lng,
        search_radius_km: reqRadius,
        notes: reqNotes,
        auto_notify_nearby: true,
      });
      setBannerMsg({
        tone: "ok",
        text: `Blood request posted (${reqGroup}). Notified ${res.notified_donors_count} nearby matching donor(s).`,
      });
      setShowPostForm(false);
      await loadAllData();
    } catch (err) {
      setBannerMsg({ tone: "err", text: err instanceof Error ? err.message : "Failed to post request." });
    }
  };

  const handleConfirmConsentAccept = async () => {
    if (!consentTargetReq || !consentChecked) return;
    try {
      await apiPost(`/v1/blood/requests/${consentTargetReq.id}/respond`, {
        decision: "ACCEPTED",
        consent_phone_shared: true,
      });
      setBannerMsg({
        tone: "ok",
        text: `Accepted request for ${consentTargetReq.hospital_name} and consented to reveal phone to requester until closed.`,
      });
      setConsentTargetReq(null);
      setConsentChecked(false);
      scrollToSection("bc-tracking");
      await loadAllData();
    } catch (err) {
      setBannerMsg({ tone: "err", text: err instanceof Error ? err.message : "Register a donor profile first to accept requests." });
    }
  };

  const handleNotifySelected = async () => {
    if (!notifyTargetReqId || selectedDonorIds.length === 0) return;
    try {
      const res = await apiPost<{ newly_notified: number }>(`/v1/blood/requests/${notifyTargetReqId}/notify-donors`, {
        donor_ids: selectedDonorIds.slice(0, 10),
      });
      setBannerMsg({ tone: "ok", text: `Dispatched ${res.newly_notified} donor match notifications (anti-spam max 10).` });
      setSelectedDonorIds([]);
      await loadAllData();
    } catch (err) {
      setBannerMsg({ tone: "err", text: err instanceof Error ? err.message : "Failed to dispatch notifications." });
    }
  };

  const handleConfirmDonation = async (matchId: string, action: "CONFIRM_COMPLETED" | "MARK_NO_SHOW") => {
    try {
      const res = await apiPost<{ request_status: string; contact_revoked_if_closed: boolean }>(
        `/v1/blood/matches/${matchId}/confirm`,
        {
          action,
          feedback_rating: ratingByMatch[matchId] || 5,
          feedback_note: action === "CONFIRM_COMPLETED" ? "Confirmed via Blood Connect tracker" : "Reported no-show",
        }
      );
      setBannerMsg({
        tone: "ok",
        text:
          action === "CONFIRM_COMPLETED"
            ? `Donation confirmed! Request status: ${res.request_status}. ${res.contact_revoked_if_closed ? "Phone access auto-revoked." : ""}`
            : "No-show accountability recorded.",
      });
      await loadAllData();
    } catch (err) {
      setBannerMsg({ tone: "err", text: err instanceof Error ? err.message : "Confirmation action failed." });
    }
  };

  const handleToggleHospitalVerify = async (reqId: string) => {
    try {
      await apiPatch(`/v1/blood/requests/${reqId}/verify-emergency`, {});
      await loadAllData();
    } catch (err) {
      setBannerMsg({ tone: "err", text: err instanceof Error ? err.message : "Verification requires Doctor/Admin." });
    }
  };

  const handleCloseRequest = async (reqId: string) => {
    try {
      await apiPatch(`/v1/blood/requests/${reqId}/close`, {});
      setBannerMsg({ tone: "ok", text: "Request closed; any unlocked phone numbers have been automatically revoked." });
      await loadAllData();
    } catch (err) {
      setBannerMsg({ tone: "err", text: err instanceof Error ? err.message : "Failed to close request." });
    }
  };

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="blood-connect-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-blood-connect.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-12 flex-1">
        {/* Top Hero & Clinical Safeguard Banner */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5 border-rose-500/35">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-rose-400">
                <Droplets className="w-4 h-4" /> BLOOD CONNECT • GEO-PROXIMITY DONOR COORDINATION &amp; PRIVACY
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {locale === "bn" ? (
                  <>
                    স্বাস্থ্যসেতু{" "}
                    <span className="bg-gradient-to-r from-rose-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
                      ব্লাড কানেক্ট (Blood Connect)
                    </span>
                  </>
                ) : (
                  <>
                    ShasthoSetu{" "}
                    <span className="bg-gradient-to-r from-rose-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
                      Blood Connect Engine
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? "৫/১০/২০ কিমি জিও-রেডিয়াস ম্যাচিং, কনসেন্ট ছাড়া ফোন নম্বর লুকানো, হাসপাতাল-যাচাইকৃত জরুরি ব্যাজ ও ডোনেশন ট্র্যাকিং।"
                  : "Real-time 5 / 10 / 20 km proximity donor matching with strict masked contact sharing, hospital-verified emergency requests, and dual confirmation accountability."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
              <Suspense fallback={<div className="w-full sm:w-56 h-40 rounded-2xl bg-[#030916]/80 border border-sky-400/25" />}>
                <LazyAiModuleScene3D
                  moduleKey="pcos-clinical"
                  customBadge="WEBGL NEURAL STAGE • BLOOD CONNECT"
                  className="w-full sm:w-56 h-40 shrink-0"
                />
              </Suspense>

              {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                  <div className="rounded-2xl bg-[#040a18]/85 border border-rose-500/30 px-3.5 py-2.5 text-center">
                    <div className="text-xl font-bold font-mono text-rose-400">{overview.stats.available_donors}</div>
                    <div className="text-[10px] text-slate-300">Available Donors</div>
                  </div>
                  <div className="rounded-2xl bg-[#040a18]/85 border border-amber-400/30 px-3.5 py-2.5 text-center">
                    <div className="text-xl font-bold font-mono text-[#f2c879]">{overview.stats.open_requests}</div>
                    <div className="text-[10px] text-slate-300">Active Requests</div>
                  </div>
                  <div className="rounded-2xl bg-[#040a18]/85 border border-emerald-400/30 px-3.5 py-2.5 text-center">
                    <div className="text-xl font-bold font-mono text-emerald-300">{overview.stats.verified_emergencies}</div>
                    <div className="text-[10px] text-slate-300">Hospital Verified</div>
                  </div>
                  <div className="rounded-2xl bg-[#040a18]/85 border border-sky-400/30 px-3.5 py-2.5 text-center">
                    <div className="text-xl font-bold font-mono text-sky-300">{overview.stats.divisions_covered}</div>
                    <div className="text-[10px] text-slate-300">Divisions</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Non-Dismissible Medical Screening & Compatibility Disclaimer (Critical Refinement) */}
          <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-100">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>
                <strong>Clinical Eligibility Policy:</strong>{" "}
                {locale === "bn"
                  ? overview?.policies.eligibility_policy_bn ||
                    "কোনো স্থায়ী ৯০-দিনের নিয়ম দ্বারা মেডিকেল যোগ্যতা নির্ধারণ করা হয় না; স্থানীয় ব্লাড ব্যাংক নীতি ও সরাসরি স্ক্রিনিং চূড়ান্ত।"
                  : overview?.policies.eligibility_policy_en ||
                    "No fixed 90-day medical cutoff is enforced. Screening follows local blood-bank policy, component type & clinical exam."}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <span>
                <strong>Transfusion Safety Notice:</strong>{" "}
                {locale === "bn"
                  ? overview?.policies.compatibility_disclaimer_bn ||
                    "ব্লাড গ্রুপ ম্যাচিং কেবল সমন্বয়ের জন্য; হাসপাতালের ল্যাব ক্রস-ম্যাচিং ছাড়া ট্রান্সফিউশন অনুমোদিত নয়।"
                  : overview?.policies.compatibility_disclaimer_en ||
                    "Blood-group matching coordinates donors only; it does NOT certify transfusion compatibility or safety without hospital cross-matching."}
              </span>
            </div>
          </div>

          {/* 4 Workflow Smooth-Scroll Jump Pills (Scroll down to see all 4 sections sequentially) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["bc-requests", locale === "bn" ? "১. জরুরি রক্ত খুঁজুন" : "1. Find Blood Requests"],
                  ["bc-map", locale === "bn" ? "২. ৫/১০/২০ কিমি ম্যাপ ম্যাচিং" : "2. Nearby Radius Map"],
                  ["bc-donor", locale === "bn" ? "৩. রক্তদাতা নিবন্ধন" : "3. Become a Donor"],
                  ["bc-tracking", locale === "bn" ? "৪. কনসেন্ট ও ট্র্যাকিং" : "4. Consent & Tracking"],
                ] as const
              ).map(([targetId, label], idx) => (
                <button
                  key={targetId}
                  type="button"
                  onClick={() => scrollToSection(targetId)}
                  className={`min-h-11 px-4 rounded-full text-xs font-bold cursor-pointer transition ${
                    idx === 0
                      ? "bg-gradient-to-r from-rose-500 to-sky-400 text-slate-950 shadow"
                      : "bg-white/10 hover:bg-gradient-to-r hover:from-rose-500/80 hover:to-sky-400/80 hover:text-slate-950 text-slate-100 border border-white/15"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {!authenticated && (
              <Link
                to="/login?redirect=/blood-connect"
                className="min-h-10 px-4 rounded-full border border-sky-400/40 bg-sky-400/15 text-sky-200 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Sign In to Register / Respond
              </Link>
            )}
          </div>
        </section>

        {bannerMsg && (
          <div
            className={`rounded-2xl p-4 text-xs flex items-center justify-between gap-2 border ${
              bannerMsg.tone === "ok"
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100"
                : "bg-rose-500/15 border-rose-400/40 text-rose-100"
            }`}
          >
            <span>{bannerMsg.text}</span>
            <button type="button" onClick={() => setBannerMsg(null)} className="font-mono text-xs opacity-80 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {loading && !overview ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {/* SECTION 01 · FIND BLOOD REQUESTS + BLOOD GROUP FILTER */}
            <section id="bc-requests" className="scroll-mt-28 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setFilterGroup(bg)}
                    className={`min-h-10 px-3.5 rounded-full text-xs font-mono font-bold cursor-pointer border transition ${
                      filterGroup === bg
                        ? "bg-rose-500 text-white border-transparent shadow"
                        : "bg-[#040a18]/80 border-white/15 text-slate-300 hover:border-rose-400/50"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-rose-400">
                    01 • FIND BLOOD REQUESTS
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Radio className="w-5 h-5 text-rose-400" />
                    {locale === "bn" ? "সক্রিয় জরুরি রক্তের অনুরোধ" : "Live Active Blood Requests"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPostForm((v) => !v)}
                  className="min-h-11 px-5 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Post Emergency Blood Request
                </button>
              </div>

            {showPostForm && (
              <form onSubmit={(e) => void handleCreateRequest(e)} className="ss-sapphire-card rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {!authenticated && (
                  <div className="md:col-span-3 text-xs text-amber-200 bg-amber-500/15 border border-amber-400/35 p-3 rounded-xl">
                    Sign in first (<Link to="/login?redirect=/blood-connect" className="underline font-bold">Demo Patient / Doctor Login</Link>) to submit a request.
                  </div>
                )}
                <label className="space-y-1 text-xs">
                  <span>Patient Reference Label</span>
                  <input required value={reqLabel} onChange={(e) => setReqLabel(e.target.value)} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
                </label>
                <label className="space-y-1 text-xs">
                  <span>Needed Blood Group</span>
                  <select value={reqGroup} onChange={(e) => setReqGroup(e.target.value)} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                    {BLOOD_GROUPS.filter((g) => g !== "ALL").map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span>Urgency Level</span>
                  <select value={reqUrgency} onChange={(e) => setReqUrgency(e.target.value as typeof reqUrgency)} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                    <option value="EMERGENCY">EMERGENCY</option>
                    <option value="URGENT">URGENT</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span>Hospital / Clinic Name</span>
                  <input required value={reqHospital} onChange={(e) => setReqHospital(e.target.value)} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
                </label>
                <label className="space-y-1 text-xs">
                  <span>Hospital Anchor Hub (Division)</span>
                  <select value={hubIdx} onChange={(e) => setHubIdx(Number(e.target.value))} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                    {DONOR_HUBS.map((h, i) => <option key={h.name} value={i}>{h.name}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs">
                    <span>Units (Bags)</span>
                    <input type="number" min={1} max={10} value={reqUnits} onChange={(e) => setReqUnits(Number(e.target.value))} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span>Radius (km)</span>
                    <select value={reqRadius} onChange={(e) => setReqRadius(Number(e.target.value) as 5 | 10 | 20)} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={20}>20 km</option>
                    </select>
                  </label>
                </div>
                <label className="md:col-span-2 space-y-1 text-xs">
                  <span>Clinical Cross-Match / Ward Note</span>
                  <input value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
                </label>
                <div className="flex items-end">
                  <button type="submit" disabled={!authenticated} className="w-full min-h-11 rounded-xl bg-gradient-to-r from-rose-500 to-sky-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40">
                    Submit Request &amp; Auto-Match
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {requests.map((r) => (
                <article key={r.id} className="ss-sapphire-card rounded-3xl p-6 space-y-4 border-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center font-mono text-lg font-extrabold text-rose-300">
                        {r.blood_group}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-base text-white">{r.patient_ref_label}</span>
                          {r.hospital_verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold">
                              <BadgeCheck className="w-3 h-3" /> VERIFIED EMERGENCY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sky-300 font-medium flex items-center gap-1 mt-0.5">
                          <Hospital className="w-3.5 h-3.5" /> {r.hospital_name} • {r.district}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
                        r.urgency_level === "EMERGENCY"
                          ? "bg-rose-500/25 text-rose-200 border border-rose-400/50"
                          : "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                      }`}
                    >
                      {r.urgency_level} • {r.units_fulfilled}/{r.units_required} Bags
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{r.notes}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                    <span className="text-[11px] font-mono text-slate-400">
                      Radius: {r.search_radius_km} km • Accepted: {r.accepted_count} • Status: {r.status}
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {!r.is_owner && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!authenticated) {
                              setBannerMsg({ tone: "err", text: "Please sign in first to accept & consent sharing your contact." });
                              return;
                            }
                            setConsentTargetReq(r);
                          }}
                          className="min-h-10 px-4 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Accept Request
                        </button>
                      )}
                      {authenticated && (user?.primary_role === "DOCTOR" || user?.primary_role === "ADMIN") && (
                        <button
                          type="button"
                          onClick={() => void handleToggleHospitalVerify(r.id)}
                          className="min-h-10 px-3 rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-[11px] font-semibold cursor-pointer"
                        >
                          {r.hospital_verified ? "Unverify Badge" : "Verify Emergency"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            </section>

            {/* SECTION 02 · 5 / 10 / 20 KM NEARBY RADIUS MAP & MATCHING */}
            <section id="bc-map" className="scroll-mt-28 space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#38bdf8]">
                    02 • 5 / 10 / 20 KM NEARBY RADIUS MAP &amp; MATCHING
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {locale === "bn" ? "কাছাকাছি রক্তদাতা ও হাসপাতাল রেডিয়াস ম্যাপ" : "Proximity Radius Donor Map & Matching"}
                  </h2>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={includeCompat} onChange={(e) => setIncludeCompat(e.target.checked)} />
                  <span>Include coordination group notes (non-diagnostic)</span>
                </label>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 ss-sapphire-card rounded-3xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(["5", "10", "20", "50", "all"] as const).map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setRadiusKm(km)}
                      className={`min-h-9 px-3 rounded-full text-xs font-mono font-bold cursor-pointer border transition ${
                        radiusKm === km
                          ? "bg-rose-500 text-white border-transparent"
                          : "bg-black/35 border-white/15 text-slate-300"
                      }`}
                    >
                      {km === "all" ? "All BD" : `${km} km`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={hubIdx}
                    onChange={(e) => {
                      setCustomCenter(null);
                      setHubIdx(Number(e.target.value));
                    }}
                    className="min-h-9 rounded-full bg-[#040a18] border border-white/20 px-3 text-xs text-white"
                  >
                    {DONOR_HUBS.map((h, idx) => (
                      <option key={h.name} value={idx}>{h.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleUseGps}
                    className="min-h-9 px-3 rounded-full bg-sky-400/20 border border-sky-400/40 text-sky-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5" /> GPS
                  </button>
                </div>
              </div>

              <div data-no-tilt="true" className="w-full h-[400px] rounded-2xl overflow-hidden border border-white/15 bg-[#040a18]">
                <div ref={mapRef} className="w-full h-full" />
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Privacy Guarantee: All donor pins hide exact street phone numbers until the donor explicitly accepts a request.
              </p>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="ss-sapphire-card rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base">Nearby Matching Donors ({nearbyDonors.length})</h2>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-200">
                    PHONE MASKED
                  </span>
                </div>

                {authenticated && requests.some((r) => r.is_owner) && (
                  <div className="rounded-xl bg-black/35 border border-white/10 p-3 space-y-2">
                    <div className="text-[11px] font-mono text-sky-300">Send Request Alert (Max 10 Donors):</div>
                    <div className="flex gap-2">
                      <select
                        value={notifyTargetReqId}
                        onChange={(e) => setNotifyTargetReqId(e.target.value)}
                        className="flex-1 min-h-9 rounded-lg bg-[#040a18] border border-white/15 px-2 text-xs text-white"
                      >
                        <option value="">Select my active request...</option>
                        {requests.filter((r) => r.is_owner).map((r) => (
                          <option key={r.id} value={r.id}>[{r.blood_group}] {r.hospital_name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleNotifySelected()}
                        disabled={!notifyTargetReqId || selectedDonorIds.length === 0}
                        className="min-h-9 px-3 rounded-lg bg-rose-500 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                      >
                        Notify ({selectedDonorIds.length})
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {nearbyDonors.map((d) => {
                    const checked = selectedDonorIds.includes(d.id);
                    return (
                      <div key={d.id} className="rounded-2xl bg-[#040a18]/80 border border-white/10 p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedDonorIds((prev) =>
                                  checked ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                                )
                              }
                            />
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-xs font-bold">
                              {d.blood_group}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-white">{d.display_name}</div>
                              <div className="text-[11px] text-slate-400">
                                <MapPin className="w-3 h-3 inline mr-0.5" /> {d.area_name}, {d.district}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-sky-300">{d.distance_km ?? "—"} km</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
                          <span>Status: {d.availability_status} • {d.donation_type}</span>
                          <span>
                            {d.days_since_last_donation !== null ? `Last: ${d.days_since_last_donation}d ago` : "First/Unrecorded date"}
                          </span>
                          <span className="text-amber-300 inline-flex items-center gap-0.5">
                            <Star className="w-3 h-3" /> {d.trust_score} ({d.verified_donations_count} donations)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
              </div>
            </section>

            {/* SECTION 03 · BECOME A REGISTERED DONOR */}
            <section id="bc-donor" className="scroll-mt-28 ss-sapphire-card rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto space-y-5">
              <div className="space-y-1">
                <span className="font-mono text-xs text-rose-400 inline-flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> 03 • VOLUNTARY DONOR REGISTRY (DATA INTAKE)
                </span>
              <h2 className="text-2xl font-bold">
                {locale === "bn" ? "রক্তদাতা হিসেবে নিবন্ধন / তথ্য হালনাগাদ" : "Register or Update Your Voluntary Donor Profile"}
              </h2>
            </div>

            {!authenticated && (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/15 p-4 text-xs text-amber-100">
                Sign in with your account (<Link to="/login?redirect=/blood-connect" className="underline font-bold">Login here</Link>) to save your donor profile securely to SQLite.
              </div>
            )}

            <form onSubmit={(e) => void handleSaveDonor(e)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 text-xs">
                <span>Full Display Name</span>
                <input required value={donName} onChange={(e) => setDonName(e.target.value)} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
              </label>
              <label className="space-y-1 text-xs">
                <span>Blood Group</span>
                <select value={donGroup} onChange={(e) => setDonGroup(e.target.value)} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                  {BLOOD_GROUPS.filter((g) => g !== "ALL").map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs">
                <span>Donation Component Type</span>
                <select value={donType} onChange={(e) => setDonType(e.target.value as typeof donType)} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                  <option value="WHOLE_BLOOD">Whole Blood</option>
                  <option value="PLATELETS">Platelets (Apheresis)</option>
                  <option value="PLASMA">Plasma</option>
                </select>
              </label>
              <label className="space-y-1 text-xs">
                <span>Self-Reported Availability</span>
                <select value={donAvail} onChange={(e) => setDonAvail(e.target.value as typeof donAvail)} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="RECENTLY_DONATED">RECENTLY_DONATED</option>
                </select>
              </label>
              <label className="space-y-1 text-xs">
                <span>Last Donation Date (Optional Metadata)</span>
                <input type="date" value={donLastDate} onChange={(e) => setDonLastDate(e.target.value)} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
              </label>
              <label className="space-y-1 text-xs">
                <span>Protected Phone (Hidden Until Consent)</span>
                <input required value={donPhone} onChange={(e) => setDonPhone(e.target.value)} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
              </label>
              <label className="space-y-1 text-xs">
                <span>Primary Hub / District</span>
                <select value={donHubIdx} onChange={(e) => setDonHubIdx(Number(e.target.value))} className="w-full min-h-11 rounded-xl bg-[#071022] border border-white/15 px-3 text-white">
                  {DONOR_HUBS.map((h, i) => <option key={h.name} value={i}>{h.division} — {h.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs">
                <span>Local Neighborhood / Area</span>
                <input value={donArea} onChange={(e) => setDonArea(e.target.value)} className="w-full min-h-11 rounded-xl bg-black/40 border border-white/15 px-3 text-white" />
              </label>

              <label className="md:col-span-2 flex items-start gap-2.5 text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-white/10 cursor-pointer">
                <input type="checkbox" checked={donPolicyAck} onChange={(e) => setDonPolicyAck(e.target.checked)} className="mt-0.5" />
                <span>
                  I understand ShasthoSetu records last-donation dates solely for transparency and does NOT certify medical eligibility or transfusion safety; final donor screening happens at the blood bank.
                </span>
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={!authenticated}
                  className="min-h-12 px-6 rounded-full bg-gradient-to-r from-rose-500 to-sky-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-40"
                >
                  Save Donor Profile Securely
                </button>
              </div>
            </form>
            </section>

            {/* SECTION 04 · CONSENT-GATED CONTACT ACCESS & TRACKING */}
            <section id="bc-tracking" className="scroll-mt-28 space-y-6">
              <div className="space-y-1">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#2dd4bf]">
                  04 • CONSENT-GATED CONTACT ACCESS &amp; TRACKING
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  {locale === "bn" ? "কনসেন্ট-নিয়ন্ত্রিত যোগাযোগ ও রক্তদান ট্র্যাকার" : "Consent Contact Access & Donation Confirmation Tracker"}
                </h2>
              </div>
            {!authenticated ? (
              <div className="ss-sapphire-card rounded-3xl p-8 text-center space-y-4">
                <Lock className="w-10 h-10 mx-auto text-sky-400" />
                <h2 className="text-xl font-bold">Sign In to Manage Private Consent &amp; Donation Confirmations</h2>
                <Link to="/login?redirect=/blood-connect" className="min-h-11 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center">
                  Sign In Now →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Requester View: Manage Active Requests & Consented Donors */}
                <div className="lg:col-span-7 space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-sky-400" />
                    Requests &amp; Consent Contact Access ({requests.filter((r) => r.is_owner || user?.primary_role === "ADMIN").length})
                  </h2>

                  {requests
                    .filter((r) => r.is_owner || user?.primary_role === "ADMIN")
                    .map((req) => (
                      <div key={req.id} className="ss-sapphire-card rounded-3xl p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs text-rose-300 font-bold">[{req.blood_group}]</span>{" "}
                            <span className="font-bold text-base">{req.hospital_name}</span>
                            <div className="text-xs text-slate-400">{req.patient_ref_label} • Status: {req.status}</div>
                          </div>
                          {req.status !== "CANCELLED" && req.status !== "FULFILLED" && (
                            <button
                              type="button"
                              onClick={() => void handleCloseRequest(req.id)}
                              className="min-h-9 px-3 rounded-full bg-white/10 hover:bg-rose-500/20 text-xs text-slate-200 cursor-pointer"
                            >
                              Close &amp; Revoke Phones
                            </button>
                          )}
                        </div>

                        {req.matches.length === 0 ? (
                          <p className="text-xs text-slate-400">No donor match logs yet for this request.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {req.matches.map((m) => (
                              <div key={m.id} className="rounded-2xl bg-black/35 border border-white/10 p-3.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <span className="text-sm font-bold text-white">{m.donor_name}</span>{" "}
                                    <span className="text-xs font-mono text-sky-300">({m.donor_blood_group})</span>
                                  </div>
                                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-sky-400/15 text-sky-200 border border-sky-400/30">
                                    {m.response_status}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  {m.contact_phone ? (
                                    <span className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-300">
                                      <Unlock className="w-3.5 h-3.5" /> <Phone className="w-3.5 h-3.5" /> {m.contact_phone}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 font-mono text-slate-400">
                                      <Lock className="w-3.5 h-3.5" /> {m.contact_privacy}
                                    </span>
                                  )}

                                  {m.response_status === "ACCEPTED" && (
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={ratingByMatch[m.id] ?? 5}
                                        onChange={(e) => setRatingByMatch((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))}
                                        className="rounded-lg bg-[#071022] border border-white/15 px-2 py-1 text-[11px]"
                                      >
                                        <option value={5}>5★ Trust</option>
                                        <option value={4}>4★ Trust</option>
                                        <option value={3}>3★ Trust</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => void handleConfirmDonation(m.id, "CONFIRM_COMPLETED")}
                                        className="min-h-9 px-3 rounded-full bg-emerald-500 text-slate-950 font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Donation
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleConfirmDonation(m.id, "MARK_NO_SHOW")}
                                        className="min-h-9 px-2.5 rounded-full border border-rose-400/35 text-rose-300 text-[11px] cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <XCircle className="w-3.5 h-3.5" /> No-Show
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Donor Inbox View: My Alerts & Donor-Side Confirmation */}
                <div className="lg:col-span-5 space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-rose-400" />
                    My Donor Inbox &amp; Trust Score
                  </h2>

                  {myProfile?.donor_profile && (
                    <div className="ss-sapphire-card rounded-3xl p-5 space-y-2 border-emerald-400/30">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{myProfile.donor_profile.display_name}</span>
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200">
                          {myProfile.donor_profile.blood_group}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-mono">
                        Trust: ★ {myProfile.donor_profile.trust_score} • Verified Donations: {myProfile.donor_profile.verified_donations_count}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Last Date: {myProfile.donor_profile.last_donation_date || "None recorded"} • {myProfile.donor_profile.availability_status}
                      </div>
                    </div>
                  )}

                  {(myProfile?.incoming_matches || []).map((m) => (
                    <div key={m.id} className="ss-sapphire-card rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">[{m.blood_group}] {m.hospital_name}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-sky-400/15 text-sky-300">{m.response_status}</span>
                      </div>
                      <p className="text-xs text-slate-400">{m.patient_ref_label} • {m.district}</p>
                      {m.response_status === "ACCEPTED" && m.request_status !== "FULFILLED" && (
                        <button
                          type="button"
                          onClick={() => void handleConfirmDonation(m.id, "CONFIRM_COMPLETED")}
                          className="min-h-9 px-3.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Donor Confirm Donation Completed
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </section>
          </>
        )}

        {/* Explicit Two-Way Consent Modal before revealing phone */}
        {consentTargetReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md ss-sapphire-card rounded-3xl p-6 space-y-4 border-rose-400/40">
              <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-bold">
                <ShieldCheck className="w-4 h-4" /> TWO-WAY CONTACT PRIVACY CONSENT
              </div>
              <h3 className="text-lg font-bold text-white">
                Accept [{consentTargetReq.blood_group}] Request at {consentTargetReq.hospital_name}?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                By accepting, you explicitly consent to share your protected contact number with the requester while this request stays open. Access auto-revokes once fulfilled or closed.
              </p>
              <label className="flex items-start gap-2 text-xs text-white bg-black/40 p-3 rounded-xl border border-white/15 cursor-pointer">
                <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5" />
                <span>I explicitly consent to reveal my donor phone number for this coordination request.</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConsentTargetReq(null);
                    setConsentChecked(false);
                  }}
                  className="min-h-10 px-4 rounded-full border border-white/20 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!consentChecked}
                  onClick={() => void handleConfirmConsentAccept()}
                  className="min-h-10 px-5 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40"
                >
                  Confirm Accept &amp; Share Phone
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
