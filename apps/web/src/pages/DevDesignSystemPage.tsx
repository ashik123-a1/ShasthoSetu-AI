import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarClock,
  FlaskConical,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import {
  ConfirmModal,
  DataTable,
  EmptyState,
  ErrorState,
  MetricGauge,
  Skeleton,
  StatCard,
  StatusBadge,
  TrustBadge,
  type DataTableColumn,
  type TrustVariant,
  useToast,
} from "../components/ui";
import { ALL_SAMPLE_STATUSES, SYNTHETIC_LEDGER_ROWS, type SyntheticLedgerRow } from "../data/syntheticFixtures";
import { formatBdtFromPoisha, formatDhakaDateTime } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import type { AppRole } from "../lib/roleNavigation";

const ROLES: AppRole[] = ["PATIENT", "DOCTOR", "ADMIN", "SUPPORT"];
const TRUST_VARIANTS: TrustVariant[] = [
  "DEMO_ONLY",
  "NEEDS_VERIFICATION",
  "HUMAN_VERIFIED",
  "RESEARCH_PREVIEW",
  "URGENT_REFERRAL",
];

export type ViewStateMode = "ready" | "loading" | "empty" | "error";

export interface DevDesignSystemPageProps {
  activeRole: AppRole;
  onChangeRole: (role: AppRole) => void;
  activeTabId: string;
  offlineSimulated: boolean;
  onToggleOffline: () => void;
}

export function DevDesignSystemPage({
  activeRole,
  onChangeRole,
  activeTabId,
  offlineSimulated,
  onToggleOffline,
}: DevDesignSystemPageProps) {
  const { locale, t } = useI18n();
  const { pushToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewStateMode>("ready");
  const [modalOpen, setModalOpen] = useState(false);

  const columns = useMemo<DataTableColumn<SyntheticLedgerRow>[]>(
    () => [
      {
        key: "refCode",
        header: t("table.refId"),
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">
            {row.refCode}
          </span>
        ),
      },
      {
        key: "doctorEn",
        header: t("table.doctor"),
        sortable: true,
        sortValue: (row) => (locale === "bn" ? row.doctorBn : row.doctorEn),
        render: (row) => (
          <div>
            <p className="font-semibold text-[var(--color-text)]">
              {locale === "bn" ? row.doctorBn : row.doctorEn}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {locale === "bn" ? row.specialtyBn : row.specialtyEn}
            </p>
          </div>
        ),
      },
      {
        key: "scheduleUtc",
        header: t("table.schedule"),
        sortable: true,
        render: (row) => (
          <span className="text-xs text-[var(--color-text-muted)]">
            {formatDhakaDateTime(row.scheduleUtc, locale)}
          </span>
        ),
      },
      {
        key: "feePoisha",
        header: t("table.fee"),
        sortable: true,
        render: (row) => (
          <span className="font-mono text-sm font-bold text-[var(--color-text)]">
            {formatBdtFromPoisha(row.feePoisha, locale)}
          </span>
        ),
      },
      {
        key: "bookingStatus",
        header: t("table.bookingStatus"),
        render: (row) => <StatusBadge status={row.bookingStatus} />,
      },
      {
        key: "paymentStatus",
        header: t("table.paymentStatus"),
        render: (row) => <StatusBadge status={row.paymentStatus} />,
      },
    ],
    [locale, t]
  );

  const showOverview = activeTabId === "overview";
  const showTables = activeTabId === "overview" || activeTabId === "tables";
  const showBadges = activeTabId === "overview" || activeTabId === "badges";
  const showStates = activeTabId === "overview" || activeTabId === "states";

  return (
    <div className="space-y-6">
      {/* AgriSense-Inspired Hero Command Deck Card */}
      <section
        className="ss-card relative overflow-hidden p-5 sm:p-7"
        style={{
          backgroundImage:
            "radial-gradient(circle at 92% 14%, var(--color-primary-soft), transparent 46%), radial-gradient(circle at 12% 88%, var(--color-secondary-soft), transparent 42%)",
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <img
              src="/shasthosetu-logo.png"
              alt={t("app.brand")}
              data-testid="hero-brand-logo"
              className="h-16 w-16 shrink-0 rounded-full border-2 object-cover sm:h-20 sm:w-20"
              style={{
                borderColor: "var(--color-primary)",
                boxShadow: "var(--shadow-pill)",
              }}
            />
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <TrustBadge variant="DEMO_ONLY" />
                <TrustBadge variant="RESEARCH_PREVIEW" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">
                {t("app.brand")} — {t("app.brandSub")}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
                {t(`roles.scopeNote.${activeRole}`)}
              </p>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold"
            style={{
              backgroundColor: "var(--color-surface-alt)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
            <span>UI-01 Ready • {activeRole} Shell Preview</span>
          </div>
        </div>

        {/* 4-Role Preview Switcher */}
        <div
          className="mt-5 flex flex-col gap-2.5 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">
            {t("roles.switcherLabel")}
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("roles.switcherLabel")}>
            {ROLES.map((role) => {
              const selected = activeRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  data-testid={`role-switch-${role}`}
                  aria-pressed={selected}
                  onClick={() => onChangeRole(role)}
                  className="min-h-11 min-w-11 cursor-pointer rounded-full border px-4 text-xs font-bold transition-colors"
                  style={
                    selected
                      ? {
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-primary-contrast)",
                          borderColor: "var(--color-primary)",
                          boxShadow: "var(--shadow-pill)",
                        }
                      : {
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-text)",
                          borderColor: "var(--color-border)",
                        }
                  }
                >
                  {t(`roles.${role}`)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* KPI Cards & Circular Gauges (Overview Tab) */}
      {showOverview ? (
        <section className="space-y-4" aria-label="KPI Overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={t("kpi.slotsSample")}
              value={t("kpi.slotsValue")}
              delta={t("kpi.slotsDelta")}
              tag={t("kpi.syntheticTag")}
              icon={CalendarClock}
              tone="primary"
              loading={viewMode === "loading"}
            />
            <StatCard
              title={t("kpi.feeSample")}
              value={formatBdtFromPoisha(50000, locale)}
              delta={t("kpi.feeDelta")}
              tag="DEMO"
              icon={Banknote}
              tone="warning"
              loading={viewMode === "loading"}
            />
            <StatCard
              title={t("kpi.ocrSafety")}
              value={t("kpi.ocrSafetyVal")}
              delta={t("kpi.ocrSafetyDelta")}
              tag="SAFETY"
              icon={ShieldCheck}
              tone="secondary"
              loading={viewMode === "loading"}
            />
            <StatCard
              title={t("kpi.auditSuites")}
              value={t("kpi.auditSuitesVal")}
              delta={t("kpi.auditSuitesDelta")}
              tag="LOCKED"
              icon={FlaskConical}
              tone="research"
              loading={viewMode === "loading"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricGauge
              label={t("kpi.gaugeTokens")}
              detail={t("kpi.gaugeTokensDetail")}
              value={100}
              tone="primary"
            />
            <MetricGauge
              label={t("kpi.gaugeParity")}
              detail={t("kpi.gaugeParityDetail")}
              value={100}
              tone="secondary"
            />
            <MetricGauge
              label={t("kpi.gaugeTouch")}
              detail={t("kpi.gaugeTouchDetail")}
              value={100}
              tone="warning"
            />
          </div>
        </section>
      ) : null}

      {/* State & Modal Interactive Workbench */}
      {showStates ? (
        <section className="ss-card p-5 space-y-4" data-testid="states-workbench">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[var(--color-text)]">
              {t("states.controlsHeading")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {(["ready", "loading", "empty", "error"] as ViewStateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-testid={`state-mode-${mode}`}
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className="min-h-11 cursor-pointer rounded-full border px-3.5 text-xs font-semibold"
                  style={
                    viewMode === mode
                      ? {
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-primary-contrast)",
                          borderColor: "var(--color-primary)",
                        }
                      : {
                          backgroundColor: "var(--color-surface-alt)",
                          color: "var(--color-text)",
                          borderColor: "var(--color-border)",
                        }
                  }
                >
                  {t(
                    `states.state${mode.charAt(0).toUpperCase()}${mode.slice(1)}`
                  )}
                </button>
              ))}

              <button
                type="button"
                data-testid="toggle-offline-btn"
                aria-pressed={offlineSimulated}
                onClick={onToggleOffline}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold"
                style={{
                  borderColor: "var(--color-warning)",
                  backgroundColor: offlineSimulated ? "var(--color-warning-soft)" : "transparent",
                  color: "var(--color-warning)",
                }}
              >
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {offlineSimulated ? t("states.toggleOfflineOff") : t("states.toggleOfflineOn")}
                </span>
              </button>

              <button
                type="button"
                data-testid="open-confirm-modal"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--color-primary-contrast)",
                }}
              >
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("states.openModalBtn")}</span>
              </button>
            </div>
          </div>

          {viewMode === "loading" ? <Skeleton lines={4} /> : null}
          {viewMode === "empty" ? (
            <EmptyState
              title={t("states.emptyTitle")}
              description={t("states.emptyDesc")}
              actionLabel={t("states.emptyAction")}
              onAction={() => setViewMode("ready")}
            />
          ) : null}
          {viewMode === "error" ? (
            <ErrorState
              title={t("states.errorTitle")}
              description={t("states.errorDesc")}
              errorCode="ERR_DEMO_503"
              retryLabel={t("states.errorRetry")}
              onRetry={() => setViewMode("ready")}
            />
          ) : null}
        </section>
      ) : null}

      {/* Synthetic Ledger DataTable */}
      {showTables && viewMode !== "empty" && viewMode !== "error" ? (
        <DataTable
          title={t("table.title")}
          subtitle={t("table.subtitle")}
          rows={SYNTHETIC_LEDGER_ROWS}
          columns={columns}
          loading={viewMode === "loading"}
          searchPlaceholder={t("table.searchPlaceholder")}
          searchableFields={["refCode", "doctorBn", "doctorEn", "specialtyBn", "specialtyEn"]}
          filterField="bookingStatus"
          filterChips={[
            { value: "CONFIRMED", label: t("status.CONFIRMED") },
            { value: "AWAITING_DEMO_PAYMENT", label: t("status.AWAITING_DEMO_PAYMENT") },
            { value: "CANCELLED", label: t("status.CANCELLED") },
          ]}
          allFilterLabel={t("table.allStatuses")}
          exportLabel={t("table.exportCsv")}
          onExport={(filtered) =>
            pushToast({
              title: t("modal.exportToastTitle"),
              description: t("modal.exportToastDesc", { count: filtered.length }),
              tone: "info",
            })
          }
          rangeLabel={(from, to, total) => t("table.showingRange", { from, to, total })}
          prevLabel={t("table.prev")}
          nextLabel={t("table.next")}
          emptyTitle={t("table.noMatchesTitle")}
          emptyDescription={t("table.noMatchesDesc")}
          resetLabel={t("table.resetFilters")}
        />
      ) : null}

      {/* Trust & Status Badges Matrix */}
      {showBadges ? (
        <section className="ss-card p-5 space-y-4" data-testid="badges-matrix">
          <h2 className="text-base font-bold text-[var(--color-text)]">{t("tabs.badges")}</h2>
          <div className="flex flex-wrap gap-2">
            {TRUST_VARIANTS.map((v) => (
              <TrustBadge key={v} variant={v} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            {ALL_SAMPLE_STATUSES.map((st) => (
              <StatusBadge key={st} status={st} />
            ))}
          </div>
        </section>
      ) : null}

      <ConfirmModal
        open={modalOpen}
        title={t("modal.title")}
        body={t("modal.body")}
        confirmLabel={t("modal.confirmLabel")}
        cancelLabel={t("modal.cancelLabel")}
        onConfirm={() =>
          pushToast({
            title: t("modal.confirmedToastTitle"),
            description: t("modal.confirmedToastDesc"),
            tone: "success",
          })
        }
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
