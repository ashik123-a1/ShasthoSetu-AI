import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarCheck, Clock, MapPin, Search, Stethoscope } from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { formatBdtFromPoisha, formatDhakaDateTime } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { EmptyState, Skeleton, TrustBadge } from "../components/ui";

interface DoctorCard {
  id: string;
  display_name: string;
  display_name_bn?: string;
  degrees: string;
  specialty: string;
  bmdc_demo_reg?: string;
  practice_location: string;
  district: string;
  experience_years: number;
  languages_csv: string;
  symptom_tags_csv: string;
  consultation_modality: string;
  is_online_now: number;
  bio?: string;
  bio_bn?: string;
  consultation_fee_minor_poisha: number;
  followup_fee_minor_poisha: number;
  open_slots_count?: number;
}

interface OpenSlot {
  id: string;
  start_utc: string;
  end_utc: string;
  modality: string;
  capacity: number;
  reserved_count: number;
  state: string;
}

export function PublicDoctorsPage() {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const { locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [specialty, setSpecialty] = useState(searchParams.get("specialty") || "");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DoctorCard | null>(null);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        if (doctorId) {
          const res = await apiGet<{ doctor: DoctorCard; open_slots: OpenSlot[] }>(`/v1/public/doctors/${doctorId}`);
          if (active) {
            setSelectedDoc(res.doctor);
            setOpenSlots(res.open_slots || []);
          }
        } else {
          const qs = new URLSearchParams();
          if (q.trim()) qs.set("q", q.trim());
          if (specialty.trim()) qs.set("specialty", specialty.trim());
          if (onlineOnly) qs.set("online_only", "true");
          const res = await apiGet<{ doctors: DoctorCard[] }>(`/v1/public/doctors?${qs.toString()}`);
          if (active) setDoctors(res.doctors || []);
        }
      } catch {
        if (active) {
          setDoctors([]);
          setSelectedDoc(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [doctorId, q, specialty, onlineOnly]);

  const handleBookSlot = (slotId: string) => {
    if (!user || user.primary_role !== "PATIENT") {
      navigate(`/login?redirect=${encodeURIComponent(`/patient/doctors?doctorId=${selectedDoc?.id}&slotId=${slotId}`)}`);
      return;
    }
    navigate(`/patient/doctors?doctorId=${selectedDoc?.id}&slotId=${slotId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24">
      <PublicFloatingHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
        {doctorId ? (
          loading ? (
            <Skeleton className="h-64 w-full" />
          ) : !selectedDoc ? (
            <EmptyState
              title={locale === "bn" ? "চিকিৎসক খুঁজে পাওয়া যায়নি" : "Approved doctor profile not found"}
              description={locale === "bn" ? "অনুমোদিত চিকিৎসক তালিকায় ফিরে যান।" : "Return to the directory of verified demo clinicians."}
              actionLabel={locale === "bn" ? "ডিরেক্টরিতে ফিরুন" : "Back to Doctors"}
              onAction={() => navigate("/doctors")}
            />
          ) : (
            <div className="space-y-6">
              <Link to="/doctors" className="text-sm font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center min-h-11">
                ← {locale === "bn" ? "সব চিকিৎসক তালিকায় ফিরুন" : "Back to All Doctors"}
              </Link>

              <div className="ss-card rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold">
                        {locale === "bn" && selectedDoc.display_name_bn ? selectedDoc.display_name_bn : selectedDoc.display_name}
                      </h1>
                      <TrustBadge kind="HUMAN_VERIFIED" />
                    </div>
                    <p className="text-sm font-medium text-[var(--color-primary)]">{selectedDoc.degrees} • {selectedDoc.specialty}</p>
                    <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {selectedDoc.practice_location}, {selectedDoc.district} • Reg: {selectedDoc.bmdc_demo_reg}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-[var(--color-text)]">
                      {formatBdtFromPoisha(selectedDoc.consultation_fee_minor_poisha, locale)}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {locale === "bn" ? "ফলো-আপ ফি:" : "Follow-up:"} {formatBdtFromPoisha(selectedDoc.followup_fee_minor_poisha, locale)}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[var(--color-text-muted)]">
                  {locale === "bn" && selectedDoc.bio_bn ? selectedDoc.bio_bn : selectedDoc.bio}
                </p>

                <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-[var(--color-primary)]" />
                    {locale === "bn" ? "উপলব্ধ সময়সূচী (Asia/Dhaka)" : "Available Time Slots (Asia/Dhaka)"}
                  </h2>
                  {openSlots.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {locale === "bn" ? "বর্তমানে কোনো খালি স্লট নেই।" : "No open slots available right now."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {openSlots.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleBookSlot(slot.id)}
                          data-testid={`book-slot-${slot.id}`}
                          className="min-h-14 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-left transition flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div>
                            <div className="text-sm font-semibold">{formatDhakaDateTime(slot.start_utc, locale)}</div>
                            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> {slot.modality}
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-contrast)]">
                            {locale === "bn" ? "বুক" : "Book"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2.5">
                  <Stethoscope className="w-7 h-7 text-[var(--color-primary)]" />
                  {locale === "bn" ? "অনুমোদিত চিকিৎসক খুঁজুন" : "Find Approved Demo Doctors"}
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {locale === "bn"
                    ? "অ্যাডমিন অনুমোদিত চিকিৎসকদের সাথে নিরাপদ ও অ্যাটমিক স্লট বুকিং"
                    : "Filter Admin-verified clinicians by specialty, symptom, or online status."}
                </p>
              </div>
              <Link
                to="/doctor-apply"
                className="min-h-11 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-sm font-semibold inline-flex items-center"
              >
                {locale === "bn" ? "ডাক্তার হিসেবে আবেদন করুন" : "Apply as a Doctor"}
              </Link>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 min-h-11">
                <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={locale === "bn" ? "নাম বা উপসর্গ (pcos, fever, rash)..." : "Name or symptom (pcos, fever, rash)..."}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  data-testid="doctors-search-input"
                />
              </div>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                aria-label="Specialty Filter"
                className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm"
              >
                <option value="">{locale === "bn" ? "সকল বিভাগ" : "All Specialties"}</option>
                <option value="Gynecology">Gynecology & PCOS</option>
                <option value="Pediatrics">Pediatrics & Child Care</option>
                <option value="Dermatology">Dermatology & Skin Care</option>
              </select>
              <label className="min-h-11 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="w-4 h-4" />
                <span>{locale === "bn" ? "এখন অনলাইনে আছেন" : "Online Now Only"}</span>
              </label>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            ) : doctors.length === 0 ? (
              <EmptyState
                title={locale === "bn" ? "কোনো চিকিৎসক পাওয়া যায়নি" : "No matching approved doctors"}
                description={locale === "bn" ? "অনুসন্ধান শর্ত পরিবর্তন করে আবার চেষ্টা করুন।" : "Adjust your search or specialty filter."}
                actionLabel={locale === "bn" ? "রিসেট করুন" : "Reset Filters"}
                onAction={() => {
                  setQ("");
                  setSpecialty("");
                  setOnlineOnly(false);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {doctors.map((doc) => (
                  <article
                    key={doc.id}
                    data-testid={`doctor-card-${doc.id}`}
                    className="ss-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="font-bold text-lg">
                            {locale === "bn" && doc.display_name_bn ? doc.display_name_bn : doc.display_name}
                          </h2>
                          <p className="text-xs font-medium text-[var(--color-primary)]">{doc.degrees}</p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${doc.is_online_now ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-slate-500/15 text-[var(--color-text-muted)]"}`}>
                          {doc.is_online_now ? "Online" : "Scheduled"}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">{doc.specialty} • {doc.district}</p>
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                        {locale === "bn" && doc.bio_bn ? doc.bio_bn : doc.bio}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-base block">
                          {formatBdtFromPoisha(doc.consultation_fee_minor_poisha, locale)}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {doc.open_slots_count ?? 0} {locale === "bn" ? "স্লট" : "open slots"}
                        </span>
                      </div>
                      <Link
                        to={`/doctors/${doc.id}`}
                        className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold inline-flex items-center"
                      >
                        {locale === "bn" ? "স্লট দেখুন" : "View Slots"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
