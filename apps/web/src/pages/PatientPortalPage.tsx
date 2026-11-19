import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Baby,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  FilePlus2,
  FlaskConical,
  FolderHeart,
  LifeBuoy,
  Pill,
  Printer,
  ScanText,
  Stethoscope,
} from "lucide-react";
import { ApiError, apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { formatBdtFromPoisha, formatDhakaDateTime } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PortalLayout } from "../components/layout/PortalLayout";
import { Skeleton, StatusBadge, StatCard, TrustBadge, useToast } from "../components/ui";

interface PatientDashboardData {
  profiles: Array<{ id: string; display_name: string; relationship_type: string; date_of_birth?: string; blood_group?: string; district?: string }>;
  appointments: Array<{
    id: string;
    booking_reference: string;
    doctor_id: string;
    doctor_name: string;
    doctor_name_bn?: string;
    specialty: string;
    slot_start_utc: string;
    slot_end_utc: string;
    patient_name: string;
    consultation_mode: string;
    status: string;
    fee_minor_poisha: number;
    visit_reason_summary?: string;
  }>;
  payments: Array<{
    id: string;
    demo_ref: string;
    appointment_id: string;
    booking_reference: string;
    method: string;
    amount_minor_poisha: number;
    status: string;
    receipt_number?: string;
    disclaimer_label?: string;
    created_at_utc: string;
  }>;
  medications: Array<{
    id: string;
    medicine_name: string;
    dose_text: string;
    frequency_rule: string;
    status: string;
    verified_by_user_id?: string | null;
  }>;
  eprescriptions: Array<{
    id: string;
    rx_reference: string;
    doctor_name: string;
    specialty: string;
    diagnosis_summary: string;
    medications_json: string;
    advice_notes?: string;
    status: string;
    signed_at_utc?: string;
  }>;
  diagnostic_orders: Array<{
    id: string;
    order_ref: string;
    name_bn: string;
    name_en: string;
    preferred_date: string;
    collection_mode: string;
    fee_minor_poisha: number;
    status: string;
  }>;
  tickets: Array<{
    id: string;
    ticket_number: string;
    category: string;
    priority: string;
    status: string;
    subject: string;
    created_at_utc: string;
  }>;
}

interface DoctorItem {
  id: string;
  display_name: string;
  display_name_bn?: string;
  degrees: string;
  specialty: string;
  district: string;
  consultation_fee_minor_poisha: number;
  open_slots_count: number;
}

interface OcrPayload {
  documents: Array<{ id: string; doc_type: string; original_filename: string; mime_type: string; created_at_utc: string }>;
  ocr_jobs: Array<{
    id: string;
    document_id: string;
    original_filename: string;
    patient_profile_id: string;
    status: string;
    mean_confidence: number;
    fields: Array<{
      id: string;
      field_type: string;
      raw_ocr_text: string;
      verified_value?: string | null;
      confidence: number;
      is_critical: number;
      is_verified: number;
    }>;
  }>;
}

export function PatientPortalPage({ section = "dashboard" }: { section?: string }) {
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<PatientDashboardData | null>(null);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [selectedDoctorSlots, setSelectedDoctorSlots] = useState<Array<{ id: string; start_utc: string; modality: string }>>([]);
  const [bookingDoctorId, setBookingDoctorId] = useState(searchParams.get("doctorId") || "");
  const [bookingSlotId, setBookingSlotId] = useState(searchParams.get("slotId") || "");
  const [bookingProfileId, setBookingProfileId] = useState("");
  const [visitReason, setVisitReason] = useState("Follow-up consultation & lab review");
  const [checkoutMethod, setCheckoutMethod] = useState<"DEMO_BKASH" | "DEMO_NAGAD" | "DEMO_CARD">("DEMO_BKASH");
  const [receiptData, setReceiptData] = useState<Record<string, unknown> | null>(null);

  const [ocrData, setOcrData] = useState<OcrPayload | null>(null);
  const [ocrDraftEdits, setOcrDraftEdits] = useState<Record<string, string>>({});
  const [pcosEntries, setPcosEntries] = useState<Array<{ id: string; start_date: string; cycle_length_days?: number; user_notes?: string; symptoms_json: string }>>([]);
  const [pediatricData, setPediatricData] = useState<{ vaccines: Array<Record<string, string>>; cases: Array<Record<string, string>> } | null>(null);
  const [diagTests, setDiagTests] = useState<Array<{ id: string; code: string; name_bn: string; name_en: string; fee_minor_poisha: number }>>([]);
  const [consultations, setConsultations] = useState<Array<Record<string, string>>>([]);

  // Forms state
  const [depName, setDepName] = useState("");
  const [docFilename, setDocFilename] = useState("prescription_demo_scan.png");
  const [pcosDate, setPcosDate] = useState("2026-11-01");
  const [pcosCycleLen, setPcosCycleLen] = useState(32);
  const [pcosNotes, setPcosNotes] = useState("");
  const [pedTemp, setPedTemp] = useState(101.8);
  const [pedBreathing, setPedBreathing] = useState(false);
  const [pedFeverDays, setPedFeverDays] = useState(2);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");
  const [activeTicketMsgs, setActiveTicketMsgs] = useState<{ id: string; messages: Array<{ id: string; sender_name: string; sender_role: string; body_text: string; created_at_utc: string }> } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const dashRes = await apiGet<PatientDashboardData>("/v1/patient/dashboard");
      setDash(dashRes);
      if (dashRes.profiles.length > 0 && !bookingProfileId) {
        setBookingProfileId(dashRes.profiles[0].id);
      }

      if (section === "doctors") {
        const docsRes = await apiGet<{ doctors: DoctorItem[] }>("/v1/public/doctors");
        setDoctors(docsRes.doctors || []);
      } else if (section === "records" || section === "ocr") {
        setOcrData(await apiGet<OcrPayload>("/v1/patient/documents"));
      } else if (section === "pcos") {
        const p = await apiGet<{ entries: typeof pcosEntries }>("/v1/patient/pcos");
        setPcosEntries(p.entries || []);
      } else if (section === "pediatric") {
        setPediatricData(await apiGet("/v1/patient/pediatric"));
      } else if (section === "diagnostics") {
        const svc = await apiGet<{ diagnostic_tests: typeof diagTests }>("/v1/public/services");
        setDiagTests(svc.diagnostic_tests || []);
      } else if (section === "appointments" || section === "consultations") {
        const cons = await apiGet<{ consultations: Array<Record<string, string>> }>("/v1/patient/consultations");
        setConsultations(cons.consultations || []);
      } else if (section === "receipt" && paymentId) {
        const rec = await apiGet<{ receipt: Record<string, unknown> }>(`/v1/patient/receipts/${paymentId}`);
        setReceiptData(rec.receipt);
      }
    } catch (err) {
      pushToast({
        title: locale === "bn" ? "তথ্য লোড করা যায়নি" : "Failed to load data",
        description: err instanceof ApiError ? err.detail : "Unexpected error",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [section, paymentId, bookingProfileId, locale, pushToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!bookingDoctorId) return;
    void (async () => {
      try {
        const res = await apiGet<{ open_slots: Array<{ id: string; start_utc: string; modality: string }> }>(`/v1/public/doctors/${bookingDoctorId}`);
        setSelectedDoctorSlots(res.open_slots || []);
      } catch {
        setSelectedDoctorSlots([]);
      }
    })();
  }, [bookingDoctorId]);

  const runBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlotId) {
      pushToast({ title: "Select a slot first", tone: "warning" });
      return;
    }
    try {
      const res = await apiPost<{ appointment: { id: string; booking_reference: string } }>("/v1/appointments/book", {
        slot_id: bookingSlotId,
        patient_profile_id: bookingProfileId || undefined,
        visit_reason_summary: visitReason,
        consultation_mode: "ONLINE_DEMO",
        idempotency_key: `ui-book-${bookingSlotId}-${Date.now()}`,
      });
      pushToast({
        title: `Reserved ${res.appointment.booking_reference}`,
        description: "Complete simulated payment to confirm appointment.",
        tone: "success",
      });
      navigate("/patient/appointments");
    } catch (err) {
      pushToast({ title: "Booking failed", description: err instanceof ApiError ? err.detail : "Conflict", tone: "danger" });
    }
  };

  const runDemoCheckout = async (appointmentId: string) => {
    try {
      const res = await apiPost<{ payment: { id: string; receipt_number?: string } }>("/v1/payments/checkout", {
        appointment_id: appointmentId,
        method: checkoutMethod,
        outcome: "SUCCESS",
        idempotency_key: `ui-pay-${appointmentId}-${checkoutMethod}`,
      });
      pushToast({ title: "Simulated Payment Complete", description: `Receipt ${res.payment.receipt_number}`, tone: "success" });
      await loadAll();
      navigate(`/patient/receipts/${res.payment.id}`);
    } catch (err) {
      pushToast({ title: "Demo checkout failed", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    }
  };

  const handleCancelAppointment = async (aptId: string) => {
    try {
      await apiPost(`/v1/appointments/${aptId}/cancel`, {});
      pushToast({ title: "Appointment cancelled & slot released", tone: "info" });
      await loadAll();
    } catch (err) {
      pushToast({ title: "Cancel failed", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    }
  };

  const verifySingleField = async (fieldId: string, fallbackValue: string) => {
    try {
      const val = (ocrDraftEdits[fieldId] ?? fallbackValue).trim();
      await apiPatch(`/v1/patient/ocr-fields/${fieldId}/verify`, { verified_value: val });
      pushToast({ title: "OCR Field Verified", tone: "success" });
      await loadAll();
    } catch (err) {
      pushToast({ title: "Verification failed", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    }
  };

  const activateOcrPlan = async (jobId: string, patientProfileId: string) => {
    try {
      await apiPost(`/v1/patient/ocr-jobs/${jobId}/activate-plan`, { patient_profile_id: patientProfileId });
      pushToast({ title: "Verified Medication Plan Activated", tone: "success" });
      await loadAll();
    } catch (err) {
      pushToast({
        title: "Activation Blocked (Human Safety Gate)",
        description: err instanceof ApiError ? err.detail : "Error",
        tone: "danger",
      });
    }
  };

  const logMedication = async (planId: string, actionStatus: "TAKEN" | "SKIPPED" | "SNOOZED") => {
    try {
      await apiPost(`/v1/patient/medications/${planId}/log`, { action_status: actionStatus });
      pushToast({ title: `Dose logged: ${actionStatus}`, tone: "success" });
      await loadAll();
    } catch (err) {
      pushToast({ title: "Could not log dose", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    }
  };

  const addDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depName.trim()) return;
    await apiPost("/v1/patient/dependents", { display_name: depName, relationship_type: "CHILD", district: "Dhaka" });
    setDepName("");
    pushToast({ title: "Dependent Profile Created", tone: "success" });
    await loadAll();
  };

  const titleBySection: Record<string, string> = {
    dashboard: locale === "bn" ? "রোগী পোর্টাল ড্যাশবোর্ড" : "Patient Dashboard",
    doctors: locale === "bn" ? "চিকিৎসক নির্বাচন ও স্লট বুকিং" : "Book Approved Demo Doctor",
    appointments: locale === "bn" ? "আমার অ্যাপয়েন্টমেন্ট ও পরামর্শ" : "My Appointments & Consultations",
    payments: locale === "bn" ? "ডেমো পেমেন্ট ও রসিদ" : "Simulated Demo Payments & Receipts",
    receipt: locale === "bn" ? "ডেমো পেমেন্ট রসিদ (সিমুলেটেড)" : "Simulated Demo Receipt",
    records: locale === "bn" ? "স্বাস্থ্য নথি ও পরিবার প্রোফাইল" : "Health Vault & Family Dependents",
    ocr: locale === "bn" ? "মানব-যাচাইকৃত প্রেসক্রিপশন OCR" : "Safe-OCR Verification Workbench",
    medicines: locale === "bn" ? "সক্রিয় ওষুধ ও ই-প্রেসক্রিপশন" : "Medication Routine & Signed e-Rx",
    pcos: locale === "bn" ? "PCOS সাইকেল ও উপসর্গ জার্নাল" : "Women's Health & PCOS Tracker",
    pediatric: locale === "bn" ? "শিশু স্বাস্থ্য ও জরুরি সতর্কতা" : "Pediatric Care, Vaccines & Triage",
    diagnostics: locale === "bn" ? "ডায়াগনস্টিক টেস্ট অর্ডার (ডেমো)" : "Diagnostic Lab Demo Orders",
    support: locale === "bn" ? "সাপোর্ট টিকেট ও সহায়তা" : "Patient Support Tickets",
  };

  return (
    <PortalLayout
      title={titleBySection[section] || titleBySection.dashboard}
      subtitle={locale === "bn" ? "সকল পেমেন্ট সম্পূর্ণ ডেমো/সিমুলেটেড ও তথ্য আপনার প্রোফাইলে সীমাবদ্ধ" : "Scoped exclusively to your owned adult and dependent profiles"}
    >
      {loading && !dash ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* OVERVIEW SECTION */}
          {section === "dashboard" && dash && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={locale === "bn" ? "অ্যাপয়েন্টমেন্ট" : "Appointments"} value={String(dash.appointments.length)} icon={CalendarCheck} />
                <StatCard label={locale === "bn" ? "সক্রিয় ওষুধ" : "Active Meds"} value={String(dash.medications.filter((m) => m.status === "ACTIVE").length)} icon={Pill} />
                <StatCard label={locale === "bn" ? "ডিজিটাল ই-প্রেসক্রিপশন" : "Signed e-Rx"} value={String(dash.eprescriptions.length)} icon={Stethoscope} />
                <StatCard label={locale === "bn" ? "পরিবার সদস্য" : "Family Profiles"} value={String(dash.profiles.length)} icon={FolderHeart} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-base">{locale === "bn" ? "সাম্প্রতিক অ্যাপয়েন্টমেন্ট" : "Recent Appointments"}</h2>
                    <button type="button" onClick={() => navigate("/patient/doctors")} className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer">
                      + {locale === "bn" ? "নতুন বুকিং" : "Book New"}
                    </button>
                  </div>
                  {dash.appointments.slice(0, 4).map((a) => (
                    <div key={a.id} className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-bold">{locale === "bn" && a.doctor_name_bn ? a.doctor_name_bn : a.doctor_name}</p>
                        <p className="text-[var(--color-text-muted)]">{a.booking_reference} • {formatDhakaDateTime(a.slot_start_utc, locale)}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-base">{locale === "bn" ? "পরিবারের প্রোফাইল" : "Family Profiles & Dependents"}</h2>
                    <button type="button" onClick={() => navigate("/patient/records")} className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer">
                      Manage
                    </button>
                  </div>
                  {dash.profiles.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold block">{p.display_name}</span>
                        <span className="text-[var(--color-text-muted)]">{p.relationship_type} • {p.blood_group || "—"}</span>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{p.district}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* BOOK DOCTOR SECTION */}
          {section === "doctors" && dash && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-3">
                <h2 className="font-bold text-base">{locale === "bn" ? "১. চিকিৎসক বাছাই করুন" : "1. Select Approved Doctor"}</h2>
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    data-testid={`select-doctor-${d.id}`}
                    onClick={() => {
                      setBookingDoctorId(d.id);
                      setBookingSlotId("");
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition cursor-pointer ${
                      bookingDoctorId === d.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{locale === "bn" && d.display_name_bn ? d.display_name_bn : d.display_name}</span>
                      <span className="font-mono font-bold text-sm">{formatBdtFromPoisha(d.consultation_fee_minor_poisha, locale)}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.degrees} • {d.specialty} ({d.open_slots_count} open slots)</p>
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => void runBookAppointment(e)} className="lg:col-span-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
                <h2 className="font-bold text-base">{locale === "bn" ? "২. স্লট ও রোগী নির্ধারণ করুন" : "2. Select Open Slot & Confirm Reservation"}</h2>
                <label className="block space-y-1 text-xs font-semibold">
                  <span>{locale === "bn" ? "রোগী নির্বাচন" : "Patient Profile"}</span>
                  <select
                    value={bookingProfileId}
                    onChange={(e) => setBookingProfileId(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm"
                  >
                    {dash.profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.display_name} ({p.relationship_type})</option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold block">{locale === "bn" ? "সময়সূচী" : "Available Slots"}</span>
                  {selectedDoctorSlots.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">Select a doctor on the left to inspect available slots.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                      {selectedDoctorSlots.map((sl) => (
                        <button
                          key={sl.id}
                          type="button"
                          onClick={() => setBookingSlotId(sl.id)}
                          data-testid={`choose-slot-${sl.id}`}
                          className={`min-h-11 px-3 py-2 rounded-xl border text-xs text-left cursor-pointer ${
                            bookingSlotId === sl.id
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-bold"
                              : "border-[var(--color-border)] bg-[var(--color-canvas)]"
                          }`}
                        >
                          {formatDhakaDateTime(sl.start_utc, locale)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className="block space-y-1 text-xs font-semibold">
                  <span>{locale === "bn" ? "পরামর্শের কারণ" : "Visit Reason Summary"}</span>
                  <input
                    type="text"
                    required
                    value={visitReason}
                    onChange={(e) => setVisitReason(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm"
                  />
                </label>

                <button
                  type="submit"
                  data-testid="confirm-booking-btn"
                  className="w-full min-h-12 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm cursor-pointer"
                >
                  {locale === "bn" ? "অ্যাটমিক স্লট সংরক্ষণ করুন" : "Lock Slot & Proceed to Demo Checkout"}
                </button>
              </form>
            </div>
          )}

          {/* APPOINTMENTS & CONSULTATIONS */}
          {(section === "appointments" || section === "consultations") && dash && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
                <span>SIMULATED / DEMO CHECKOUT: Select bKash, Nagad, or Card Demo method below when settling pending bookings (zero PIN/OTP/CVV).</span>
                <select
                  aria-label="Demo Payment Method"
                  value={checkoutMethod}
                  onChange={(e) => setCheckoutMethod(e.target.value as typeof checkoutMethod)}
                  className="min-h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-semibold"
                >
                  <option value="DEMO_BKASH">DEMO bKash</option>
                  <option value="DEMO_NAGAD">DEMO Nagad</option>
                  <option value="DEMO_CARD">DEMO Card</option>
                </select>
              </div>

              {dash.appointments.map((apt) => (
                <div
                  key={apt.id}
                  data-testid={`patient-apt-${apt.id}`}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--color-surface-alt)]">{apt.booking_reference}</span>
                      <StatusBadge status={apt.status} />
                    </div>
                    <h3 className="font-bold text-base">
                      {locale === "bn" && apt.doctor_name_bn ? apt.doctor_name_bn : apt.doctor_name} ({apt.specialty})
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {apt.patient_name} • {formatDhakaDateTime(apt.slot_start_utc, locale)} • {formatBdtFromPoisha(apt.fee_minor_poisha, locale)}
                    </p>
                    {apt.visit_reason_summary && <p className="text-xs text-[var(--color-text-muted)]">Reason: {apt.visit_reason_summary}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {apt.status === "AWAITING_DEMO_PAYMENT" && (
                      <button
                        type="button"
                        data-testid={`pay-demo-btn-${apt.id}`}
                        onClick={() => void runDemoCheckout(apt.id)}
                        className="min-h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" /> Complete {checkoutMethod.replace("DEMO_", "")} Demo Pay
                      </button>
                    )}
                    {["AWAITING_DEMO_PAYMENT", "CONFIRMED"].includes(apt.status) && (
                      <button
                        type="button"
                        onClick={() => void handleCancelAppointment(apt.id)}
                        className="min-h-11 px-4 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {consultations.some((c) => c.rx_reference) && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
                  <h2 className="font-bold text-base">Signed Consultation Summaries & Demo E-Prescriptions</h2>
                  {consultations
                    .filter((c) => c.rx_reference)
                    .map((c) => (
                      <div key={c.appointment_id} className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span>{c.rx_reference} — {c.doctor_name}</span>
                          <span className="text-emerald-600 dark:text-emerald-300">{c.rx_status}</span>
                        </div>
                        <p>Diagnosis (Demo): {c.diagnosis_summary}</p>
                        {c.advice_summary && <p className="text-[var(--color-text-muted)]">Advice: {c.advice_summary}</p>}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS LIST & WATERMARKED DEMO RECEIPT */}
          {section === "payments" && dash && (
            <div className="space-y-3">
              {dash.payments.map((p) => (
                <div key={p.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-mono font-bold text-sm">{p.demo_ref} ({p.method})</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Appointment: {p.booking_reference} • {formatBdtFromPoisha(p.amount_minor_poisha, locale)} • {p.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/receipts/${p.id}`)}
                    className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold cursor-pointer"
                  >
                    View Watermarked Receipt
                  </button>
                </div>
              ))}
            </div>
          )}

          {section === "receipt" && receiptData && (
            <div data-testid="demo-receipt-card" className="max-w-2xl mx-auto rounded-3xl border-2 border-dashed border-amber-500/50 bg-[var(--color-surface)] p-6 sm:p-8 space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 font-mono text-xs font-bold text-center">
                {String(receiptData.disclaimer_label || "SIMULATED / DEMO RECEIPT — NO ACTUAL MONEY CHARGED")}
              </div>
              <div className="flex justify-between items-start border-b border-[var(--color-border)] pb-4">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Receipt Number</p>
                  <p className="font-mono font-bold text-xl">{String(receiptData.receipt_number)}</p>
                </div>
                <span className="font-mono text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold">
                  {String(receiptData.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-[var(--color-text-muted)] block">Patient</span><strong>{String(receiptData.patient_name)}</strong></div>
                <div><span className="text-xs text-[var(--color-text-muted)] block">Doctor</span><strong>{String(receiptData.doctor_name)}</strong></div>
                <div><span className="text-xs text-[var(--color-text-muted)] block">Booking Ref</span><strong>{String(receiptData.booking_reference)}</strong></div>
                <div><span className="text-xs text-[var(--color-text-muted)] block">Simulated Amount</span><strong>{formatBdtFromPoisha(Number(receiptData.amount_minor_poisha || 0), locale)}</strong></div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-11 px-4 rounded-xl border border-[var(--color-border)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Simulated Receipt
              </button>
            </div>
          )}

          {/* RECORDS VAULT & DEPENDENTS */}
          {section === "records" && dash && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={(e) => void addDependent(e)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
                <h2 className="font-bold text-base">Add Child / Dependent Profile</h2>
                <input
                  type="text"
                  required
                  value={depName}
                  onChange={(e) => setDepName(e.target.value)}
                  placeholder="Dependent full name"
                  className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm"
                />
                <button type="submit" className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold cursor-pointer">
                  Save Dependent Profile
                </button>
              </form>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
                <h2 className="font-bold text-base flex items-center gap-2"><FilePlus2 className="w-4 h-4" /> Upload Demo Prescription Metadata</h2>
                <input
                  type="text"
                  value={docFilename}
                  onChange={(e) => setDocFilename(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    void (async () => {
                      await apiPost("/v1/patient/documents", { doc_type: "PRESCRIPTION", original_filename: docFilename, mime_type: "image/png", byte_size: 48120 });
                      pushToast({ title: "Document queued as NEEDS_REVIEW OCR draft", tone: "success" });
                      await loadAll();
                      navigate("/patient/ocr-review");
                    })()
                  }
                  className="min-h-11 px-4 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-semibold cursor-pointer"
                >
                  Upload & Run Safe OCR Draft
                </button>
              </div>
            </div>
          )}

          {/* SAFE-OCR REVIEW WORKBENCH */}
          {section === "ocr" && ocrData && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <strong>Mandatory Human Safety Gate (HTTP 422):</strong> Uncertain OCR fields cannot generate active reminders until you verify every critical item manually.
                </div>
              </div>

              {ocrData.ocr_jobs.map((job) => (
                <div key={job.id} data-testid={`ocr-job-card-${job.id}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <ScanText className="w-4 h-4 text-[var(--color-primary)]" /> {job.original_filename}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Job: {job.id} • Status: <strong>{job.status}</strong> • Mean Conf: {Math.round((job.mean_confidence || 0) * 100)}%
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid={`activate-ocr-btn-${job.id}`}
                      onClick={() => void activateOcrPlan(job.id, job.patient_profile_id)}
                      className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-xs cursor-pointer"
                    >
                      Activate Medication Schedule
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {job.fields.map((f) => (
                      <div key={f.id} className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                            {f.field_type} • Conf: {Math.round(f.confidence * 100)}% • {f.is_verified ? "VERIFIED BY HUMAN" : "NEEDS VERIFICATION"}
                          </div>
                          <input
                            type="text"
                            value={ocrDraftEdits[f.id] ?? f.verified_value ?? f.raw_ocr_text}
                            onChange={(e) => setOcrDraftEdits((prev) => ({ ...prev, [f.id]: e.target.value }))}
                            className="w-full min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          data-testid={`verify-field-btn-${f.id}`}
                          onClick={() => void verifySingleField(f.id, f.raw_ocr_text)}
                          className={`min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                            f.is_verified
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500 text-slate-950"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {f.is_verified ? "Verified" : "Verify Field"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MEDICATIONS & SIGNED E-PRESCRIPTIONS */}
          {section === "medicines" && dash && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="font-bold text-base">Verified Medication Plans</h2>
                {dash.medications.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-base">{m.medicine_name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{m.dose_text} • {m.frequency_rule} • Status: {m.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void logMedication(m.id, "TAKEN")} className="min-h-11 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer">Taken</button>
                      <button type="button" onClick={() => void logMedication(m.id, "SNOOZED")} className="min-h-11 px-3 rounded-xl border border-[var(--color-border)] text-xs font-semibold cursor-pointer">Snooze</button>
                      <button type="button" onClick={() => void logMedication(m.id, "SKIPPED")} className="min-h-11 px-3 rounded-xl border border-[var(--color-border)] text-xs font-semibold cursor-pointer">Skip</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PCOS CYCLE LOG */}
          {section === "pcos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <TrustBadge kind="RESEARCH_ONLY" />
                <span className="text-xs text-[var(--color-text-muted)]">Personal cycle journal — non-diagnostic record keeping</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    await apiPost("/v1/patient/pcos", { start_date: pcosDate, cycle_length_days: Number(pcosCycleLen), symptoms_json: { acne: true }, user_notes: pcosNotes });
                    setPcosNotes("");
                    pushToast({ title: "Cycle Entry Saved", tone: "success" });
                    await loadAll();
                  })();
                }}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <label className="text-xs font-semibold space-y-1">
                  <span>Start Date</span>
                  <input type="date" value={pcosDate} onChange={(e) => setPcosDate(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold space-y-1">
                  <span>Cycle Length (days)</span>
                  <input type="number" min={15} max={120} value={pcosCycleLen} onChange={(e) => setPcosCycleLen(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold space-y-1">
                  <span>Notes</span>
                  <input type="text" value={pcosNotes} onChange={(e) => setPcosNotes(e.target.value)} placeholder="Symptoms or notes" className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <button type="submit" className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-xs cursor-pointer flex items-center justify-center gap-1.5">
                  <Activity className="w-4 h-4" /> Log Cycle
                </button>
              </form>
              <div className="space-y-2.5">
                {pcosEntries.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex justify-between text-xs">
                    <div>
                      <strong>Start: {e.start_date}</strong> • Cycle: {e.cycle_length_days ?? "—"} days
                      <p className="text-[var(--color-text-muted)]">{e.user_notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PEDIATRIC CARE & TRIAGE */}
          {section === "pediatric" && dash && pediatricData && (
            <div className="space-y-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    const child = dash.profiles.find((p) => p.relationship_type === "CHILD") || dash.profiles[0];
                    const res = await apiPost<{ review_state: string; escalation_flags: string[] }>("/v1/patient/pediatric/triage", {
                      child_profile_id: child.id,
                      age_months: 42,
                      fever_days: Number(pedFeverDays),
                      temp_f: Number(pedTemp),
                      breathing_difficulty: pedBreathing,
                    });
                    pushToast({ title: `Triage Evaluated: ${res.review_state}`, description: res.escalation_flags.join(", ") || "Routine review", tone: res.review_state === "URGENT_REVIEW" ? "danger" : "info" });
                    await loadAll();
                  })();
                }}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <label className="text-xs font-semibold space-y-1">
                  <span>Temp (°F)</span>
                  <input type="number" step="0.1" value={pedTemp} onChange={(e) => setPedTemp(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold space-y-1">
                  <span>Fever Duration (days)</span>
                  <input type="number" step="0.5" value={pedFeverDays} onChange={(e) => setPedFeverDays(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold min-h-11 cursor-pointer">
                  <input type="checkbox" checked={pedBreathing} onChange={(e) => setPedBreathing(e.target.checked)} className="w-4 h-4" />
                  <span>Breathing Difficulty (Red Flag)</span>
                </label>
                <button type="submit" className="min-h-11 px-4 rounded-xl bg-sky-600 text-white font-semibold text-xs cursor-pointer flex items-center justify-center gap-1.5">
                  <Baby className="w-4 h-4" /> Run Red-Flag Rules
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2.5">
                  <h2 className="font-bold text-base">Child Vaccine Schedule</h2>
                  {pediatricData.vaccines.map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex justify-between text-xs">
                      <span><strong>{v.vaccine_name}</strong> ({v.dose_label})</span>
                      <StatusBadge status={v.status === "COMPLETED" ? "CONFIRMED" : "PENDING"} />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2.5">
                  <h2 className="font-bold text-base">Logged Triage Cases</h2>
                  {pediatricData.cases.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] text-xs space-y-1">
                      <div className="font-bold">{c.review_state}</div>
                      <div className="font-mono text-[11px] text-[var(--color-text-muted)]">{c.escalation_flags_json}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DIAGNOSTIC DEMO ORDERS */}
          {section === "diagnostics" && dash && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagTests.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm">{locale === "bn" ? t.name_bn : t.name_en}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{t.code} • {formatBdtFromPoisha(t.fee_minor_poisha, locale)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void (async () => {
                          const res = await apiPost<{ order_ref: string }>("/v1/patient/diagnostics/order", { test_id: t.id, preferred_date: "2027-02-05", collection_mode: "HOME_SAMPLE_DEMO" });
                          pushToast({ title: `Demo Order Created: ${res.order_ref}`, tone: "success" });
                          await loadAll();
                        })()
                      }
                      className="min-h-11 px-4 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <FlaskConical className="w-4 h-4" /> Order Demo Test
                    </button>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
                <h2 className="font-bold text-base">My Simulated Diagnostic Orders</h2>
                {dash.diagnostic_orders.map((o) => (
                  <div key={o.id} className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex justify-between text-xs">
                    <span><strong>{o.order_ref}</strong> — {locale === "bn" ? o.name_bn : o.name_en} ({o.collection_mode})</span>
                    <span className="font-mono font-bold">{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PATIENT SUPPORT TICKETS */}
          {section === "support" && dash && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    await apiPost("/v1/patient/tickets", { category: "DEMO_PAYMENT", subject: ticketSubject, message: ticketMsg });
                    setTicketSubject("");
                    setTicketMsg("");
                    pushToast({ title: "Support Ticket Created", tone: "success" });
                    await loadAll();
                  })();
                }}
                className="lg:col-span-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3"
              >
                <h2 className="font-bold text-base flex items-center gap-2"><LifeBuoy className="w-4 h-4" /> Create Support Ticket</h2>
                <input type="text" required value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="Subject" className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                <textarea required rows={3} value={ticketMsg} onChange={(e) => setTicketMsg(e.target.value)} placeholder="Describe issue (avoid sensitive clinical notes)" className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm" />
                <button type="submit" className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-xs cursor-pointer">
                  Submit Ticket
                </button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {dash.tickets.map((tkt) => (
                  <div key={tkt.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-sm">{tkt.ticket_number}: {tkt.subject}</strong>
                      <StatusBadge status={tkt.status} />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void (async () => {
                          const d = await apiGet<{ messages: Array<{ id: string; sender_name: string; sender_role: string; body_text: string; created_at_utc: string }> }>(`/v1/patient/tickets/${tkt.id}`);
                          setActiveTicketMsgs({ id: tkt.id, messages: d.messages });
                        })()
                      }
                      className="text-xs font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      Inspect Public Replies
                    </button>
                    {activeTicketMsgs && activeTicketMsgs.id === tkt.id && (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                        {activeTicketMsgs.messages.map((m) => (
                          <div key={m.id} className="p-2.5 rounded-xl bg-[var(--color-canvas)] text-xs">
                            <span className="font-bold">{m.sender_name} ({m.sender_role}): </span>
                            <span>{m.body_text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
