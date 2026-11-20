import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  LifeBuoy,
  Lock,
  PhoneCall,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { ApiError, apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { formatBdtFromPoisha } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PortalLayout } from "../components/layout/PortalLayout";
import { Skeleton, StatusBadge, useToast } from "../components/ui";
import { SmartHealthIdCard } from "../components/portal/SmartHealthIdCard";
import { LiveConsultationCallStudio } from "../components/consultations/LiveConsultationCallStudio";
import { AiHealthAssistant } from "../components/ai/AiHealthAssistant";
import { playNotificationSound } from "../utils/soundEffects";

interface SupportZeroPhiTxn {
  id: string;
  txn_ref: string;
  receipt_number: string;
  revenue_stream: string;
  support_safe_label: string;
  payer_name_masked: string;
  gateway_method: string;
  bank_account_code: string;
  bank_provider_name: string;
  gross_amount_minor_poisha: number;
  commission_rate_pct: number;
  commission_minor_poisha: number;
  status: string;
  billing_month: string;
  created_at_utc: string;
}

export function SupportPortalPage({ section = "dashboard" }: { section?: string }) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const { pushToast } = useToast();
  const [showVoiceDesk, setShowVoiceDesk] = useState(false);

  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [tickets, setTickets] = useState<Array<Record<string, unknown>>>([]);
  const [txns, setTxns] = useState<SupportZeroPhiTxn[]>([]);
  const [txnQuery, setTxnQuery] = useState("");
  const [activeDeskView, setActiveDeskView] = useState<"TICKETS" | "TRANSACTIONS">("TICKETS");

  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<{ ticket: Record<string, unknown>; messages: Array<Record<string, unknown>>; redacted_fields: string[] } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
  const [zeroPhiProof, setZeroPhiProof] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t, txRes] = await Promise.all([
        apiGet<Record<string, unknown>>("/v1/support/dashboard"),
        apiGet<{ tickets: Array<Record<string, unknown>> }>("/v1/support/tickets"),
        apiGet<{ transactions: SupportZeroPhiTxn[] }>("/v1/support/transactions"),
      ]);
      setDash(d);
      setTickets(t.tickets || []);
      setTxns(txRes.transactions || []);
      if (!selectedId && t.tickets?.length > 0) {
        setSelectedId(String(t.tickets[0].id));
      }
    } catch (err) {
      pushToast({ title: "Support load error", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, [selectedId, pushToast]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      try {
        const res = await apiGet<{ ticket: Record<string, unknown>; messages: Array<Record<string, unknown>>; redacted_fields: string[] }>(`/v1/support/tickets/${selectedId}`);
        setDetail(res);
      } catch {
        setDetail(null);
      }
    })();
  }, [selectedId]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim()) return;
    await apiPost(`/v1/support/tickets/${selectedId}/reply`, { body_text: replyText, visibility });
    setReplyText("");
    pushToast({ title: `${visibility} message posted`, tone: "success" });
    const res = await apiGet<typeof detail>(`/v1/support/tickets/${selectedId}`);
    setDetail(res);
    await loadTickets();
  };

  const escalateTicket = async () => {
    if (!selectedId) return;
    await apiPost(`/v1/support/tickets/${selectedId}/escalate`, { reason: "Escalated by Support desk to Admin review", priority: "URGENT" });
    pushToast({ title: "Ticket Escalated to Admin (URGENT)", tone: "warning" });
    await loadTickets();
  };

  const flagTxnDispute = async (txnId: string, txnRef: string) => {
    await apiPost(`/v1/support/transactions/${txnId}/flag-dispute`, {
      reason: `Flagged by Support Desk (${txnRef}) for Admin Treasury review`,
    });
    pushToast({
      title: `Transaction ${txnRef} Flagged as DISPUTED`,
      description: "Escalated to Admin Treasury without exposing clinical PHI.",
      tone: "warning",
    });
    await loadTickets();
  };

  const testZeroPhiGuard = async () => {
    try {
      await apiGet("/v1/support/clinical-guard/apt-demo-completed");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setZeroPhiProof(`HTTP 403 Verified: ${err.detail}`);
        pushToast({ title: "Zero-PHI Barrier Verified (403)", tone: "success" });
      }
    }
  };

  const kpis = (dash?.kpis as Record<string, number>) || {};
  const txnKpis = (dash?.transaction_kpis as Record<string, number>) || {};

  const filteredTxns = txns.filter((tx) => {
    const q = txnQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      tx.txn_ref.toLowerCase().includes(q) ||
      tx.receipt_number.toLowerCase().includes(q) ||
      tx.payer_name_masked.toLowerCase().includes(q) ||
      tx.gateway_method.toLowerCase().includes(q) ||
      tx.support_safe_label.toLowerCase().includes(q)
    );
  });

  return (
    <PortalLayout
      title={locale === "bn" ? "সাপোর্ট হেল্পডেস্ক ও ট্রানজেকশন মনিটর (Zero-PHI)" : "Support Helpdesk & TNX-Only Monitor (Zero-PHI Isolation)"}
      subtitle={String(dash?.zero_phi_policy || "Clinical diagnoses, prescriptions, medicine names, and lab results are permanently redacted.")}
    >
      {loading && !dash ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <div className="space-y-6">
          {/* Zero-PHI Guard Banner */}
          <div data-testid="support-zero-phi-banner" className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong>Strict Zero-PHI TNX-Only Policy Active:</strong> Support officers can verify payment transactions (`TXN-...` / `DEMO-RCP-...`), gateway status, and tickets, while clinical item names, medicines, lab panels, and doctor notes are permanently blocked (HTTP 403).
                {zeroPhiProof && <p className="font-mono text-emerald-600 dark:text-emerald-300 mt-1" data-testid="zero-phi-proof-text">{zeroPhiProof}</p>}
              </div>
            </div>
            <button
              type="button"
              data-testid="verify-zero-phi-btn"
              onClick={() => void testZeroPhiGuard()}
              className="min-h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              Verify Zero-PHI 403 Block
            </button>
          </div>

          {section === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <SmartHealthIdCard
                    role="SUPPORT"
                    fullName={user?.full_name || "Zero-PHI Support Officer"}
                    idCode="SUP-BD-204"
                    subtitle="TNX Billing Verification & Non-Clinical Triage"
                    locationLabel="ShasthoSetu Helpdesk • Dhaka"
                    bloodGroup="AB+"
                  />
                </div>

                <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] text-slate-400">Open Tickets</div>
                      <div className="text-2xl font-black font-mono text-cyan-300 mt-1">{kpis.open_count || 0}</div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] text-slate-400">Verified TNX Count</div>
                      <div className="text-2xl font-black font-mono text-emerald-400 mt-1" data-testid="support-txn-count">
                        {txnKpis.total_txns || txns.length}
                      </div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] text-slate-400">Escalated / Disputed</div>
                      <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                        {(kpis.escalated_count || 0) + (txnKpis.disputed_txns || 0)}
                      </div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] text-slate-400">Resolved Tickets</div>
                      <div className="text-2xl font-black font-mono text-amber-300 mt-1">{kpis.resolved_count || 0}</div>
                    </div>
                  </div>

                  <div className="bento-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-amber-300 font-bold">SUPPORT AUDIO HELPLINE • ZERO-PHI</div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Handle patient audio support calls &amp; TNX billing enquiries without reading clinical notes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVoiceDesk((v) => !v)}
                      className="min-h-11 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                      {showVoiceDesk ? "Hide Audio Call Desk" : "Accept Voice Call Line"}
                    </button>
                  </div>
                </div>
              </div>

              {showVoiceDesk && (
                <LiveConsultationCallStudio
                  roomId="support-helpline-demo"
                  counterpartyName="Incoming Support Inquiry (রহিমা বেগম)"
                  counterpartyRole="Zero-PHI Support Voice Line • Bookings & Billing"
                  counterpartyAvatar="/images/doctors/doc-f-02.jpg"
                  initialMode="AUDIO"
                />
              )}
            </div>
          )}

          {section === "ai-assistant" && (
            <div className="space-y-4">
              <AiHealthAssistant portalMode="support" />
            </div>
          )}

          {section === "faq" ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3 text-sm">
              <h2 className="font-bold text-base">Standard Zero-PHI Support Macros</h2>
              <p className="text-[var(--color-text-muted)]">1. Demo payment checks: request booking_reference / DEMO-RCP / TXN number only — never request MFS wallet PIN, OTP, or card CVV.</p>
              <p className="text-[var(--color-text-muted)]">2. Clinical symptom requests: advise user to message or book their approved doctor; Support agents never interpret symptoms or view medicine names.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Toggle between Support Tickets & Zero-PHI Transaction-Only Ledger */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="support-tab-tickets"
                    onClick={() => setActiveDeskView("TICKETS")}
                    className={`min-h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition ${
                      activeDeskView === "TICKETS"
                        ? "bg-cyan-400 text-slate-950 font-black"
                        : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-400/40"
                    }`}
                  >
                    <LifeBuoy className="w-4 h-4" /> Support Ticket Queue ({tickets.length})
                  </button>
                  <button
                    type="button"
                    data-testid="support-tab-transactions"
                    onClick={() => setActiveDeskView("TRANSACTIONS")}
                    className={`min-h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition ${
                      activeDeskView === "TRANSACTIONS"
                        ? "bg-emerald-400 text-slate-950 font-black"
                        : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-400/40"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Zero-PHI Transaction Monitor (TNX Only • {txns.length})
                  </button>
                </div>

                <span className="font-mono text-[11px] text-emerald-400">
                  Clinical Item &amp; Medicine Names Redacted • TNX Metadata Only
                </span>
              </div>

              {activeDeskView === "TRANSACTIONS" ? (
                <div className="bento-card rounded-3xl p-5 space-y-4 border border-emerald-500/35" data-testid="support-tnx-only-ledger">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-300">
                        SUPPORT DESK • ZERO-PHI TRANSACTION-ONLY VIEW (NO CLINICAL / MEDICINE DETAILS)
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        {locale === "bn"
                          ? "শুধুমাত্র ট্রানজেকশন ও রসিদ ভেরিফিকেশন লেজার (চিকিৎসা তথ্য গোপন)"
                          : "Live Payment Transaction (TNX) Verification Ledger"}
                      </h3>
                    </div>

                    <div className="relative min-w-[260px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={txnQuery}
                        onChange={(e) => setTxnQuery(e.target.value)}
                        placeholder="Search TXN-..., DEMO-RCP-..., bKash/Nagad..."
                        className="w-full min-h-9 pl-8 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                    {filteredTxns.map((tx) => (
                      <div
                        key={tx.id}
                        data-testid={`support-txn-row-${tx.txn_ref}`}
                        className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-cyan-300">{tx.txn_ref}</span>
                            <span className="font-mono text-[11px] text-emerald-300">Receipt: {tx.receipt_number}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300">
                              {tx.support_safe_label}
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/30">
                              {tx.bank_account_code} ({tx.gateway_method})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Masked Payer: <strong className="text-slate-200">{tx.payer_name_masked}</strong> • Billing Period:{" "}
                            <span className="font-mono text-cyan-300">{tx.billing_month}</span>
                          </div>
                          <div className="text-[10px] font-mono text-rose-300/90">
                            [PHI REDACTED: Medicine SKUs, Diagnostic Lab Panels &amp; Doctor Notes Hidden from Support]
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-right font-mono">
                            <div className="text-sm font-black text-white">
                              {formatBdtFromPoisha(tx.gross_amount_minor_poisha, locale)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Fee Tier: {tx.commission_rate_pct}%
                            </div>
                          </div>

                          <StatusBadge status={tx.status === "PAID" || tx.status === "SETTLED" ? "CONFIRMED" : "CANCELLED"} />

                          {tx.status !== "DISPUTED" && tx.status !== "REFUNDED" && (
                            <button
                              type="button"
                              onClick={() => void flagTxnDispute(tx.id, tx.txn_ref)}
                              className="min-h-8 px-3 rounded-xl border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3" /> Flag Dispute
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Ticket Queue */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                        <LifeBuoy className="w-4 h-4 text-cyan-400" /> Ticket Queue ({tickets.length})
                      </h2>
                      <button
                        type="button"
                        onClick={() => void loadTickets()}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Refresh tickets"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                      {tickets.map((t) => {
                        const isSelected = selectedId === String(t.id);
                        return (
                          <div
                            key={String(t.id)}
                            onClick={() => setSelectedId(String(t.id))}
                            data-testid={`support-ticket-${String(t.id)}`}
                            className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                              isSelected
                                ? "border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/50"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-slate-600"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                                {String(t.ticket_number)}
                              </span>
                              <StatusBadge status={String(t.status)} />
                            </div>
                            <h4 className="font-bold text-sm text-white line-clamp-1">
                              {String(t.subject)}
                            </h4>
                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                              <span className="font-medium text-slate-300 flex items-center gap-1">
                                <User className="w-3 h-3 text-cyan-400" /> {String(t.requester_name)}
                              </span>
                              <span className="font-mono text-[10px] text-amber-300">
                                Ref: {String(t.appointment_ref || "N/A")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ticket Detail & Zero-PHI Replies */}
                  <div className="lg:col-span-7 rounded-3xl border border-cyan-500/30 bg-[#071229]/95 p-5 sm:p-6 flex flex-col h-[740px] shadow-2xl">
                    {detail ? (
                      <>
                        <div className="shrink-0 flex flex-wrap justify-between items-start gap-4 border-b border-slate-800 pb-4">
                          <div className="space-y-1 max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                                {String(detail.ticket.ticket_number)}
                              </span>
                              <StatusBadge status={String(detail.ticket.status)} />
                            </div>
                            <h2 className="font-black text-lg text-white">
                              {String(detail.ticket.subject)}
                            </h2>
                            <div className="text-xs text-slate-400 space-x-2">
                              <span>Requester: <strong className="text-slate-200">{String(detail.ticket.requester_name)}</strong></span>
                              <span>•</span>
                              <span>Booking: <span className="font-mono text-cyan-300">{String(detail.ticket.appointment_ref || "None")}</span></span>
                              <span>•</span>
                              <span>Payment: <span className="font-mono text-emerald-400">{String(detail.ticket.payment_status || "N/A")}</span></span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void (async () => {
                                  await apiPost(`/v1/support/tickets/${selectedId}/reply`, {
                                    body_text: "🟢 সাপোর্ট অফিসার চ্যাটে যুক্ত হয়েছেন। আসসালামু আলাইকুম, আমি কিভাবে সাহায্য করতে পারি?",
                                    visibility: "PUBLIC",
                                  });
                                  playNotificationSound();
                                  await apiPatch(`/v1/support/tickets/${selectedId}/status`, { status: "IN_PROGRESS" });
                                  await loadTickets();
                                })();
                              }}
                              className="min-h-10 px-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110 text-slate-950 text-xs font-black cursor-pointer inline-flex items-center gap-1.5 shadow-md transition"
                            >
                              🟢 Join Live Chat
                            </button>
                            <button
                              type="button"
                              onClick={() => void escalateTicket()}
                              data-testid="support-escalate-btn"
                              className="min-h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition shadow-md"
                            >
                              Escalate to Admin
                            </button>
                            <button
                              type="button"
                              onClick={() => void apiPatch(`/v1/support/tickets/${selectedId}/status`, { status: "RESOLVED" }).then(loadTickets)}
                              className="min-h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition shadow-md"
                            >
                              Mark Resolved
                            </button>
                          </div>
                        </div>

                        <div className="shrink-0 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-slate-300 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span><strong>Zero-PHI Enforcement:</strong> Clinical prose &amp; diagnosis redacted ({detail.redacted_fields.slice(0, 3).join(", ")}...)</span>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-300">Protected</span>
                        </div>

                        {/* Styled Chat Bubble Thread */}
                        <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-1 p-2">
                          {detail.messages.map((m) => {
                            const isInternal = m.visibility === "INTERNAL";
                            const isSupport = String(m.sender_role).toUpperCase() === "SUPPORT";

                            if (isInternal) {
                              return (
                                <div
                                  key={String(m.id)}
                                  className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-xs space-y-1.5 shadow-md"
                                >
                                  <div className="flex items-center justify-between font-bold text-amber-300 text-[11px]">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                                      INTERNAL STAFF NOTE (Hidden from Patient)
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">{String(m.sender_name)}</span>
                                  </div>
                                  <p className="text-amber-100 text-xs leading-relaxed">{String(m.body_text)}</p>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={String(m.id)}
                                className={`flex flex-col max-w-[85%] space-y-1 ${
                                  isSupport ? "ml-auto items-end" : "mr-auto items-start"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span className="font-semibold text-slate-300">
                                    {String(m.sender_name)} ({String(m.sender_role)})
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono text-cyan-300 text-[9px] uppercase">{String(m.visibility)}</span>
                                </div>
                                <div
                                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                                    isSupport
                                      ? "bg-gradient-to-r from-teal-900 to-cyan-900 text-cyan-50 border border-cyan-400/40 rounded-br-none shadow-md"
                                      : "bg-slate-900/90 text-slate-100 border border-slate-700/80 rounded-bl-none shadow-md"
                                  }`}
                                >
                                  <p>{String(m.body_text)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Compose Reply Area */}
                        <form onSubmit={(e) => void sendReply(e)} className="shrink-0 space-y-3 pt-3 border-t border-slate-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setVisibility("PUBLIC")}
                                className={`min-h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                                  visibility === "PUBLIC"
                                    ? "bg-cyan-500 text-slate-950 shadow-md"
                                    : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
                                }`}
                              >
                                💬 Public Reply (Visible to Patient)
                              </button>
                              <button
                                type="button"
                                data-testid="support-internal-mode-btn"
                                onClick={() => setVisibility("INTERNAL")}
                                className={`min-h-9 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                                  visibility === "INTERNAL"
                                    ? "bg-amber-500 text-slate-950 shadow-md"
                                    : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
                                }`}
                              >
                                🔒 Internal Staff Note Only
                              </button>
                            </div>

                            {/* Quick Macro Pills */}
                            <div className="flex items-center gap-1.5">
                              {[
                                "পেমেন্ট স্ট্যাটাস ভেরিফাইড (DEMO-RCP-9001)",
                                "ডাক্তারের শিডিউল কনফার্ম করা হয়েছে",
                              ].map((macro, mIdx) => (
                                <button
                                  key={mIdx}
                                  type="button"
                                  onClick={() => setReplyText(macro)}
                                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-400/40 text-[10px] text-slate-300 hover:text-white transition cursor-pointer"
                                >
                                  {macro.slice(0, 22)}...
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="relative">
                            <textarea
                              rows={3}
                              required
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={
                                visibility === "INTERNAL"
                                  ? "Type internal staff note (confidential, never shown to patient)..."
                                  : "Type clear, helpful reply to requester..."
                              }
                              className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                              data-testid="support-reply-textarea"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-mono">
                              Mode: <strong className={visibility === "PUBLIC" ? "text-cyan-300" : "text-amber-400"}>{visibility}</strong>
                            </span>
                            <button
                              type="submit"
                              data-testid="support-reply-submit-btn"
                              className={`min-h-11 px-5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-lg transition ${
                                visibility === "PUBLIC"
                                  ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:brightness-110 text-slate-950"
                                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Send {visibility} Note
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-sm">
                        Select a ticket from the inbox queue to view Zero-PHI communication log.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
