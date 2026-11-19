import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarClock, CheckCircle2, ClipboardCheck, FileSignature, Pill, ShieldAlert, Stethoscope } from "lucide-react";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { formatBdtFromPoisha, formatDhakaDateTime } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PortalLayout } from "../components/layout/PortalLayout";
import { Skeleton, StatCard, StatusBadge, useToast } from "../components/ui";

interface DoctorDashResponse {
  approved: boolean;
  verification_status: string;
  doctor_profile: Record<string, unknown>;
  verification_events: Array<{ id: string; to_status: string; reason: string; created_at_utc: string }>;
  kpis?: { active_queue: number; completed_consultations: number; open_slots: number; simulated_gross_poisha: number };
  upcoming_queue?: Array<Record<string, unknown>>;
}

export function DoctorPortalPage({ section = "dashboard" }: { section?: string }) {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<DoctorDashResponse | null>(null);
  const [availability, setAvailability] = useState<{ slots: Array<Record<string, unknown>>; rules: Array<Record<string, unknown>> } | null>(null);
  const [appointments, setAppointments] = useState<Array<Record<string, unknown>>>([]);
  const [workspace, setWorkspace] = useState<Record<string, unknown> | null>(null);

  // Form inputs
  const [slotDate, setSlotDate] = useState("2027-02-10");
  const [slotStart, setSlotStart] = useState("10:00");
  const [slotEnd, setSlotEnd] = useState("12:00");
  const [subjective, setSubjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [advice, setAdvice] = useState("");
  const [rxDiag, setRxDiag] = useState("Routine Clinical Review (Demo)");
  const [rxMedName, setRxMedName] = useState("Tab. Paracetamol 500mg");
  const [rxDose, setRxDose] = useState("1 tablet");
  const [rxFreq, setRxFreq] = useState("1+0+1 (5 days)");
  const [bioText, setBioText] = useState("");
  const [feeBdt, setFeeBdt] = useState(500);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<DoctorDashResponse>("/v1/doctor/dashboard");
      setDash(d);
      setBioText(String(d.doctor_profile?.bio || ""));
      setFeeBdt(Math.round(Number(d.doctor_profile?.consultation_fee_minor_poisha || 50000) / 100));

      if (d.approved) {
        if (section === "availability" || section === "calendar") {
          setAvailability(await apiGet("/v1/doctor/availability"));
        } else if (section === "appointments" || section === "referrals") {
          const ap = await apiGet<{ appointments: Array<Record<string, unknown>> }>("/v1/doctor/appointments");
          setAppointments(ap.appointments || []);
        } else if (section === "workspace" && appointmentId) {
          setWorkspace(await apiGet(`/v1/doctor/appointments/${appointmentId}/workspace`));
        }
      }
    } catch (err) {
      pushToast({ title: "Doctor data load error", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, [section, appointmentId, pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleOnline = async () => {
    if (!dash) return;
    const next = !Boolean(dash.doctor_profile?.is_online_now);
    await apiPatch("/v1/doctor/online-status", { is_online_now: next });
    pushToast({ title: next ? "Doctor status set to Online Now" : "Doctor set to Scheduled Offline", tone: "info" });
    await loadData();
  };

  const generateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiPost<{ created_count: number }>("/v1/doctor/slots/generate", {
        date_local: slotDate,
        start_hhmm: slotStart,
        end_hhmm: slotEnd,
        slot_duration_minutes: 30,
        modality: "ONLINE_DEMO",
      });
      pushToast({ title: `Generated ${res.created_count} Open Slots`, tone: "success" });
      await loadData();
    } catch (err) {
      pushToast({ title: "Slot generation rejected", description: err instanceof ApiError ? err.detail : "Overlap", tone: "danger" });
    }
  };

  const updateApptStatus = async (aptId: string, status: string) => {
    await apiPatch(`/v1/doctor/appointments/${aptId}/status`, { status });
    pushToast({ title: `Queue status -> ${status}`, tone: "success" });
    await loadData();
  };

  const saveNote = async (state: "DRAFT" | "SIGNED") => {
    if (!appointmentId) return;
    await apiPost(`/v1/doctor/appointments/${appointmentId}/notes`, {
      subjective_notes: subjective,
      assessment_summary: assessment,
      advice_summary: advice,
      state,
    });
    pushToast({ title: state === "SIGNED" ? "Clinical Note SIGNED" : "Draft Saved", tone: "success" });
    await loadData();
  };

  const issueERx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;
    const res = await apiPost<{ eprescription: { rx_reference: string } }>(`/v1/doctor/appointments/${appointmentId}/eprescription`, {
      diagnosis_summary: rxDiag,
      medications: [{ name: rxMedName, dose: rxDose, frequency: rxFreq }],
      advice_notes: advice || "Follow up if symptoms persist.",
    });
    pushToast({ title: `Signed Demo e-Rx Issued: ${res.eprescription.rx_reference}`, tone: "success" });
    await loadData();
  };

  return (
    <PortalLayout
      title={locale === "bn" ? "চিকিৎসক পোর্টাল" : "Doctor Clinical Workspace"}
      subtitle={String(dash?.doctor_profile?.display_name || "Verification & Assigned Queue")}
    >
      {loading && !dash ? (
        <Skeleton className="h-56 w-full" />
      ) : dash && !dash.approved ? (
        <div data-testid="doctor-pending-gate" className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-xl font-bold">Doctor Verification Status: {dash.verification_status}</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Public listings, slot generation, and consultations remain locked until an Admin approves your credentials.
              </p>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-amber-500/25">
            {dash.verification_events.map((ev) => (
              <div key={ev.id} className="text-xs flex justify-between">
                <span><strong>{ev.to_status}</strong> — {ev.reason}</span>
                <span className="font-mono text-[var(--color-text-muted)]">{ev.created_at_utc}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* OVERVIEW */}
          {section === "dashboard" && dash?.kpis && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-300 font-bold">STATUS: APPROVED</span>
                  <h2 className="font-bold text-lg">{String(dash.doctor_profile.display_name)}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleOnline()}
                  className={`min-h-11 px-4 rounded-xl font-semibold text-xs cursor-pointer ${
                    dash.doctor_profile.is_online_now ? "bg-emerald-600 text-white" : "border border-[var(--color-border)]"
                  }`}
                >
                  {dash.doctor_profile.is_online_now ? "Online Now (Active)" : "Go Online Now"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Active Patient Queue" value={String(dash.kpis.active_queue)} icon={ClipboardCheck} />
                <StatCard label="Completed Visits" value={String(dash.kpis.completed_consultations)} icon={CheckCircle2} />
                <StatCard label="Open Future Slots" value={String(dash.kpis.open_slots)} icon={CalendarClock} />
                <StatCard label="Simulated Gross Fee" value={formatBdtFromPoisha(dash.kpis.simulated_gross_poisha, locale)} icon={Stethoscope} />
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
                <h2 className="font-bold text-base">Assigned Patient Queue</h2>
                {(dash.upcoming_queue || []).map((item) => (
                  <div key={String(item.id)} className="p-3.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm">{String(item.patient_name)} ({String(item.booking_reference)})</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {formatDhakaDateTime(String(item.start_utc), locale)} • {String(item.visit_reason_summary || "")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={String(item.status)} />
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/consultations/${String(item.id)}`)}
                        className="min-h-11 px-3.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold cursor-pointer"
                      >
                        Open Workspace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* AVAILABILITY & SLOT GENERATOR */}
          {(section === "availability" || section === "calendar") && availability && (
            <div className="space-y-6">
              <form onSubmit={(e) => void generateSlots(e)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <label className="text-xs font-semibold space-y-1">
                  <span>Date (Asia/Dhaka)</span>
                  <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold space-y-1">
                  <span>Start HH:MM</span>
                  <input type="text" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold space-y-1">
                  <span>End HH:MM</span>
                  <input type="text" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <button type="submit" data-testid="generate-slots-btn" className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-xs cursor-pointer">
                  Generate 30m Slots
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availability.slots.map((s) => (
                  <div key={String(s.id)} className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold">{formatDhakaDateTime(String(s.start_utc), locale)}</div>
                      <div className="text-[var(--color-text-muted)]">{String(s.state)} • {String(s.modality)}</div>
                    </div>
                    {s.state === "OPEN" && (
                      <button
                        type="button"
                        onClick={() => void apiDelete(`/v1/doctor/slots/${String(s.id)}`).then(loadData)}
                        className="text-rose-600 font-semibold hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* APPOINTMENTS QUEUE */}
          {(section === "appointments" || section === "referrals") && (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={String(apt.id)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-base">{String(apt.patient_name)} — {String(apt.booking_reference)}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{formatDhakaDateTime(String(apt.start_utc), locale)} • {String(apt.visit_reason_summary || "")}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={String(apt.status)} />
                    <button type="button" onClick={() => void updateApptStatus(String(apt.id), "IN_CONSULTATION")} className="min-h-10 px-3 rounded-xl border border-[var(--color-border)] text-xs font-semibold cursor-pointer">
                      Start Consult
                    </button>
                    <button type="button" onClick={() => void updateApptStatus(String(apt.id), "COMPLETED")} className="min-h-10 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer">
                      Complete
                    </button>
                    <button type="button" onClick={() => navigate(`/doctor/consultations/${String(apt.id)}`)} className="min-h-10 px-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold cursor-pointer">
                      Workspace & e-Rx
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CONSULTATION WORKSPACE */}
          {section === "workspace" && workspace && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
                <h2 className="font-bold text-base flex items-center gap-2"><FileSignature className="w-4 h-4 text-[var(--color-primary)]" /> Clinical Consultation Note</h2>
                <textarea rows={3} value={subjective} onChange={(e) => setSubjective(e.target.value)} placeholder="Subjective complaints..." className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm" data-testid="doc-note-subjective" />
                <textarea rows={2} value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Clinical assessment summary..." className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm" />
                <textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Patient advice & follow-up..." className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void saveNote("DRAFT")} className="min-h-11 px-4 rounded-xl border border-[var(--color-border)] text-xs font-semibold cursor-pointer">
                    Save Draft
                  </button>
                  <button type="button" data-testid="doc-sign-note-btn" onClick={() => void saveNote("SIGNED")} className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold cursor-pointer">
                    Sign Clinical Note
                  </button>
                </div>
                <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                  {((workspace.notes as Array<Record<string, string>>) || []).map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-[var(--color-canvas)] text-xs">
                      <strong>[{n.state}]</strong> {n.assessment_summary || n.subjective_notes}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={(e) => void issueERx(e)} className="lg:col-span-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
                <h2 className="font-bold text-base flex items-center gap-2"><Pill className="w-4 h-4 text-emerald-500" /> Issue Signed Demo E-Prescription</h2>
                <input type="text" required value={rxDiag} onChange={(e) => setRxDiag(e.target.value)} placeholder="Diagnosis (Demo)" className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                <input type="text" required value={rxMedName} onChange={(e) => setRxMedName(e.target.value)} placeholder="Medicine Name" className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" required value={rxDose} onChange={(e) => setRxDose(e.target.value)} placeholder="Dose" className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                  <input type="text" required value={rxFreq} onChange={(e) => setRxFreq(e.target.value)} placeholder="Frequency" className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </div>
                <button type="submit" data-testid="doc-issue-erx-btn" className="w-full min-h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer">
                  Sign & Publish Demo e-Prescription
                </button>
                <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                  {((workspace.eprescriptions as Array<Record<string, string>>) || []).map((rx) => (
                    <div key={rx.id} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                      <strong>{rx.rx_reference}</strong> ({rx.status}) — {rx.diagnosis_summary}
                    </div>
                  ))}
                </div>
              </form>
            </div>
          )}

          {/* DOCTOR PROFILE SETTINGS */}
          {section === "profile" && dash && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void apiPatch("/v1/doctor/profile", {
                  bio: bioText,
                  consultation_fee_minor_poisha: Number(feeBdt) * 100,
                }).then(() => {
                  pushToast({ title: "Doctor Profile Updated", tone: "success" });
                  return loadData();
                });
              }}
              className="max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4"
            >
              <h2 className="font-bold text-base">Practice Settings & Consultation Fee</h2>
              <label className="block text-xs font-semibold space-y-1">
                <span>Consultation Fee (BDT)</span>
                <input type="number" min={0} max={5000} value={feeBdt} onChange={(e) => setFeeBdt(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
              </label>
              <label className="block text-xs font-semibold space-y-1">
                <span>Clinical Bio</span>
                <textarea rows={3} value={bioText} onChange={(e) => setBioText(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm" />
              </label>
              <button type="submit" className="min-h-11 px-5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-xs cursor-pointer">
                Save Profile
              </button>
            </form>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
