import { useCallback, useEffect, useState } from "react";
import { PhoneCall, ShieldCheck } from "lucide-react";
import { ApiError, apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { useI18n } from "../lib/i18n";
import { PortalLayout } from "../components/layout/PortalLayout";
import { Skeleton, StatusBadge, useToast } from "../components/ui";
import { SmartHealthIdCard } from "../components/portal/SmartHealthIdCard";
import { LiveConsultationCallStudio } from "../components/consultations/LiveConsultationCallStudio";

export function SupportPortalPage({ section = "dashboard" }: { section?: string }) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const { pushToast } = useToast();
  const [showVoiceDesk, setShowVoiceDesk] = useState(false);

  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [tickets, setTickets] = useState<Array<Record<string, unknown>>>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<{ ticket: Record<string, unknown>; messages: Array<Record<string, unknown>>; redacted_fields: string[] } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
  const [zeroPhiProof, setZeroPhiProof] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiGet<Record<string, unknown>>("/v1/support/dashboard");
      setDash(d);
      const t = await apiGet<{ tickets: Array<Record<string, unknown>> }>("/v1/support/tickets");
      setTickets(t.tickets || []);
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

  return (
    <PortalLayout
      title={locale === "bn" ? "সাপোর্ট হেল্পডেস্ক (Zero-PHI)" : "Support Helpdesk (Zero-PHI Isolation)"}
      subtitle={String(dash?.zero_phi_policy || "Clinical diagnoses, prescriptions, OCR fields, and symptoms are permanently redacted.")}
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
                <strong>Strict Zero-PHI Mode Active:</strong> Only requester contact details, ticket logs, booking reference, and demo payment status are visible.
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
                    subtitle="Ticketing, Refunds & Non-Clinical Triage"
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
                      <div className="text-[11px] text-slate-400">In Progress</div>
                      <div className="text-2xl font-black font-mono text-amber-300 mt-1">
                        {(kpis.in_progress_count || 0) + (kpis.waiting_count || 0)}
                      </div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] text-slate-400">Escalated</div>
                      <div className="text-2xl font-black font-mono text-rose-400 mt-1">{kpis.escalated_count || 0}</div>
                    </div>
                    <div className="bento-card p-4 rounded-2xl">
                      <div className="text-[11px] text-slate-400">Resolved</div>
                      <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{kpis.resolved_count || 0}</div>
                    </div>
                  </div>

                  <div className="bento-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-amber-300 font-bold">SUPPORT AUDIO HELPLINE • ZERO-PHI</div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Handle patient audio support calls &amp; booking enquiries without reading clinical notes.
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

          {section === "faq" ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3 text-sm">
              <h2 className="font-bold text-base">Standard Zero-PHI Support Macros</h2>
              <p className="text-[var(--color-text-muted)]">1. Demo payment checks: request booking_reference / DEMO-RCP number only — never request bKash PIN, OTP, or card CVV.</p>
              <p className="text-[var(--color-text-muted)]">2. Clinical symptom requests: advise user to message or book their approved doctor; Support agents never interpret symptoms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Ticket Queue */}
              <div className="lg:col-span-5 space-y-2.5">
                <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--color-text-muted)]">Ticket Inbox</h2>
                {tickets.map((t) => (
                  <button
                    key={String(t.id)}
                    type="button"
                    data-testid={`support-ticket-${String(t.id)}`}
                    onClick={() => setSelectedId(String(t.id))}
                    className={`w-full p-4 rounded-2xl border text-left transition cursor-pointer ${
                      selectedId === String(t.id)
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs">{String(t.ticket_number)}</span>
                      <StatusBadge status={String(t.status)} />
                    </div>
                    <p className="font-semibold text-sm mt-1">{String(t.subject)}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{String(t.requester_name)} • Ref: {String(t.appointment_ref || "N/A")}</p>
                  </button>
                ))}
              </div>

              {/* Ticket Detail & Zero-PHI Replies */}
              <div className="lg:col-span-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
                {detail ? (
                  <>
                    <div className="flex flex-wrap justify-between items-start gap-3 border-b border-[var(--color-border)] pb-3">
                      <div>
                        <h2 className="font-bold text-lg">{String(detail.ticket.ticket_number)}: {String(detail.ticket.subject)}</h2>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Requester: {String(detail.ticket.requester_name)} • Booking: {String(detail.ticket.appointment_ref || "None")} • Payment: {String(detail.ticket.payment_ref || "None")} ({String(detail.ticket.payment_status || "N/A")})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void escalateTicket()} data-testid="support-escalate-btn" className="min-h-10 px-3 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer">
                          Escalate to Admin
                        </button>
                        <button type="button" onClick={() => void apiPatch(`/v1/support/tickets/${selectedId}/status`, { status: "RESOLVED" }).then(loadTickets)} className="min-h-10 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer">
                          Mark Resolved
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-muted)]">
                      Redacted PHI columns excluded from query: {detail.redacted_fields.join(", ")}
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {detail.messages.map((m) => (
                        <div
                          key={String(m.id)}
                          className={`p-3 rounded-xl text-xs border ${
                            m.visibility === "INTERNAL"
                              ? "bg-amber-500/12 border-amber-500/40"
                              : "bg-[var(--color-canvas)] border-[var(--color-border)]"
                          }`}
                        >
                          <div className="flex justify-between font-bold mb-1">
                            <span>{String(m.sender_name)} ({String(m.sender_role)})</span>
                            <span className="font-mono text-[11px]">{String(m.visibility)}</span>
                          </div>
                          <p>{String(m.body_text)}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={(e) => void sendReply(e)} className="space-y-3 pt-2 border-t border-[var(--color-border)]">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setVisibility("PUBLIC")}
                          className={`min-h-10 px-3 rounded-xl text-xs font-semibold cursor-pointer ${visibility === "PUBLIC" ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]" : "border border-[var(--color-border)]"}`}
                        >
                          Public Reply (Visible to User)
                        </button>
                        <button
                          type="button"
                          data-testid="support-internal-mode-btn"
                          onClick={() => setVisibility("INTERNAL")}
                          className={`min-h-10 px-3 rounded-xl text-xs font-semibold cursor-pointer ${visibility === "INTERNAL" ? "bg-amber-600 text-white" : "border border-[var(--color-border)]"}`}
                        >
                          Internal Staff Note Only
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={visibility === "INTERNAL" ? "Internal staff note (hidden from patient)..." : "Reply to requester..."}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm"
                        data-testid="support-reply-textarea"
                      />
                      <button type="submit" data-testid="support-reply-submit-btn" className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold cursor-pointer">
                        Send {visibility} Note
                      </button>
                    </form>
                  </>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">Select a ticket to view Zero-PHI metadata.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
