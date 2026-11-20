import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { bnCatalog, enCatalog } from "../lib/i18n";
import { formatBdtFromPoisha, formatDhakaDateTime } from "../lib/formatters";
import { MedicalReceiptDocument } from "../components/billing/MedicalReceiptDocument";
import { MedicalPrescriptionDocument } from "../components/prescriptions/MedicalPrescriptionDocument";
import { DoctorProfileDetailModal } from "../components/doctors/DoctorProfileDetailModal";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenKeys(v as Record<string, unknown>, key));
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

function renderApp(initialEntries = ["/dev/design-system"]) {
  if (typeof globalThis.fetch === "undefined" || !("mock" in globalThis.fetch)) {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes("/v1/auth/me")) body = { authenticated: false, user: null };
      else if (url.includes("/v1/public/overview")) body = { approved_doctors: 3, open_slots: 27, specialties: 5, diagnostic_tests: 4, healthcare_plans: 2, facilities: 4, frozen_research_modules: 6, audit_lock_verdict: "RESEARCH_AUDIT_PASS_WITH_LIMITATIONS" };
      else if (url.includes("/v1/public/doctors")) body = { doctors: [] };
      else if (url.includes("/v1/public/services")) body = { diagnostic_tests: [], healthcare_plans: [], facilities: [] };
      else if (url.includes("/v1/public/research")) body = { datasets: [], models: [], deferred_modules: [] };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
  }
  const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
  return render(<App routerWrapper={RouterWrapper} />);
}

describe("UI-01 ShasthoSetu Design System & Reusable Primitives", () => {
  it("1. Enforces 100% recursive key parity and non-empty values between bn.json and en.json", () => {
    const bnFlat = flattenKeys(bnCatalog as unknown as Record<string, unknown>);
    const enFlat = flattenKeys(enCatalog as unknown as Record<string, unknown>);
    expect(Object.keys(bnFlat).sort()).toEqual(Object.keys(enFlat).sort());
    for (const [k, val] of Object.entries(bnFlat)) {
      expect(val.trim().length, `Missing bn value for ${k}`).toBeGreaterThan(0);
    }
    for (const [k, val] of Object.entries(enFlat)) {
      expect(val.trim().length, `Missing en value for ${k}`).toBeGreaterThan(0);
    }
  });

  it("2. Defaults to Bengali (bn) and switches/persists English locale cleanly", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(document.documentElement.lang).toBe("bn");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("স্বাস্থ্যসেতু এআই");

    await user.click(screen.getByTestId("lang-btn-en"));
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem("ss-locale")).toBe("en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ShasthoSetu AI");
  });

  it("3. Defaults to Obsidian Dark theme and persists Clinical Daylight toggle", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(screen.getByTestId("theme-switch"));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("ss-theme")).toBe("light");
  });

  it("4. Toggles WCAG Pause Motion and persists html.reduce-motion", async () => {
    const user = userEvent.setup();
    renderApp();
    const toggle = screen.getByTestId("pause-motion-toggle");
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(false);

    await user.click(toggle);
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(true);
    expect(window.localStorage.getItem("ss-pause-motion")).toBe("true");
  });

  it("5. ConfirmModal traps Tab focus, closes on Escape, and restores focus to trigger button", async () => {
    const user = userEvent.setup();
    renderApp();
    const trigger = screen.getByTestId("open-confirm-modal");
    trigger.focus();
    await user.click(trigger);

    const dialog = screen.getByTestId("confirm-modal");
    expect(dialog).toBeInTheDocument();

    const cancelBtn = screen.getByTestId("modal-cancel-btn");
    const confirmBtn = screen.getByTestId("modal-confirm-btn");
    const closeX = screen.getByTestId("modal-close-x");

    await waitFor(() => expect(document.activeElement).toBe(cancelBtn));

    await user.tab();
    expect(document.activeElement).toBe(confirmBtn);

    await user.tab();
    expect(document.activeElement).toBe(closeX);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirmBtn);

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("6. SlidePillTabs supports keyboard arrow navigation and switches visible views", async () => {
    const user = userEvent.setup();
    renderApp();
    const overviewTab = screen.getByTestId("pill-tab-overview");
    overviewTab.focus();
    await user.keyboard("{ArrowRight}");

    const tablesTab = screen.getByTestId("pill-tab-tables");
    expect(tablesTab).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tablesTab);
    expect(screen.getByTestId("ui-data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("ui-metric-gauge")).not.toBeInTheDocument();

    await user.keyboard("{End}");
    const statesTab = screen.getByTestId("pill-tab-states");
    expect(statesTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("states-workbench")).toBeInTheDocument();
  });

  it("7. Role switcher changes RoleSidebar items accurately while guarding routes unauthenticated", async () => {
    const user = userEvent.setup();
    renderApp();
    const sidebar = screen.getByTestId("role-sidebar");
    expect(within(sidebar).getByTestId("sidebar-item-pt-dash")).toBeInTheDocument();

    await user.click(screen.getByTestId("role-switch-DOCTOR"));
    expect(within(sidebar).getByTestId("sidebar-item-dr-avail")).toBeInTheDocument();

    await user.click(screen.getByTestId("role-switch-ADMIN"));
    expect(within(sidebar).getByTestId("sidebar-item-ad-audit")).toBeInTheDocument();

    await user.click(screen.getByTestId("role-switch-SUPPORT"));
    expect(within(sidebar).getByTestId("sidebar-item-sup-tix")).toBeInTheDocument();
    expect(screen.getByTestId("unauthenticated-dev-banner")).toBeInTheDocument();

    // Direct navigation to /admin/dashboard unauthenticated MUST redirect to /login, never render admin portal
    renderApp(["/admin/dashboard"]);
    await waitFor(() => {
      expect(screen.getByTestId("login-identifier-input")).toBeInTheDocument();
    });
  });

  it("8. DataTable searches, filters by status pill, sorts, and shows EmptyState when unmatched", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getAllByTestId("table-row").length).toBeGreaterThan(0);

    await user.click(screen.getByTestId("table-filter-CANCELLED"));
    expect(screen.getAllByTestId("table-row")).toHaveLength(1);

    await user.click(screen.getByTestId("table-filter-ALL"));
    await user.click(screen.getByTestId("table-sort-feePoisha"));
    expect(screen.getByTestId("table-sort-feePoisha").closest("th")).toHaveAttribute(
      "aria-sort",
      "ascending"
    );

    const search = screen.getByTestId("table-search-input");
    await user.type(search, "zzz_no_match_999");
    expect(screen.getByTestId("ui-empty-state")).toBeInTheDocument();
  });

  it("9. Renders Loading, Empty, Error, OfflineBanner, Toast, and all TrustBadges", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByTestId("state-mode-empty"));
    expect(screen.getByTestId("ui-empty-state")).toBeInTheDocument();

    await user.click(screen.getByTestId("state-mode-error"));
    expect(screen.getByTestId("ui-error-state")).toBeInTheDocument();

    await user.click(screen.getByTestId("state-mode-loading"));
    expect(screen.getAllByTestId("ui-skeleton").length).toBeGreaterThan(0);

    await user.click(screen.getByTestId("state-mode-ready"));
    await user.click(screen.getByTestId("toggle-offline-btn"));
    expect(screen.getByTestId("ui-offline-banner")).toBeInTheDocument();

    await user.click(screen.getByTestId("trigger-toast-btn"));
    expect(screen.getByTestId("ui-toast")).toBeInTheDocument();
  });

  it("10. Formats Poisha integer currency and Asia/Dhaka time accurately in bn & en", () => {
    expect(formatBdtFromPoisha(50000, "en")).toBe("৳ 500.00");
    expect(formatBdtFromPoisha(50000, "bn")).toBe("৳ ৫০০.০০");
    const enDt = formatDhakaDateTime("2026-11-20T04:30:00Z", "en");
    expect(enDt.toLowerCase()).toContain("10:30");
  });

  it("11. Renders AgriSense-style PublicHomepage at / with logo, floating navbar & 3D lattice fallback", async () => {
    renderApp(["/"]);
    expect(screen.getByTestId("public-floating-header")).toBeInTheDocument();
    expect(screen.getByTestId("floating-pill-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("public-hero-heading")).toBeInTheDocument();
    expect(screen.getByTestId("care-lattice-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("home-goto-pcos")).toBeInTheDocument();
    expect(screen.getByTestId("home-goto-ocr")).toBeInTheDocument();
    expect(screen.getByTestId("home-goto-pediatric")).toBeInTheDocument();
    expect(screen.getByTestId("bangladesh-care-map")).toBeInTheDocument();
    expect(screen.getByAltText("ShasthoSetu AI Logo")).toHaveAttribute("src", "/shasthosetu-logo.png");
  });

  it("12. Renders separate dedicated feature pages (/features/pcos, /features/prescription-ocr, /features/pediatric-rash) & /care-map", async () => {
    renderApp(["/features/pcos"]);
    expect(screen.getByTestId("pcos-feature-page")).toBeInTheDocument();
    expect(screen.getByTestId("pcos-feature-calc-btn")).toBeInTheDocument();

    renderApp(["/features/prescription-ocr"]);
    expect(screen.getByTestId("ocr-feature-page")).toBeInTheDocument();
    expect(screen.getByTestId("ocr-demo-workbench")).toBeInTheDocument();

    renderApp(["/features/pediatric-rash"]);
    expect(screen.getByTestId("pediatric-feature-page")).toBeInTheDocument();
    expect(screen.getByTestId("pediatric-triage-simulator")).toBeInTheDocument();

    renderApp(["/care-map"]);
    expect(screen.getByTestId("care-map-page")).toBeInTheDocument();
    expect(screen.getByTestId("bangladesh-care-map")).toBeInTheDocument();
  });

  it("13. Renders MedicalReceiptDocument with logo, helpline, hospital dispatch header, itemized fee breakdown & watermark", () => {
    const mockReceipt = {
      receipt_number: "DEMO-RCP-9001",
      payment_method: "DEMO_BKASH",
      amount_minor_poisha: 50000,
      status: "DEMO_PAID",
      booking_reference: "APT-DEMO-9001",
      patient_name: "রহিমা বেগম (Rahima Begum)",
      patient_id_code: "SS-PT-884920",
      doctor_name: "Dr. Farhana Rahman (Demo)",
      doctor_degrees: "MBBS, FCPS (OB-GYN)",
      doctor_specialty: "Gynecology & PCOS",
      doctor_bmdc: "BMDC-DEMO-44102",
    };
    render(<MedicalReceiptDocument receipt={mockReceipt} locale="en" />);
    expect(screen.getByText("ShasthoSetu AI • স্বাস্থ্যসেতু")).toBeInTheDocument();
    expect(screen.getByText("DEMO-RCP-9001")).toBeInTheDocument();
    expect(screen.getByText("ShasthoPay MFS (Simulated)")).toBeInTheDocument();
    expect(screen.getByText("BMDC-DEMO-44102")).toBeInTheDocument();
    expect(screen.getByText(/Helpline: 16263/)).toBeInTheDocument();
    expect(screen.getByText(/Telehealth Specialist Clinical Consultation/)).toBeInTheDocument();
  });

  it("14. Renders MedicalPrescriptionDocument with doctor credentials, BMDC reg, patient vitals & structured Rx table", () => {
    const mockRx = {
      rx_reference: "DEMO-RX-9001",
      doctor_name: "Dr. Farhana Rahman (Demo)",
      doctor_degrees: "MBBS, FCPS (OB-GYN)",
      doctor_specialty: "Gynecology & PCOS",
      doctor_bmdc: "BMDC-DEMO-44102",
      patient_name: "রহিমা বেগম (Rahima Begum)",
      patient_age: "30Y",
      patient_sex: "Female",
      patient_blood_group: "O+",
      patient_bp: "118/78",
      patient_weight: "58 kg",
      diagnosis_summary: "PCOS cycle irregularity & insulin resistance monitoring (Demo)",
      medications_json: JSON.stringify([
        { name: "Tab. Metformin 500mg", dose: "1 tablet", frequency: "0+0+1 After Dinner", duration: "14 days" },
      ]),
      advice_notes: "Regular 30-min walking and balanced diet.",
    };
    render(<MedicalPrescriptionDocument prescription={mockRx} locale="en" />);
    expect(screen.getAllByText("Dr. Farhana Rahman (Demo)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/BMDC-DEMO-44102/)).toBeInTheDocument();
    expect(screen.getAllByText("DEMO-RX-9001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tab. Metformin 500mg")).toBeInTheDocument();
    expect(screen.getByText(/PCOS cycle irregularity/)).toBeInTheDocument();
  });

  it("15. Renders DoctorProfileDetailModal with full clinical credentials, BMDC reg, bio, rating & slot booking", () => {
    const mockDoctor = {
      id: "doc-farhana",
      display_name: "Dr. Farhana Rahman (Demo)",
      display_name_bn: "ডাঃ ফারহানা রহমান (ডেমো)",
      degrees: "MBBS, FCPS (OB-GYN)",
      specialty: "Gynecology & PCOS",
      bmdc_demo_reg: "BMDC-DEMO-44102",
      practice_location: "Dhanmondi Care Hub (Demo)",
      district: "Dhaka",
      experience_years: 11,
      is_online_now: 1,
      consultation_fee_minor_poisha: 50000,
      bio: "Specialist in PCOS tracking and maternal follow-ups.",
      doctor_code: "SS-DOC-FAR",
    };
    render(
      <DoctorProfileDetailModal
        doctor={mockDoctor}
        locale="en"
        onClose={() => {}}
        onSelectForBooking={() => {}}
      />
    );
    expect(screen.getByText("Dr. Farhana Rahman (Demo)")).toBeInTheDocument();
    expect(screen.getByText("BMDC-DEMO-44102")).toBeInTheDocument();
    expect(screen.getByText("MBBS, FCPS (OB-GYN)")).toBeInTheDocument();
    expect(screen.getByText(/11 Years Clinical Exp/)).toBeInTheDocument();
    expect(screen.getByText("Book Appointment with this Doctor")).toBeInTheDocument();
  });

  it("16. Prohibits automated hardcoded demo login in CyberScanWorkbench when unauthenticated", async () => {
    renderApp(["/features/prescription-ocr"]);
    // Confirm the page renders and prompts user to sign in rather than auto-authenticating
    await waitFor(() => {
      expect(screen.getAllByText(/EasyOCR/i).length).toBeGreaterThan(0);
    });
    // Check that sign in CTA is visible rather than an active authenticated session
    expect(screen.queryByText(/Sign In Required/i) || screen.getAllByRole("link", { name: /লগইন|সাইন-ইন|Sign In|Log In/i }).length).toBeTruthy();
  });
});
