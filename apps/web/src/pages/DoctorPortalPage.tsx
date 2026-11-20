import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  CreditCard,
  FileSignature,
  Pill,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Video,
  Wallet,
  Zap,
} from "lucide-react";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { formatBdtFromPoisha, formatDhakaDateTime } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PortalLayout } from "../components/layout/PortalLayout";
import { Skeleton, StatusBadge, useToast } from "../components/ui";
import { SmartHealthIdCard } from "../components/portal/SmartHealthIdCard";
import { LiveConsultationCallStudio } from "../components/consultations/LiveConsultationCallStudio";
import { AiHealthAssistant } from "../components/ai/AiHealthAssistant";

interface DoctorAiDraft {
  id: string;
  module_key: string;
  model_id: string;
  input_summary: string;
  confidence_score: number;
  patient_name?: string;
  submitted_by_name?: string;
  doctor_review_status: string;
  doctor_notes?: string;
  created_at_utc: string;
}

export interface DoctorTransactionItem {
  id: string;
  txn_ref: string;
  receipt_number: string;
  item_title: string;
  revenue_stream: string;
  payer_name_masked: string;
  patient_name: string;
  booking_reference: string;
  gross_amount_minor_poisha: number;
  commission_rate_pct: number;
  commission_minor_poisha: number;
  net_partner_payout_minor_poisha: number;
  status: string;
  gateway_method: string;
  billing_month: string;
  created_at_utc: string;
}

export interface DoctorWallet {
  doctor_id: string;
  doctor_name: string;
  bmdc_reg: string;
  consultation_fee_bdt: number;
  commission_rate_pct: number;
  clinician_payout_pct: number;
  total_consultations_count: number;
  gross_consultations_poisha: number;
  platform_commission_poisha: number;
  net_earned_poisha: number;
  available_balance_poisha: number;
  settled_payout_poisha: number;
  pending_payout_poisha: number;
  payout_account: {
    account_code: string;
    provider_name: string;
    account_number_masked: string;
  };
  payout_schedule: string;
  transactions: DoctorTransactionItem[];
}

interface DoctorDashResponse {
  approved: boolean;
  verification_status: string;
  doctor_profile: Record<string, unknown>;
  verification_events: Array<{ id: string; to_status: string; reason: string; created_at_utc: string }>;
  kpis?: {
    active_queue: number;
    completed_consultations: number;
    open_slots: number;
    simulated_gross_poisha: number;
    net_earned_poisha?: number;
    available_balance_poisha?: number;
  };
  wallet?: DoctorWallet;
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
  const [aiDraftQueue, setAiDraftQueue] = useState<DoctorAiDraft[]>([]);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [wallet, setWallet] = useState<DoctorWallet | null>(null);
  const [walletFilter, setWalletFilter] = useState<string>("ALL");
  const [settlingPayout, setSettlingPayout] = useState(false);

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
      if (d.wallet) {
        setWallet(d.wallet);
      }
      setBioText(String(d.doctor_profile?.bio || ""));
      setFeeBdt(Math.round(Number(d.doctor_profile?.consultation_fee_minor_poisha || 50000) / 100));

      if (d.approved) {
        try {
          const qRes = await apiGet<{ drafts: DoctorAiDraft[] }>("/v1/ai/drafts/doctor-queue");
          setAiDraftQueue(qRes.drafts || []);
        } catch {
          // Non-fatal draft queue catch
        }

        if (section === "wallet") {
          try {
            const w = await apiGet<DoctorWallet>("/v1/doctor/wallet");
            if (w) setWallet(w);
          } catch {
            // Keep d.wallet as fallback
          }
        } else if (section === "availability" || section === "calendar") {
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

  const reviewAiDraft = async (draftId: string, reviewStatus: "CLINICIAN_REVIEWED" | "FLAGGED_INCONCLUSIVE") => {
    const note = (draftNotes[draftId] || "").trim() || "Reviewed research draft alongside clinical encounter context.";
    await apiPost(`/v1/ai/drafts/${draftId}/review`, {
      doctor_review_status: reviewStatus,
      doctor_notes: note,
    });
    pushToast({ title: `AI Draft marked ${reviewStatus}`, tone: "success" });
    await loadData();
  };

  const renderAiDraftsPanel = () => (
    <div className="rounded-2xl border border-sky-500/35 bg-[var(--color-surface)] p-5 space-y-3" data-testid="doctor-ai-drafts-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-base">Patient Consented AI Research Drafts &amp; OCR Review ({aiDraftQueue.length})</h2>
        <span className="font-mono text-[11px] text-amber-600 dark:text-amber-300">NON-DIAGNOSTIC • CLINICIAN VERIFICATION</span>
      </div>
      {aiDraftQueue.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">No patient AI drafts shared for review yet.</p>
      ) : (
        aiDraftQueue.map((d) => (
          <div key={d.id} className="p-4 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-sm">{d.patient_name || d.submitted_by_name}</span> •{" "}
                <span className="font-mono text-sky-600 dark:text-sky-300">{d.module_key}</span> ({d.model_id})
              </div>
              <StatusBadge status={d.doctor_review_status} />
            </div>
            <div className="font-mono text-xs">{d.input_summary}</div>
            {d.doctor_notes && <div className="text-emerald-600 dark:text-emerald-300">Signed Note: {d.doctor_notes}</div>}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={draftNotes[d.id] ?? d.doctor_notes ?? ""}
                onChange={(e) => setDraftNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                placeholder="Add clinician review remarks (visible to patient)..."
                className="flex-1 min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
              />
              <button
                type="button"
                onClick={() => void reviewAiDraft(d.id, "CLINICIAN_REVIEWED")}
                className="min-h-10 px-3.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
              >
                Sign Clinician Review
              </button>
              <button
                type="button"
                onClick={() => void reviewAiDraft(d.id, "FLAGGED_INCONCLUSIVE")}
                className="min-h-10 px-3 rounded-lg border border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold cursor-pointer"
              >
                Flag Inconclusive
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const handleRequestPayout = async () => {
    setSettlingPayout(true);
    try {
      const res = await apiPost<{ message: string; wallet: DoctorWallet }>("/v1/doctor/wallet/payout-request", {});
      setWallet(res.wallet);
      pushToast({ title: "Settlement Requested", description: res.message, tone: "success" });
      await loadData();
    } catch (err) {
      pushToast({ title: "Settlement Failed", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    } finally {
      setSettlingPayout(false);
    }
  };

  const renderDoctorWalletAndHistory = (compact = false) => {
    const w = wallet || dash?.wallet;
    if (!w) {
      return (
        <div className="bento-card rounded-2xl p-8 text-center text-slate-400 font-mono text-xs space-y-4">
          <div className="animate-pulse flex items-center justify-center gap-2 text-cyan-300">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{locale === "bn" ? "চিকিৎসকের ওয়ালেট ও ব্যালেন্স লেজার লোড হচ্ছে..." : "Loading clinician balance ledger..."}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="min-h-9 px-4 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {locale === "bn" ? "পুনরায় লোড করুন" : "Reload Balance Ledger"}
          </button>
        </div>
      );
    }

    const filteredTransactions = (w.transactions || []).filter((tx) => {
      if (walletFilter === "ALL") return true;
      return tx.status === walletFilter;
    });

    return (
      <div className="space-y-6" data-testid="doctor-wallet-balance-system">
        {/* 4 Balance & Payout Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bento-card rounded-2xl p-4 border border-emerald-500/35 bg-emerald-950/20">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
              <span>{locale === "bn" ? "উত্তোলনযোগ্য ব্যালেন্স" : "AVAILABLE PAYOUT BALANCE"}</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1.5" data-testid="doctor-available-balance">
              {formatBdtFromPoisha(w.available_balance_poisha, locale)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              85% Net Clinician Share (Ready for BRAC Bank EFT)
            </p>
          </div>

          <div className="bento-card rounded-2xl p-4 border border-cyan-500/35 bg-cyan-950/20">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
              <span>{locale === "bn" ? "সর্বমোট অর্জিত আয়" : "LIFETIME NET EARNINGS"}</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black font-mono text-cyan-300 mt-1.5" data-testid="doctor-lifetime-earnings">
              {formatBdtFromPoisha(w.net_earned_poisha, locale)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {w.total_consultations_count} Paid Video Consultations
            </p>
          </div>

          <div className="bento-card rounded-2xl p-4 border border-amber-500/35 bg-amber-950/20">
            <div className="flex items-center justify-between text-xs font-mono text-amber-300">
              <span>{locale === "bn" ? "প্ল্যাটফর্ম ফি কর্তন" : "PLATFORM COMMISSION (-15%)"}</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-300 mt-1.5" data-testid="doctor-platform-fee">
              {formatBdtFromPoisha(w.platform_commission_poisha, locale)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              15% ShasthoSetu Server, WebRTC &amp; Escrow Fee
            </p>
          </div>

          <div className="bento-card rounded-2xl p-4 border border-indigo-500/35 bg-indigo-950/20">
            <div className="flex items-center justify-between text-xs font-mono text-indigo-300">
              <span>{locale === "bn" ? "মোট গ্রস ফি" : "GROSS PATIENT INFLOW"}</span>
              <CreditCard className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1.5">
              {formatBdtFromPoisha(w.gross_consultations_poisha, locale)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Standard Fee: ৳{w.consultation_fee_bdt} / Tele-call
            </p>
          </div>
        </div>

        {/* Bank Disbursement Info & Settlement Action Card */}
        <div className="bento-card rounded-3xl p-5 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                  SETTLEMENT CHANNEL: {w.payout_account.account_code}
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">
                  85% CLINICIAN / 15% PLATFORM
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {w.payout_account.provider_name}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {w.payout_account.account_number_masked} • {w.payout_schedule}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={settlingPayout}
              onClick={() => void handleRequestPayout()}
              className="min-h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-110 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              {settlingPayout ? "Processing Settlement..." : (locale === "bn" ? "ব্যালেন্স সেটেলমেন্ট করুন" : "Reconcile & Request Payout")}
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              className="min-h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Detailed Consultation Transaction History Table */}
        {!compact && (
          <div className="bento-card rounded-3xl p-5 space-y-4 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">
                  {locale === "bn" ? "কনসালটেশন ও আয় ইতিহাস" : "CONSULTATION EARNINGS & TRANSACTION HISTORY"} ({filteredTransactions.length} RECORDS)
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {locale === "bn"
                    ? "প্রতিটি ভিডিও কলের ফি, প্ল্যাটফর্ম কমিশন (১৫%) ও চিকিৎসকের প্রকৃত প্রাপ্য (৮৫%)"
                    : "Individual Consultation Fees, 15% Platform Deduction & 85% Net Clinician Credit"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={walletFilter}
                  onChange={(e) => setWalletFilter(e.target.value)}
                  className="min-h-9 rounded-xl bg-slate-900 border border-slate-700 px-3 text-xs text-white"
                >
                  <option value="ALL">All Statuses ({w.transactions.length})</option>
                  <option value="SETTLED">Settled via BRAC Bank</option>
                  <option value="PAID">Paid / Ready for Payout</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-8 text-center text-slate-400 text-xs font-mono">
                {locale === "bn"
                  ? "কোনো কনসালটেশন ট্রানজেকশন রেকর্ড পাওয়া যায়নি।"
                  : "No consultation transactions found for the selected filter."}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    data-testid={`doctor-txn-row-${tx.txn_ref}`}
                    className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-cyan-300">{tx.txn_ref}</span>
                      <span className="font-mono text-[11px] text-emerald-300">({tx.receipt_number})</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/30">
                        {tx.gateway_method
                          .replace(/DEMO_BKASH|DEMO_MFS/g, "Demo Payment MFS")
                          .replace(/DEMO_NAGAD|DEMO_DIRECT/g, "Demo Payment Direct")
                          .replace(/DEMO_CARD/g, "Demo Card Pay")
                          .replace(/DEMO_BANK/g, "Demo Bank Settlement")}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {tx.billing_month}
                      </span>
                    </div>
                    <div className="font-semibold text-white">{tx.item_title}</div>
                    <div className="text-[11px] text-slate-400">
                      Patient: <strong className="text-slate-200">{tx.patient_name}</strong> • Time:{" "}
                      <span className="font-mono text-slate-300">{formatDhakaDateTime(tx.created_at_utc, locale)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="text-[11px] text-slate-400">
                        Gross Fee: {formatBdtFromPoisha(tx.gross_amount_minor_poisha, locale)}
                      </div>
                      <div className="text-[10px] text-amber-400">
                        Platform Comm (-15%): -{formatBdtFromPoisha(tx.commission_minor_poisha, locale)}
                      </div>
                      <div className="text-sm font-black text-emerald-400">
                        Net Payout (+85%): {formatBdtFromPoisha(tx.net_partner_payout_minor_poisha, locale)}
                      </div>
                    </div>
                    <StatusBadge status={tx.status === "SETTLED" || tx.status === "PAID" ? "CONFIRMED" : "CANCELLED"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
              {/* Land-Guard Top Grid: 3D Clinician ID Card + 4 Bento KPIs + Live Room Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <SmartHealthIdCard
                    role="DOCTOR"
                    fullName={String(dash.doctor_profile.display_name || "Dr. Farhana Rahman")}
                    idCode={String(dash.doctor_profile.bmdc_demo_reg || "BMDC-DEMO-91044")}
                    subtitle={`${String(dash.doctor_profile.specialty || "OB-GYN & PCOS Specialist")} • ${String(dash.doctor_profile.degrees || "MBBS, FCPS")}`}
                    locationLabel={String(dash.doctor_profile.practice_location || "ShasthoSetu Central Model Hospital (Demo)")}
                    bloodGroup="A+"
                    avatarUrl={String(dash.doctor_profile.avatar_url || "/images/doctors/doc-f-01.jpg")}
                  />
                </div>

                <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] font-medium text-slate-400">Active Queue</div>
                      <div className="text-2xl font-black font-mono text-white mt-1">{dash.kpis.active_queue}</div>
                      <div className="text-[10px] font-mono text-cyan-400 mt-1">Ready patients</div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] font-medium text-slate-400">Completed</div>
                      <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{dash.kpis.completed_consultations}</div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-1">Signed e-Rx</div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] font-medium text-slate-400">Open Slots</div>
                      <div className="text-2xl font-black font-mono text-indigo-300 mt-1">{dash.kpis.open_slots}</div>
                      <div className="text-[10px] font-mono text-indigo-300 mt-1">Upcoming availability</div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] font-medium text-slate-400">Simulated Gross</div>
                      <div className="text-xl font-black font-mono text-amber-300 mt-1">
                        {formatBdtFromPoisha(dash.kpis.simulated_gross_poisha, locale)}
                      </div>
                      <div className="text-[10px] font-mono text-amber-300 mt-1">Demo ledger</div>
                    </div>
                  </div>

                  <div className="bento-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono text-emerald-400 font-bold">STATUS: APPROVED • VIDEO/AUDIO DESK</span>
                      <h2 className="font-bold text-lg text-white">{String(dash.doctor_profile.display_name)}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleOnline()}
                        className={`min-h-11 px-4 rounded-xl font-semibold text-xs cursor-pointer ${
                          dash.doctor_profile.is_online_now
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : "border border-slate-700 bg-slate-900 text-slate-200"
                        }`}
                      >
                        {dash.doctor_profile.is_online_now ? "Online Now (Active)" : "Go Online Now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const firstApt = dash.upcoming_queue?.[0]?.id;
                          navigate(firstApt ? `/doctor/consultations/${String(firstApt)}` : "/doctor/appointments");
                        }}
                        className="min-h-11 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-4 h-4" /> Open Live Video/Audio Room
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bento-card rounded-2xl p-5 space-y-3">
                <h2 className="font-bold text-base text-white">Assigned Patient Queue</h2>
                {(dash.upcoming_queue || []).map((item) => (
                  <div key={String(item.id)} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-white">{String(item.patient_name)} ({String(item.booking_reference)})</div>
                      <div className="text-xs text-slate-400">
                        {formatDhakaDateTime(String(item.start_utc), locale)} • {String(item.visit_reason_summary || "")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={String(item.status)} />
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/consultations/${String(item.id)}`)}
                        className="min-h-11 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" /> Open Consultation Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Doctor Balance & Earnings Overview (Compact) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base text-white">Consultation Earnings & Payout Overview</h2>
                  <button
                    type="button"
                    onClick={() => navigate("/doctor/wallet")}
                    className="text-xs text-cyan-400 hover:underline font-mono"
                  >
                    View Full Transaction History →
                  </button>
                </div>
                {renderDoctorWalletAndHistory(true)}
              </div>

              {/* Patient-Consented AI Research Draft Review Queue */}
              {renderAiDraftsPanel()}
            </>
          )}

          {/* DOCTOR CLINICAL AI ASSISTANT */}
          {section === "ai-assistant" && (
            <div className="space-y-4">
              <AiHealthAssistant portalMode="doctor" />
            </div>
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
            <div className="space-y-6">
              <LiveConsultationCallStudio
                roomId={appointmentId || "apt-demo-9001"}
                userRole="DOCTOR"
                counterpartyName={String(workspace.patient_name || "রহিমা বেগম")}
                counterpartyRole="Patient Consultation • Clinical Call"
                counterpartyAvatar="/images/doctors/doc-f-02.jpg"
                initialMode="VIDEO"
              />
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
              <div className="lg:col-span-12">{renderAiDraftsPanel()}</div>
            </div>
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

          {/* DOCTOR WALLET & BALANCE SYSTEM */}
          {section === "wallet" && renderDoctorWalletAndHistory(false)}
        </div>
      )}
    </PortalLayout>
  );
}
