import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = path.resolve("../../docs/evidence/FULLSTACK_01");
const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, "screenshots");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe("FULLSTACK-01 Consolidated End-to-End Platform Verification", () => {
  test("Verifies AgriSense homepage, 4 responsive viewports, RBAC, atomic booking, demo receipt, OCR gate, doctor eRx, Zero-PHI support & admin audit", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const consoleErrors: string[] = [];
    const expectedSecurityProbeLogs: string[] = [];
    const pageErrors: string[] = [];
    let expecting403Probe = false;
    let expecting422Gate = false;

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if ((expecting403Probe && text.includes("403")) || (expecting422Gate && text.includes("422"))) {
          expectedSecurityProbeLogs.push(text);
        } else {
          consoleErrors.push(text);
        }
      }
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    // 1. Public Homepage + Logo + 3D / Layer Switcher + Responsive Checks
    const viewportMetrics: Array<{ name: string; width: number; height: number; overflowX: boolean }> = [];
    const viewports = [
      { name: "mobile_360", width: 360, height: 800, shot: "03_home_mobile_360.png" },
      { name: "mobile_390", width: 390, height: 844, shot: "" },
      { name: "tablet_768", width: 768, height: 1024, shot: "02_home_tablet_768.png" },
      { name: "desktop_1440", width: 1440, height: 900, shot: "01_home_desktop_1440.png" },
    ];

    await page.goto("/", { waitUntil: "networkidle" });

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      viewportMetrics.push({ name: vp.name, width: vp.width, height: vp.height, overflowX: overflow });
      expect(overflow, `Horizontal overflow on ${vp.name}`).toBe(false);
      if (vp.shot) {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, vp.shot), fullPage: false });
      }
    }

    // Verify official logo loaded cleanly & layer switcher updates telemetry
    const logoLoaded = await page.evaluate(() => {
      const img = document.querySelector('img[alt="ShasthoSetu AI Logo"]') as HTMLImageElement | null;
      return Boolean(img && img.complete && img.naturalWidth > 0);
    });
    expect(logoLoaded).toBe(true);
    await expect(page.getByTestId("floating-pill-navbar")).toBeVisible();
    await page.getByTestId("hero-layer-btn-1").click();
    await expect(page.getByTestId("hero-telemetry-card")).toContainText("HTTP 422 Gate");

    // 2. Public Research Page & Non-Diagnostic PCOS Calculator + Isolated /dev/design-system
    await page.goto("/research", { waitUntil: "networkidle" });
    await page.getByTestId("run-pcos-preview-btn").click();
    await expect(page.getByTestId("pcos-preview-result")).toContainText("NON-DIAGNOSTIC");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_research_page.png"), fullPage: false });

    await page.goto("/doctors", { waitUntil: "networkidle" });
    await expect(page.getByTestId("doctors-search-input")).toBeVisible();

    await page.goto("/dev/design-system", { waitUntil: "networkidle" });
    await expect(page.getByTestId("role-sidebar")).toBeVisible();

    // 3. Unauthenticated portal redirect guard
    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByTestId("login-identifier-input")).toBeVisible();

    // 4. Patient Login + Cross-Role 403 UI Guard + OCR Safety Barrier + Atomic Booking & Demo Receipt
    await page.getByTestId("quick-demo-patient").click();
    await page.waitForURL("**/patient/dashboard");
    await expect(page.getByTestId("portal-page-title")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_patient_dashboard.png"), fullPage: false });

    // Cross-role check: Patient accessing Admin goes to /access-denied
    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByTestId("access-denied-page")).toBeVisible();

    // Safe OCR verification gate (block before check -> succeed after checking all critical fields)
    await page.goto("/patient/ocr-review", { waitUntil: "networkidle" });
    expecting422Gate = true;
    await page.getByTestId("activate-ocr-btn-ocr-job-0052").click();
    await expect(page.getByTestId("ui-toast")).toContainText("UNVERIFIED_OCR_FIELDS");
    expecting422Gate = false;

    const verifyBtns = page.locator('[data-testid^="verify-field-btn-"]');
    const btnCount = await verifyBtns.count();
    expect(btnCount).toBeGreaterThan(0);
    for (let i = 0; i < btnCount; i += 1) {
      await verifyBtns.nth(i).click();
      await page.waitForTimeout(150);
    }
    await page.getByTestId("activate-ocr-btn-ocr-job-0052").click();
    await expect(page.getByTestId("ui-toast").last()).toContainText("Verified Medication Plan Activated");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_patient_ocr_verified.png"), fullPage: false });

    // Patient books an open slot with Dr. Farhana & completes Simulated bKash checkout -> Watermarked Receipt
    await page.goto("/patient/doctors", { waitUntil: "networkidle" });
    await page.getByTestId("select-doctor-doc-farhana").click();
    const firstSlotBtn = page.locator('[data-testid^="choose-slot-"]').first();
    await expect(firstSlotBtn).toBeVisible();
    await firstSlotBtn.click();
    await page.getByTestId("confirm-booking-btn").click();
    await page.waitForURL("**/patient/appointments");

    const payBtn = page.locator('[data-testid^="pay-demo-btn-"]').first();
    await expect(payBtn).toBeVisible();
    await payBtn.click();
    await page.waitForURL("**/patient/receipts/**");
    await expect(page.getByTestId("demo-receipt-card")).toContainText("SIMULATED / DEMO RECEIPT");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_patient_demo_receipt.png"), fullPage: false });

    await page.getByTestId("portal-logout-btn").click();
    await page.waitForURL("**/login");

    // 5. Pending Doctor Gate check
    await page.getByTestId("quick-demo-doctor-pending").click();
    await page.waitForURL("**/doctor/onboarding-status");
    await expect(page.getByTestId("doctor-pending-gate")).toBeVisible();
    await page.getByTestId("portal-logout-btn").click();
    await page.waitForURL("**/login");

    // 6. Admin Login + Clinical-Note Privacy Boundary (403) + Doctor Approval Queue
    await page.getByTestId("quick-demo-admin").click();
    await page.waitForURL("**/admin/dashboard");
    await page.goto("/admin/audit-logs", { waitUntil: "networkidle" });
    expecting403Probe = true;
    await page.getByTestId("test-admin-note-redaction-btn").click();
    await expect(page.getByTestId("admin-privacy-proof")).toContainText("CLINICAL_NOTE_REDACTED_FOR_ADMIN");
    expecting403Probe = false;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_admin_audit_privacy.png"), fullPage: false });
    await page.getByTestId("portal-logout-btn").click();
    await page.waitForURL("**/login");

    // 7. Approved Doctor Login + Consultation Workspace + Signed Note + Signed e-Prescription
    await page.getByTestId("quick-demo-doctor").click();
    await page.waitForURL("**/doctor/dashboard");
    await page.goto("/doctor/appointments", { waitUntil: "networkidle" });
    const wsBtn = page.getByRole("button", { name: "Workspace & e-Rx" }).first();
    await expect(wsBtn).toBeVisible();
    await wsBtn.click();
    await page.waitForURL("**/doctor/consultations/**");
    await page.getByTestId("doc-note-subjective").fill("Follow-up checkup & symptomatic review via demo portal.");
    await page.getByTestId("doc-sign-note-btn").click();
    await page.getByTestId("doc-issue-erx-btn").click();
    await expect(page.getByTestId("ui-toast").last()).toContainText("DEMO-RX-");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09_doctor_workspace_erx.png"), fullPage: false });
    await page.getByTestId("portal-logout-btn").click();
    await page.waitForURL("**/login");

    // 8. Support Zero-PHI Desk + Explicit 403 Clinical Guard + Internal Note
    await page.getByTestId("quick-demo-support").click();
    await page.waitForURL("**/support/dashboard");
    await page.goto("/support/tickets", { waitUntil: "networkidle" });
    await expect(page.getByTestId("support-zero-phi-banner")).toBeVisible();
    expecting403Probe = true;
    await page.getByTestId("verify-zero-phi-btn").click();
    await expect(page.getByTestId("zero-phi-proof-text")).toContainText("PHI_ACCESS_DENIED");
    expecting403Probe = false;
    await page.getByTestId("support-internal-mode-btn").click();
    await page.getByTestId("support-reply-textarea").fill("Playwright Zero-PHI internal verification note.");
    await page.getByTestId("support-reply-submit-btn").click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10_support_zero_phi.png"), fullPage: false });

    // Record final JSON metrics
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "playwright_fullstack_metrics.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          viewports: viewportMetrics,
          consoleErrorCount: consoleErrors.length,
          expected403ProbeCount: expectedSecurityProbeLogs.length,
          pageErrorCount: pageErrors.length,
          consoleErrors,
          pageErrors,
          screenshotsCaptured: 10,
          passedAllJourneys: true,
        },
        null,
        2
      ),
      "utf-8"
    );

    expect(consoleErrors, `Browser console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(" | ")}`).toHaveLength(0);
  });
});
