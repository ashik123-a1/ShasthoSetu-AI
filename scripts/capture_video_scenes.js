const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../apps/web/node_modules/@playwright/test'));
const fs = require('fs');

const CAPTURES_DIR = path.resolve(__dirname, '../docs/SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01/captures');

if (!fs.existsSync(CAPTURES_DIR)) {
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
}

async function captureScene(page, url, filename, waitSelector = null, waitMs = 2500) {
  console.log(`Capturing: ${url} -> ${filename}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`Network idle timeout on ${url}, proceeding anyway...`);
  }

  if (waitSelector) {
    try {
      await page.waitForSelector(waitSelector, { timeout: 8000 });
    } catch (e) {
      console.log(`Selector ${waitSelector} not found or timed out, continuing...`);
    }
  }

  await page.waitForTimeout(waitMs);
  const destPath = path.join(CAPTURES_DIR, filename);
  await page.screenshot({ path: destPath, fullPage: false });
  console.log(`Saved screenshot: ${destPath}`);
}

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Users\\ASHIK_CSE\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.0,
  });

  // Pre-seed mock auth for role-protected pages
  await context.addInitScript(() => {
    localStorage.setItem('shasthosetu_demo_role', 'CLINICIAN');
    localStorage.setItem('shasthosetu_user_name', 'Dr. Farhana Rahman (BMDC #A-84920)');
    localStorage.setItem('shasthosetu_demo_active', 'true');
  });

  const page = await context.newPage();

  console.log("Starting Scene Capture Pipeline (1920x1080)...");

  // Scene 02: Particle Preloader / Splash
  await captureScene(page, 'http://127.0.0.1:5173/?show_preloader=1', 'scene_02_preloader.png', null, 1200);

  // Scene 03: Platform Homepage
  await captureScene(page, 'http://127.0.0.1:5173/', 'scene_03_homepage.png', null, 2500);

  // Scene 04: Patient Journey & Doctor Search
  await captureScene(page, 'http://127.0.0.1:5173/find-care', 'scene_04_find_care.png', null, 2500);

  // Scene 05: PCOS Feature Page
  await captureScene(page, 'http://127.0.0.1:5173/pcos', 'scene_05_pcos_multimodal.png', null, 3000);

  // Scene 06: Viral Rash & Pediatric Dermatology
  await captureScene(page, 'http://127.0.0.1:5173/viral-rash', 'scene_06_viral_rash.png', null, 2500);
  await captureScene(page, 'http://127.0.0.1:5173/pediatric-rash', 'scene_06_pediatric_dermatology.png', null, 2500);

  // Scene 07: Prescription OCR Studio
  await captureScene(page, 'http://127.0.0.1:5173/ocr-studio', 'scene_07_ocr_studio.png', null, 3000);

  // Scene 08: Bangla Voice Assistant
  await captureScene(page, 'http://127.0.0.1:5173/bangla-voice', 'scene_08_bangla_voice.png', null, 2500);

  // Scene 09: AI Assistant & Clinical RAG
  await captureScene(page, 'http://127.0.0.1:5173/ai-assistant', 'scene_09_clinical_rag.png', null, 3000);

  // Scene 10: Telemedicine / Doctor Portal
  await captureScene(page, 'http://127.0.0.1:5173/doctor/dashboard', 'scene_10_doctor_telemedicine.png', null, 2500);

  // Scene 11: Blood Connect Emergency Network
  await captureScene(page, 'http://127.0.0.1:5173/blood-connect', 'scene_11_blood_connect.png', null, 2500);

  // Scene 12: Security & Admin Portal / Audit
  await captureScene(page, 'http://127.0.0.1:5173/admin/dashboard', 'scene_12_admin_security.png', null, 2500);

  // Scene 13: Research Lab Hub & Platform Roadmap
  await captureScene(page, 'http://127.0.0.1:5173/research', 'scene_13_research_roadmap.png', null, 2500);

  await browser.close();
  console.log("All scene captures completed successfully!");
}

run().catch(err => {
  console.error("Capture failed:", err);
  process.exit(1);
});
