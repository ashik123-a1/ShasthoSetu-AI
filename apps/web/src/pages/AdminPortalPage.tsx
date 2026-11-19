import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ScrollText, ShieldCheck, Sliders } from "lucide-react";
import { ApiError, apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { formatBdtFromPoisha } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PortalLayout } from "../components/layout/PortalLayout";
import { Skeleton, StatusBadge, useToast } from "../components/ui";
import { SmartHealthIdCard } from "../components/portal/SmartHealthIdCard";
import { LandGuardBentoAnalytics } from "../components/portal/LandGuardBentoAnalytics";
import { AdminRagGovernance } from "../components/ai/AdminRagGovernance";

export function AdminPortalPage({ section = "dashboard" }: { section?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useI18n();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [doctors, setDoctors] = useState<Array<Record<string, unknown>>>([]);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [appointments, setAppointments] = useState<Array<Record<string, unknown>>>([]);
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [catalog, setCatalog] = useState<Record<string, Array<Record<string, unknown>>> | null>(null);
  const [escalations, setEscalations] = useState<Array<Record<string, unknown>>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, unknown>>>([]);
  const [researchData, setResearchData] = useState<Array<Record<string, unknown>>>([]);
  const [privacyProof, setPrivacyProof] = useState<string>("");

  // Staff provision state
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPass] = useState("StaffDemo#2026");
  const [staffRole, setStaffRole] = useState("SUPPORT");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setDash(await apiGet("/v1/admin/dashboard"));
      if (section === "doctors") {
        setDoctors((await apiGet<{ doctors: Array<Record<string, unknown>> }>("/v1/admin/doctors")).doctors);
      } else if (section === "users") {
        setUsers((await apiGet<{ users: Array<Record<string, unknown>> }>("/v1/admin/users")).users);
      } else if (section === "appointments") {
        setAppointments((await apiGet<{ appointments: Array<Record<string, unknown>> }>("/v1/admin/appointments")).appointments);
      } else if (section === "payments") {
        setPayments((await apiGet<{ payments: Array<Record<string, unknown>> }>("/v1/admin/payments")).payments);
      } else if (section === "config") {
        setCatalog(await apiGet("/v1/admin/catalog"));
      } else if (section === "support") {
        setEscalations((await apiGet<{ escalations: Array<Record<string, unknown>> }>("/v1/admin/escalations")).escalations);
      } else if (section === "audit") {
        setAuditLogs((await apiGet<{ audit_logs: Array<Record<string, unknown>> }>("/v1/admin/audit-logs")).audit_logs);
      } else if (section === "research") {
        setResearchData((await apiGet<{ models: Array<Record<string, unknown>> }>("/v1/public/research")).models);
      }
    } catch (err) {
      pushToast({ title: "Admin fetch error", description: err instanceof ApiError ? err.detail : "Error", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, [section, pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const verifyDoctor = async (docId: string, decision: "APPROVED" | "REJECTED" | "SUSPENDED") => {
    await apiPost(`/v1/admin/doctors/${docId}/verify`, { decision, reason: `Admin action: ${decision}` });
    pushToast({ title: `Doctor status -> ${decision}`, tone: decision === "APPROVED" ? "success" : "warning" });
    await loadData();
  };

  const refundDemoPayment = async (payId: string) => {
    await apiPost(`/v1/admin/payments/${payId}/refund`, { reason: "Admin simulated demo refund" });
    pushToast({ title: "Demo Payment marked DEMO_REFUNDED", tone: "info" });
    await loadData();
  };

  const testClinicalRedaction = async () => {
    try {
      await apiGet("/v1/admin/clinical-notes/sample-note-guard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setPrivacyProof(`HTTP 403 Verified: ${err.detail}`);
        pushToast({ title: "Privacy Boundary Enforced (403)", tone: "success" });
        await loadData();
      }
    }
  };

  const uStats = (dash?.users as Record<string, number>) || {};
  const dStats = (dash?.doctors as Record<string, number>) || {};
  const pStats = (dash?.demo_payments as Record<string, number>) || {};

  return (
    <PortalLayout
      title={locale === "bn" ? "অ্যাডমিন গভর্নেন্স পোর্টাল" : "Admin Governance & Audit"}
      subtitle={locale === "bn" ? "ডাক্তার অনুমোদন, স্টাফ তৈরি, ডেমো রিফান্ড ও ক্লিনিকাল-নোট প্রাইভেসি আইসোলেশন" : "Operational metrics, doctor approvals, feature flags & immutable audit logs"}
    >
      {loading && !dash ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <div className="space-y-6">
          {section === "dashboard" && dash && (
            <div className="space-y-6">
              <LandGuardBentoAnalytics
                usersCount={uStats.total_users || 0}
                approvedDoctorsCount={dStats.approved_doctors || 43}
                pendingDoctorsCount={dStats.pending_doctors || 0}
                auditEventsCount={((dash.recent_audit_logs as unknown[]) || []).length}
                urgentItems={[
                  ...(dStats.pending_doctors
                    ? [
                        {
                          id: "urg-pending-docs",
                          label: `${dStats.pending_doctors} Pending Doctor Application(s)`,
                          subtitle: "Requires BMDC registration & credential verification",
                          status: "PENDING_REVIEW",
                          onAction: () => navigate("/admin/doctors"),
                        },
                      ]
                    : []),
                  ...(Number(dash.escalated_tickets_count || 0) > 0
                    ? [
                        {
                          id: "urg-escalations",
                          label: `${String(dash.escalated_tickets_count)} Escalated Zero-PHI Ticket(s)`,
                          subtitle: "Support desk escalated for registrar settlement",
                          status: "URGENT",
                          onAction: () => navigate("/admin/support"),
                        },
                      ]
                    : []),
                ]}
                onQuickNavigate={(tab) => {
                  const routes: Record<string, string> = {
                    doctors: "/admin/doctors",
                    users: "/admin/users",
                    audits: "/admin/audit-logs",
                    governance: "/admin/research-registry",
                    facilities: "/admin/config",
                  };
                  navigate(routes[tab] || "/admin/doctors");
                }}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5">
                  <SmartHealthIdCard
                    role="ADMIN"
                    fullName={user?.full_name || "Senior System Registrar"}
                    idCode="ADM-REG-1001"
                    subtitle="Platform Governance & Audit Authority"
                    bloodGroup="B+"
                    locationLabel="Ministry Sandbox • Dhaka"
                  />
                </div>

                <div className="lg:col-span-7 bento-card rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-base text-white">Recent Immutable Audit Events</h2>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Gross: {formatBdtFromPoisha(pStats.demo_paid_poisha || 0, locale)}
                    </span>
                  </div>
                  {((dash.recent_audit_logs as Array<Record<string, string>>) || []).map((log) => (
                    <div key={log.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-slate-200">
                        <strong className="text-cyan-300">{log.action_type}</strong> ({log.actor_role}) → {log.target_resource}
                      </span>
                      <StatusBadge status={log.outcome === "DENIED" ? "CANCELLED" : "CONFIRMED"} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === "doctors" && (
            <div className="space-y-3">
              {doctors.map((d) => (
                <div key={String(d.id)} data-testid={`admin-doc-row-${String(d.id)}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">{String(d.display_name)}</span>
                      <StatusBadge status={String(d.verification_status)} />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {String(d.degrees)} • {String(d.specialty)} • {String(d.bmdc_demo_reg)} • {String(d.email)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid={`approve-doc-${String(d.id)}`}
                      onClick={() => void verifyDoctor(String(d.id), "APPROVED")}
                      className="min-h-11 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void verifyDoctor(String(d.id), "SUSPENDED")}
                      className="min-h-11 px-4 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-semibold cursor-pointer"
                    >
                      Suspend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === "users" && (
            <div className="space-y-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void apiPost("/v1/admin/staff/provision", { full_name: staffName, email: staffEmail, password: staffPass, role: staffRole }).then(() => {
                    setStaffName("");
                    setStaffEmail("");
                    pushToast({ title: `Provisioned ${staffRole} staff account`, tone: "success" });
                    return loadData();
                  });
                }}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <input type="text" required value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Staff Name" className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                <input type="email" required value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="Staff Email" className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)} className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm">
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <button type="submit" className="min-h-11 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-xs cursor-pointer">
                  Provision Staff
                </button>
              </form>

              <div className="space-y-2.5">
                {users.map((u) => (
                  <div key={String(u.id)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap justify-between items-center gap-3 text-xs">
                    <div>
                      <strong>{String(u.full_name)}</strong> ({String(u.primary_role)})
                      <div className="text-[var(--color-text-muted)]">{String(u.email || u.phone)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={String(u.account_status)} />
                      {u.account_status === "ACTIVE" ? (
                        <button type="button" onClick={() => void apiPatch(`/v1/admin/users/${String(u.id)}/status`, { account_status: "SUSPENDED" }).then(loadData)} className="min-h-10 px-3 rounded-xl border border-rose-500/40 text-rose-600 font-semibold cursor-pointer">
                          Suspend
                        </button>
                      ) : (
                        <button type="button" onClick={() => void apiPatch(`/v1/admin/users/${String(u.id)}/status`, { account_status: "ACTIVE" }).then(loadData)} className="min-h-10 px-3 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer">
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "appointments" && (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={String(a.id)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap justify-between items-center gap-3 text-xs">
                  <div>
                    <strong>{String(a.booking_reference)}</strong> — {String(a.patient_name)} w/ {String(a.doctor_name)}
                    <div className="text-[var(--color-text-muted)]">{String(a.specialty)} • {formatBdtFromPoisha(Number(a.fee_minor_poisha || 0), locale)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={String(a.status)} />
                    {a.status !== "CANCELLED" && (
                      <button type="button" onClick={() => void apiPatch(`/v1/admin/appointments/${String(a.id)}/override`, { status: "CANCELLED", reason: "Admin schedule override" }).then(loadData)} className="min-h-10 px-3 rounded-xl border border-rose-500/40 text-rose-600 font-semibold cursor-pointer">
                        Override Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === "payments" && (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={String(p.id)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap justify-between items-center gap-3 text-xs">
                  <div>
                    <strong className="font-mono">{String(p.demo_ref)}</strong> ({String(p.method)}) — {String(p.payer_name)}
                    <div className="text-[var(--color-text-muted)]">Booking: {String(p.booking_reference)} • {formatBdtFromPoisha(Number(p.amount_minor_poisha || 0), locale)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={String(p.status)} />
                    {p.status === "DEMO_PAID" && (
                      <button type="button" onClick={() => void refundDemoPayment(String(p.id))} className="min-h-10 px-3 rounded-xl bg-amber-600 text-white font-semibold cursor-pointer">
                        Issue Demo Refund
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === "config" && catalog && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
                <h2 className="font-bold text-base flex items-center gap-2"><Sliders className="w-4 h-4 text-[var(--color-primary)]" /> Platform Feature Flags</h2>
                {(catalog.feature_flags || []).map((f) => (
                  <div key={String(f.flag_key)} className="p-3 rounded-xl bg-[var(--color-canvas)] border border-[var(--color-border)] flex justify-between items-center gap-3 text-xs">
                    <div>
                      <strong className="font-mono">{String(f.flag_key)}</strong>
                      <p className="text-[var(--color-text-muted)]">{String(f.description || "")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void apiPatch(`/v1/admin/feature-flags/${String(f.flag_key)}`, { enabled: !Boolean(f.enabled) }).then(loadData)}
                      className={`min-h-10 px-4 rounded-xl font-semibold cursor-pointer ${f.enabled ? "bg-emerald-600 text-white" : "bg-slate-500/20 text-[var(--color-text)]"}`}
                    >
                      {f.enabled ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "rag" && (
            <div className="space-y-6">
              <AdminRagGovernance />
            </div>
          )}

          {section === "support" && (
            <div className="space-y-3">
              {escalations.map((e) => (
                <div key={String(e.id)} className="rounded-2xl border border-rose-500/30 bg-[var(--color-surface)] p-4 flex justify-between items-center text-xs">
                  <div>
                    <strong>{String(e.ticket_number)}: {String(e.subject)}</strong>
                    <div className="text-[var(--color-text-muted)]">{String(e.requester_name)} ({String(e.category)})</div>
                  </div>
                  <StatusBadge status={String(e.status)} />
                </div>
              ))}
            </div>
          )}

          {section === "audit" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  <strong>Privacy Isolation Check:</strong> Admin governance APIs redact private doctor clinical notes prose.
                  {privacyProof && <p className="font-mono text-emerald-600 dark:text-emerald-300 mt-1" data-testid="admin-privacy-proof">{privacyProof}</p>}
                </div>
                <button
                  type="button"
                  data-testid="test-admin-note-redaction-btn"
                  onClick={() => void testClinicalRedaction()}
                  className="min-h-11 px-4 rounded-xl border border-[var(--color-border)] font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" /> Verify 403 Clinical Note Redaction
                </button>
              </div>

              <div className="space-y-2">
                {auditLogs.map((l) => (
                  <div key={String(l.id)} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap justify-between gap-2 text-xs">
                    <span className="font-mono"><ScrollText className="w-3.5 h-3.5 inline mr-1" />{String(l.action_type)} • {String(l.actor_role)} • {String(l.target_resource)}</span>
                    <StatusBadge status={l.outcome === "DENIED" ? "CANCELLED" : "CONFIRMED"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "research" && (
            <div className="space-y-2">
              {researchData.map((m) => (
                <div key={String(m.model_id)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap justify-between gap-2 text-xs">
                  <div>
                    <strong className="font-mono">{String(m.model_id)}</strong> — {String(m.module)} ({String(m.architecture)})
                    <div className="text-[var(--color-text-muted)]">{String(m.scientific_classification)} • {String(m.audit_status)}</div>
                  </div>
                  <span className="font-mono font-bold text-[var(--color-primary)]">{String(m.primary_metric_name)}: {String(m.primary_metric_value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
