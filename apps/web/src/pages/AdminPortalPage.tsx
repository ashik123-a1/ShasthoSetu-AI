import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FlaskConical,
  Pill,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { ApiError, apiGet, apiPatch, apiPost } from "../lib/apiClient";
import { useAuth } from "../lib/authContext";
import { formatBdtFromPoisha } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PortalLayout } from "../components/layout/PortalLayout";
import { Skeleton, StatusBadge, useToast } from "../components/ui";
import { SmartHealthIdCard } from "../components/portal/SmartHealthIdCard";
import { LandGuardBentoAnalytics } from "../components/portal/LandGuardBentoAnalytics";
import { AdminRagGovernance } from "../components/ai/AdminRagGovernance";
import { McpArchitectureExplorer } from "../components/research/McpArchitectureExplorer";

interface BankAccountItem {
  id: string;
  account_code: string;
  provider_name: string;
  account_number_masked: string;
  account_type: string;
  balance_minor_poisha: number;
  total_inflow_minor_poisha: number;
  total_commission_minor_poisha: number;
  total_payout_minor_poisha: number;
  settlement_status: string;
  last_reconciled_at_utc: string;
}

interface MonthlyTrendItem {
  billing_month: string;
  month_label: string;
  tx_count: number;
  consultation_gmv_poisha: number;
  epharma_sales_gmv_poisha: number;
  diagnostic_test_gmv_poisha: number;
  health_plan_gmv_poisha: number;
  total_gmv_poisha: number;
  total_commission_poisha: number;
  net_payout_poisha: number;
}

interface StreamBreakdownItem {
  revenue_stream: string;
  tx_count: number;
  commission_rate_pct: number;
  gross_gmv_poisha: number;
  commission_poisha: number;
  net_partner_payout_poisha: number;
}

interface PlatformTxnItem {
  id: string;
  txn_ref: string;
  receipt_number: string;
  revenue_stream: string;
  item_title: string;
  support_safe_label: string;
  payer_name_masked: string;
  beneficiary_entity: string;
  gateway_method: string;
  bank_account_id: string;
  bank_account_code: string;
  bank_provider_name: string;
  gross_amount_minor_poisha: number;
  commission_rate_pct: number;
  commission_minor_poisha: number;
  net_partner_payout_minor_poisha: number;
  status: string;
  billing_month: string;
  created_at_utc: string;
}

interface FinanceSnapshot {
  kpis: {
    total_transactions_count: number;
    paid_transactions_count: number;
    gross_gmv_poisha: number;
    platform_commission_poisha: number;
    net_partner_payout_poisha: number;
    refunded_poisha: number;
    avg_commission_rate_pct: number;
  };
  bank_accounts: BankAccountItem[];
  monthly_six_month_trend: MonthlyTrendItem[];
  stream_commission_breakdown: StreamBreakdownItem[];
  platform_transactions: PlatformTxnItem[];
}

export function AdminPortalPage({ section = "dashboard" }: { section?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useI18n();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [finance, setFinance] = useState<FinanceSnapshot | null>(null);
  const [streamFilter, setStreamFilter] = useState<string>("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("ALL");

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
      const dashRes = await apiGet<Record<string, unknown>>("/v1/admin/dashboard");
      setDash(dashRes);
      if (dashRes.finance_summary) {
        setFinance(dashRes.finance_summary as FinanceSnapshot);
      }
      if (section === "doctors") {
        setDoctors((await apiGet<{ doctors: Array<Record<string, unknown>> }>("/v1/admin/doctors")).doctors);
      } else if (section === "users") {
        setUsers((await apiGet<{ users: Array<Record<string, unknown>> }>("/v1/admin/users")).users);
      } else if (section === "appointments") {
        setAppointments((await apiGet<{ appointments: Array<Record<string, unknown>> }>("/v1/admin/appointments")).appointments);
      } else if (section === "payments") {
        const payRes = await apiGet<{ payments: Array<Record<string, unknown>> } & FinanceSnapshot>("/v1/admin/payments");
        setPayments(payRes.payments || []);
        setFinance(payRes);
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

  const refundPlatformTxn = async (txnId: string, txnRef: string) => {
    await apiPost(`/v1/admin/finance/transactions/${txnId}/refund`, {
      reason: `Admin treasury refund for ${txnRef}`,
    });
    pushToast({ title: `Transaction ${txnRef} marked REFUNDED`, tone: "info" });
    await loadData();
  };

  const settleBank = async (bankId: string, code: string) => {
    await apiPost(`/v1/admin/finance/banks/${bankId}/settle`, {});
    pushToast({
      title: `Bank / Gateway ${code} Reconciled & Audited`,
      description: "Pending settlements cleared to Corporate Treasury & Partner Payouts.",
      tone: "success",
    });
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
  const finKpis = finance?.kpis || {
    total_transactions_count: 0,
    paid_transactions_count: 0,
    gross_gmv_poisha: 0,
    platform_commission_poisha: 0,
    net_partner_payout_poisha: 0,
    refunded_poisha: 0,
    avg_commission_rate_pct: 15,
  };
  const bankAccounts = finance?.bank_accounts || [];
  const monthlyTrend = finance?.monthly_six_month_trend || [];
  const streamBreakdown = finance?.stream_commission_breakdown || [];
  const allTxns = finance?.platform_transactions || [];

  const filteredTxns = allTxns.filter((tx) => {
    const streamOk = streamFilter === "ALL" || tx.revenue_stream === streamFilter;
    const monthOk = monthFilter === "ALL" || tx.billing_month === monthFilter;
    return streamOk && monthOk;
  });

  const maxMonthGmv = Math.max(1, ...monthlyTrend.map((m) => m.total_gmv_poisha));

  const renderFinanceTreasuryCenter = (compactMode = false) => (
    <div className="space-y-6" data-testid="admin-treasury-commission-center">
      {/* Top 4 Financial & Commission KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bento-card rounded-2xl p-4 border border-emerald-500/35 bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
            <span>6-MONTH GROSS SALES &amp; GMV</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1.5" data-testid="admin-gross-gmv">
            {formatBdtFromPoisha(finKpis.gross_gmv_poisha, locale)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {finKpis.paid_transactions_count} Paid / Settled TXNs (Jun–Nov 2026 + Live)
          </p>
        </div>

        <div className="bento-card rounded-2xl p-4 border border-cyan-500/35 bg-cyan-950/20">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
            <span>PLATFORM COMMISSION EARNED</span>
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300 mt-1.5" data-testid="admin-platform-commission">
            {formatBdtFromPoisha(finKpis.platform_commission_poisha, locale)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ePharma 12% • Consults 15% • Lab Tests 18% • Plans 20%
          </p>
        </div>

        <div className="bento-card rounded-2xl p-4 border border-amber-500/35 bg-amber-950/20">
          <div className="flex items-center justify-between text-xs font-mono text-amber-300">
            <span>DOCTOR / LAB / PHARMA PAYOUT</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-300 mt-1.5" data-testid="admin-partner-payout">
            {formatBdtFromPoisha(finKpis.net_partner_payout_poisha, locale)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Disbursed via BRAC Bank Partner Payout Treasury
          </p>
        </div>

        <div className="bento-card rounded-2xl p-4 border border-indigo-500/35 bg-indigo-950/20">
          <div className="flex items-center justify-between text-xs font-mono text-indigo-300">
            <span>MONITORED BANK &amp; GATEWAYS</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1.5">
            {bankAccounts.length} Accounts Online
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            bKash • Nagad • SSLCommerz • City Bank • BRAC Bank
          </p>
        </div>
      </div>

      {/* Live Monitored Bank & Payment Gateway Accounts */}
      <div className="bento-card rounded-3xl p-5 space-y-4 border border-cyan-500/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">
              LIVE BANKING &amp; PAYMENT GATEWAY SETTLEMENT MONITOR
            </span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
              <Building2 className="w-5 h-5 text-cyan-400" />
              {locale === "bn"
                ? "অ্যাডমিন ব্যাংক ও পেমেন্ট গেটওয়ে মনিটরিং (bKash, Nagad, SSLCommerz, City Bank, BRAC Bank)"
                : "Monitored Bank & MFS Gateway Settlement Accounts"}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="min-h-9 px-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-semibold text-cyan-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Balances
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {bankAccounts.map((b) => (
            <div
              key={b.id}
              data-testid={`bank-card-${b.account_code}`}
              className="rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-400/50 p-4 flex flex-col justify-between gap-3 transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {b.account_code}
                  </span>
                  <StatusBadge status={b.settlement_status === "AUDITED" ? "CONFIRMED" : "OPEN"} />
                </div>
                <h4 className="font-bold text-xs text-white leading-snug">{b.provider_name}</h4>
                <p className="font-mono text-[11px] text-slate-400">{b.account_number_masked}</p>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800/90 font-mono text-xs">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Balance:</span>
                  <span className="font-extrabold text-emerald-400">
                    {formatBdtFromPoisha(b.balance_minor_poisha, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Commission:</span>
                  <span className="text-cyan-300">
                    {formatBdtFromPoisha(b.total_commission_minor_poisha, locale)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void settleBank(b.id, b.account_code)}
                  className="w-full mt-2 min-h-8 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold cursor-pointer transition"
                >
                  Reconcile &amp; Settle
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6-Month Revenue, Sales, Lab Tests & Commission Breakdown (June 2026 - November 2026) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bento-card rounded-3xl p-5 space-y-4 border border-emerald-500/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-300">
                6-MONTH BUSINESS &amp; COMMISSION PERFORMANCE (JUN 2026 – NOV 2026)
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {locale === "bn"
                  ? "৬ মাসের মাসভিত্তিক বিক্রয়, ল্যাব টেস্ট, পরামর্শ ও কমিশন রিপোর্ট"
                  : "6-Month Monthly Sales, Diagnostic Tests, Consultations & Commission Ledger"}
              </h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
              {monthlyTrend.length} Months Verified
            </span>
          </div>

          {/* Visual Bar Chart + Table */}
          <div className="space-y-2.5">
            {monthlyTrend.map((m) => {
              const pct = Math.max(12, Math.round((m.total_gmv_poisha / maxMonthGmv) * 100));
              return (
                <div
                  key={m.billing_month}
                  data-testid={`six-month-row-${m.billing_month}`}
                  className="p-3 rounded-2xl bg-slate-950/85 border border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-300">{m.month_label}</span>
                      <span className="text-[11px] text-slate-400">({m.tx_count} txns)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                      <span className="text-slate-300">
                        Gross: <strong className="text-white">{formatBdtFromPoisha(m.total_gmv_poisha, locale)}</strong>
                      </span>
                      <span className="text-emerald-400">
                        Comm: <strong>{formatBdtFromPoisha(m.total_commission_poisha, locale)}</strong>
                      </span>
                      <span className="text-amber-300">
                        Payout: <strong>{formatBdtFromPoisha(m.net_payout_poisha, locale)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-400 pt-0.5">
                    <span>ePharma Sales: {formatBdtFromPoisha(m.epharma_sales_gmv_poisha, locale)}</span>
                    <span>Lab Tests: {formatBdtFromPoisha(m.diagnostic_test_gmv_poisha, locale)}</span>
                    <span>Consultations: {formatBdtFromPoisha(m.consultation_gmv_poisha, locale)}</span>
                    <span>Health Plans: {formatBdtFromPoisha(m.health_plan_gmv_poisha, locale)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4-Vertical Commission Matrix */}
        <div className="lg:col-span-5 bento-card rounded-3xl p-5 space-y-4 border border-amber-500/30">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300">
              COMMISSION BY BUSINESS VERTICAL
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {locale === "bn"
                ? "ওষুধ বিক্রয়, ল্যাব টেস্ট ও ডাক্তার পরামর্শের কমিশন বিভাজন"
                : "Sales, Lab Tests & Consultation Commission Split"}
            </h3>
          </div>

          <div className="space-y-3">
            {streamBreakdown.map((sb) => {
              const labelMap: Record<string, { title: string; icon: typeof Pill; color: string }> = {
                EPHARMA_SALE: { title: "ePharma Medicine & Device Sales", icon: Pill, color: "text-amber-300" },
                DIAGNOSTIC_TEST: { title: "Diagnostic Lab Tests & Home Collect", icon: FlaskConical, color: "text-cyan-300" },
                DOCTOR_CONSULTATION: { title: "BMDC Doctor Tele-Consultations", icon: Stethoscope, color: "text-emerald-300" },
                HEALTH_PLAN: { title: "Family Healthcare Subscriptions", icon: ShieldCheck, color: "text-indigo-300" },
              };
              const meta = labelMap[sb.revenue_stream] || {
                title: sb.revenue_stream,
                icon: CreditCard,
                color: "text-sky-300",
              };
              const Icon = meta.icon;
              return (
                <div
                  key={sb.revenue_stream}
                  className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      <span className="font-bold text-xs text-white">{meta.title}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                      {sb.commission_rate_pct}% Commission
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1 border-t border-slate-800/80">
                    <div>
                      <div className="text-[10px] text-slate-400">Gross Sales ({sb.tx_count})</div>
                      <div className="font-bold text-white">{formatBdtFromPoisha(sb.gross_gmv_poisha, locale)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Platform Commission</div>
                      <div className="font-bold text-cyan-300">{formatBdtFromPoisha(sb.commission_poisha, locale)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Partner Payout</div>
                      <div className="font-bold text-amber-300">{formatBdtFromPoisha(sb.net_partner_payout_poisha, locale)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unified Live Transaction Ledger */}
      {!compactMode && (
        <div className="bento-card rounded-3xl p-5 space-y-4 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">
                UNIFIED PLATFORM TRANSACTION &amp; COMMISSION LEDGER ({filteredTxns.length} RECORDS)
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                All User Payments (ePharma Sales, Lab Tests, Consultations &amp; Plans)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="min-h-9 rounded-xl bg-slate-900 border border-slate-700 px-3 text-xs text-white"
              >
                <option value="ALL">All Verticals (4)</option>
                <option value="EPHARMA_SALE">ePharma Sales (12% Comm)</option>
                <option value="DIAGNOSTIC_TEST">Diagnostic Lab Tests (18% Comm)</option>
                <option value="DOCTOR_CONSULTATION">Doctor Consultations (15% Comm)</option>
                <option value="HEALTH_PLAN">Family Health Plans (20% Comm)</option>
              </select>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="min-h-9 rounded-xl bg-slate-900 border border-slate-700 px-3 text-xs text-white"
              >
                <option value="ALL">All 6 Months (Jun–Nov 2026)</option>
                <option value="2026-11">Nov 2026 (Current)</option>
                <option value="2026-10">Oct 2026</option>
                <option value="2026-09">Sep 2026</option>
                <option value="2026-08">Aug 2026</option>
                <option value="2026-07">Jul 2026</option>
                <option value="2026-06">Jun 2026</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredTxns.map((tx) => (
              <div
                key={tx.id}
                data-testid={`admin-txn-row-${tx.txn_ref}`}
                className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-cyan-300">{tx.txn_ref}</span>
                    <span className="font-mono text-[11px] text-emerald-300">({tx.receipt_number})</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300">
                      {tx.revenue_stream}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/30">
                      {tx.bank_account_code} • {tx.gateway_method}
                    </span>
                  </div>
                  <div className="font-semibold text-white">{tx.item_title}</div>
                  <div className="text-[11px] text-slate-400">
                    Payer: <span className="text-slate-200">{tx.payer_name_masked}</span> • Beneficiary:{" "}
                    <span className="text-slate-300">{tx.beneficiary_entity}</span> • Month:{" "}
                    <span className="font-mono text-cyan-300">{tx.billing_month}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right font-mono">
                    <div className="text-sm font-black text-white">
                      Gross: {formatBdtFromPoisha(tx.gross_amount_minor_poisha, locale)}
                    </div>
                    <div className="text-[11px] text-emerald-400">
                      Comm ({tx.commission_rate_pct}%): {formatBdtFromPoisha(tx.commission_minor_poisha, locale)}
                    </div>
                    <div className="text-[10px] text-amber-300">
                      Partner Net: {formatBdtFromPoisha(tx.net_partner_payout_minor_poisha, locale)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={tx.status === "PAID" || tx.status === "SETTLED" ? "CONFIRMED" : "CANCELLED"} />
                    {(tx.status === "PAID" || tx.status === "SETTLED") && (
                      <button
                        type="button"
                        onClick={() => void refundPlatformTxn(tx.id, tx.txn_ref)}
                        className="min-h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                      >
                        Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PortalLayout
      title={locale === "bn" ? "অ্যাডমিন গভর্নেন্স ও ব্যাংক ট্রেজারি পোর্টাল" : "Admin Governance, Bank Treasury & 6-Month Commission Hub"}
      subtitle={locale === "bn" ? "ব্যাংক সেটেলমেন্ট, ৬ মাসের বিক্রয় ও কমিশন, ডাক্তার অনুমোদন এবং অডিট লগ" : "Real-time Bank & Gateway Monitoring, 6-Month Sales/Tests/Commission Ledger, Doctor Approvals & Zero-PHI Audit"}
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

              {/* Full Bank, Payment Gateway & 6-Month Commission Overview right on Admin Dashboard */}
              {renderFinanceTreasuryCenter(false)}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5">
                  <SmartHealthIdCard
                    role="ADMIN"
                    fullName={user?.full_name || "Senior System Registrar"}
                    idCode="ADM-REG-1001"
                    subtitle="Platform Governance & Treasury Authority"
                    bloodGroup="B+"
                    locationLabel="Ministry Sandbox • Dhaka"
                  />
                </div>

                <div className="lg:col-span-7 bento-card rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-base text-white">Recent Immutable Audit Events</h2>
                    <span className="text-[11px] font-mono text-emerald-400">
                      6M Gross: {formatBdtFromPoisha(finKpis.gross_gmv_poisha, locale)} | Comm:{" "}
                      {formatBdtFromPoisha(finKpis.platform_commission_poisha, locale)}
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
            <div className="space-y-6">
              {renderFinanceTreasuryCenter(false)}
              {payments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase text-slate-400">Appointment Checkout Records</h3>
                  {payments.map((p) => (
                    <div key={String(p.id)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap justify-between items-center gap-3 text-xs">
                      <div>
                        <strong className="font-mono">{String(p.demo_ref)}</strong> ({String(p.method)}) — {String(p.payer_name)}
                        <div className="text-[var(--color-text-muted)]">Booking: {String(p.booking_reference)} • {formatBdtFromPoisha(Number(p.amount_minor_poisha || 0), locale)}</div>
                      </div>
                      <StatusBadge status={String(p.status)} />
                    </div>
                  ))}
                </div>
              )}
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
              <McpArchitectureExplorer compact />
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
              <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-sky-600" />
                  <div>
                    <strong>Clinical Note Privacy Isolation Proof:</strong> Admin can govern doctors &amp; treasury but is blocked (HTTP 403) from private doctor consultation prose.
                    {privacyProof && <p className="font-mono text-emerald-600 dark:text-emerald-300 mt-1" data-testid="admin-privacy-proof">{privacyProof}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="test-clinical-redaction-btn"
                  onClick={() => void testClinicalRedaction()}
                  className="min-h-11 px-4 rounded-xl bg-sky-600 text-white font-semibold cursor-pointer"
                >
                  Verify 403 Clinical Isolation
                </button>
              </div>

              <div className="space-y-2">
                {auditLogs.map((l) => (
                  <div key={String(l.id)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-wrap justify-between items-center gap-2 text-xs font-mono">
                    <div>
                      <strong>{String(l.action_type)}</strong> • {String(l.actor_role)} • {String(l.target_resource)}
                      <div className="text-[11px] text-[var(--color-text-muted)]">{String(l.details_redacted_json)}</div>
                    </div>
                    <StatusBadge status={l.outcome === "DENIED" ? "CANCELLED" : "CONFIRMED"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "research" && (
            <div className="space-y-3">
              {researchData.map((m) => (
                <div key={String(m.model_id)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-[var(--color-primary)]">{String(m.model_id)} — {String(m.module_name)}</span>
                    <span className="font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">{String(m.deployment_classification)}</span>
                  </div>
                  <p className="font-semibold">{String(m.primary_verified_metric)}</p>
                  <p className="text-[var(--color-text-muted)]">Limitation: {String(m.known_limitation_summary)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
