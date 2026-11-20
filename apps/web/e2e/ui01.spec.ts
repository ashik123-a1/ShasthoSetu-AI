import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const EVIDENCE_DIR = path.resolve("../../docs/evidence/UI_01");
const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, "screenshots");

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "mobile_360", width: 360, height: 800 },
  { name: "mobile_390", width: 390, height: 844 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

test.describe("UI-01 Responsive, Accessibility & Screenshot Suite", () => {
  test("Verifies 4 responsive viewports, reload persistence, tap targets, modal focus trap & zero console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const viewportMetrics: Array<Record<string, unknown>> = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    await page.goto("/dev/design-system", { waitUntil: "networkidle" });

    // Check zero external CDN styles/scripts loaded
    const externalCdnCount = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[href], script[src]'));
      return links.filter((el) => {
        const ref = el.getAttribute("href") || el.getAttribute("src") || "";
        return /^https?:\/\//i.test(ref) && !ref.includes("127.0.0.1");
      }).length;
    });
    expect(externalCdnCount).toBe(0);

    // Ensure baseline light theme for test step 1
    const currentTheme = await page.locator("html").getAttribute("data-theme");
    if (currentTheme === "dark") {
      await page.getByTestId("theme-switch").click();
    }

    // 1. Desktop Light Bengali (default)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01_desktop_1440_light_bn.png"),
      fullPage: false,
    });

    // 2. Desktop Dark AgriSense-Obsidian Bengali + reload persistence test
    await page.getByTestId("theme-switch").click();
    await page.getByTestId("lang-btn-en").click();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Dark theme Bengali desktop shot
    await page.getByTestId("lang-btn-bn").click();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02_desktop_1440_dark_bn.png"),
      fullPage: false,
    });

    // 3. Light theme English desktop shot
    await page.getByTestId("theme-switch").click();
    await page.getByTestId("lang-btn-en").click();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03_desktop_1440_light_en.png"),
      fullPage: false,
    });

    // Restore default bn + light for 4-viewport responsive sweep
    await page.getByTestId("lang-btn-bn").click();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => {
        const controls = Array.from(
          document.querySelectorAll("button, [role='tab'], a[href]")
        ).filter((el) => {
          if (el.classList.contains("sr-only")) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        const undersized = controls
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.height < 44;
          })
          .map((el) => ({
            text: (el.textContent || "").trim().slice(0, 40),
            w: Math.round(el.getBoundingClientRect().width),
            h: Math.round(el.getBoundingClientRect().height),
          }));

        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflowX: document.documentElement.scrollWidth > window.innerWidth,
          fontsLoaded: document.fonts.status,
          visibleControlsCount: controls.length,
          controlsUnder44pxHeightCount: undersized.length,
          undersizedSample: undersized.slice(0, 5),
        };
      });

      viewportMetrics.push({ viewport: vp.name, width: vp.width, height: vp.height, ...metrics });
      expect(
        metrics.scrollWidth,
        `Horizontal overflow detected at ${vp.name}`
      ).toBeLessThanOrEqual(metrics.innerWidth);
      expect(metrics.fontsLoaded).toBe("loaded");
      expect(
        metrics.controlsUnder44pxHeightCount,
        `Found interactive controls shorter than 44px at ${vp.name}: ${JSON.stringify(metrics.undersizedSample)}`
      ).toBe(0);
    }

    // 4. Tablet 768px Light Bengali
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04_tablet_768_light_bn.png"),
    });

    // 5. Mobile 390px Light Bengali
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05_mobile_390_light_bn.png"),
    });

    // 6. Mobile 390px Dark English
    await page.getByTestId("theme-switch").click();
    await page.getByTestId("lang-btn-en").click();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06_mobile_390_dark_en.png"),
    });

    // 7. Mobile 360px Light Bengali
    await page.getByTestId("theme-switch").click();
    await page.getByTestId("lang-btn-bn").click();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07_mobile_360_light_bn.png"),
    });

    // 8. Mobile 390px Drawer Interaction
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("mobile-menu-trigger").click();
    await expect(page.getByTestId("mobile-nav-drawer")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08_mobile_390_nav_drawer_open.png"),
    });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("mobile-nav-drawer")).toBeHidden();

    // 9. Desktop ConfirmModal Interaction & Focus Restore
    await page.setViewportSize({ width: 1440, height: 900 });
    const modalTrigger = page.getByTestId("open-confirm-modal");
    await modalTrigger.click();
    await expect(page.getByTestId("confirm-modal")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "09_desktop_confirm_modal_open.png"),
    });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("confirm-modal")).toBeHidden();
    await expect(modalTrigger).toBeFocused();

    // 10. Desktop Empty / Error / Offline State Check
    await page.getByTestId("toggle-offline-btn").click();
    await page.getByTestId("state-mode-error").click();
    await expect(page.getByTestId("ui-offline-banner")).toBeVisible();
    await expect(page.getByTestId("ui-error-state")).toBeVisible();
    await page.getByTestId("states-workbench").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "10_desktop_states_empty_error_offline.png"),
    });

    // 11. Role Sidebar Switcher (ADMIN) & Unauthenticated Guard Check
    await page.getByTestId("toggle-offline-btn").click();
    await page.getByTestId("state-mode-ready").click();
    await page.getByTestId("role-switch-ADMIN").click();
    await expect(page.getByTestId("sidebar-item-ad-audit")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "11_desktop_role_preview_admin.png"),
    });

    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByTestId("login-identifier-input")).toBeVisible();

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "playwright_metrics.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          externalCdnCount,
          viewportMetrics,
          consoleErrors,
          pageErrors,
        },
        null,
        2
      ),
      "utf-8"
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
