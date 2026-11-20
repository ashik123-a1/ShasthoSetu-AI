const { chromium } = require(require('path').resolve(__dirname, '../apps/web/node_modules/@playwright/test'));
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Users\\ASHIK_CSE\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe';
const FFMPEG = 'C:\\Users\\ASHIK_CSE\\AppData\\Local\\Programs\\Python\\Python311\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
const BASE_URL = 'http://127.0.0.1:5173';

const BUILD_DIR = path.resolve(__dirname, '../docs/SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01/_build');
const CLIPS_DIR = path.join(BUILD_DIR, 'clips');
const QC_DIR = path.join(CLIPS_DIR, 'qc');

fs.mkdirSync(CLIPS_DIR, { recursive: true });
fs.mkdirSync(QC_DIR, { recursive: true });

const FPS = 30;
const W = 1920;
const H = 1080;

class FfmpegClipWriter {
  constructor(outPath, fps = FPS) {
    this.outPath = outPath;
    this.fps = fps;
    this.frames = 0;
    this.proc = spawn(FFMPEG, [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-r', String(fps),
      '-i', '-',
      '-vf', `scale=${W}:${H}:flags=lanczos,setsar=1`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '16',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      this.outPath,
    ], { stdio: ['pipe', 'ignore', 'pipe'] });

    this.stderr = '';
    this.proc.stderr.on('data', d => { this.stderr += d.toString(); });
  }

  writeJpeg(buf) {
    if (!this.proc.stdin.writable) return;
    this.proc.stdin.write(buf);
    this.frames += 1;
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.proc.on('close', code => {
        if (code !== 0) {
          reject(new Error(`FFmpeg failed (${code}) for ${this.outPath}: ${this.stderr}`));
        } else {
          resolve(this.frames / this.fps);
        }
      });
      this.proc.stdin.end();
    });
  }
}

async function injectNoPreloaderAndCleanUi(contextOrPage) {
  const script = () => {
    try {
      window.sessionStorage.setItem('ss-preloader-seen-v1', '1');
      window.sessionStorage.setItem('ss-orb-intro-done', '1');
      window.localStorage.setItem('ss-theme', 'dark');
      window.localStorage.setItem('ss-locale', 'en');
    } catch (_) {}
  };
  await contextOrPage.addInitScript(script);
}

async function applyCleanCss(page) {
  await page.evaluate(() => {
    try {
      window.sessionStorage.setItem('ss-preloader-seen-v1', '1');
      window.sessionStorage.setItem('ss-orb-intro-done', '1');
      window.localStorage.setItem('ss-theme', 'dark');
      window.localStorage.setItem('ss-locale', 'en');
    } catch (_) {}
    if (!document.getElementById('__v2_clean_css')) {
      const st = document.createElement('style');
      st.id = '__v2_clean_css';
      st.textContent = `
        ::-webkit-scrollbar { display: none !important; }
        html, body { scrollbar-width: none !important; }
      `;
      document.head.appendChild(st);
    }
  });
}

async function assertNoPreloaderOverlay(page, clipName) {
  const hasSkip = await page.evaluate(() => {
    const txt = (document.body.innerText || '');
    return txt.includes('Skip Intro (Esc)');
  });
  if (hasSkip) {
    console.log(`  [WARN] Preloader detected on ${clipName}, clicking skip-preloader-btn...`);
    await page.click('[data-testid="skip-preloader-btn"]').catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function smoothScrollToY(page, targetY, durationMs = 1800) {
  await page.evaluate(async ({ targetY, durationMs }) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const steps = Math.max(12, Math.round(durationMs / 25));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = 0.5 * (1 - Math.cos(Math.PI * t));
      window.scrollTo(0, startY + diff * ease);
      await new Promise(r => setTimeout(r, durationMs / steps));
    }
  }, { targetY, durationMs });
}

async function smoothScrollBy(page, deltaY, durationMs = 1800) {
  const curY = await page.evaluate(() => window.scrollY);
  await smoothScrollToY(page, curY + deltaY, durationMs);
}

async function captureRealtimeSeconds(page, cdp, writer, seconds, hooks = []) {
  const fired = new Set();
  const samples = [];
  const t0 = performance.now();

  while (true) {
    const elapsed = (performance.now() - t0) / 1000.0;
    for (let i = 0; i < hooks.length; i++) {
      if (!fired.has(i) && elapsed >= hooks[i][0]) {
        fired.add(i);
        try {
          await hooks[i][1]();
        } catch (err) {
          console.log(`  [hook warn t=${hooks[i][0]}s]: ${err.message}`);
        }
      }
    }

    let snap;
    try {
      const res = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 90,
        optimizeForSpeed: true,
      });
      snap = Buffer.from(res.data, 'base64');
    } catch (e) {
      if (samples.length > 0) snap = samples[samples.length - 1][1];
      else throw e;
    }

    const tMid = (performance.now() - t0) / 1000.0;
    samples.push([tMid, snap]);
    if (elapsed >= seconds) break;
  }

  const nOut = Math.max(1, Math.round(seconds * FPS));
  let sIdx = 0;
  for (let fi = 0; fi < nOut; fi++) {
    const targetT = fi / FPS;
    while (sIdx + 1 < samples.length && Math.abs(samples[sIdx + 1][0] - targetT) <= Math.abs(samples[sIdx][0] - targetT)) {
      sIdx++;
    }
    writer.writeJpeg(samples[sIdx][1]);
  }
}

async function newCleanPage(browser) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await injectNoPreloaderAndCleanUi(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp };
}

async function gotoReady(page, urlPath, waitMs = 2950, clipName = '') {
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(Math.max(waitMs, 2950));
  await applyCleanCss(page);
  await assertNoPreloaderOverlay(page, clipName);
  await page.waitForTimeout(350);
}

async function demoLogin(page, roleId) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);
  await applyCleanCss(page);
  await assertNoPreloaderOverlay(page, `login-${roleId}`);
  await page.click(`[data-testid="quick-demo-${roleId}"]`);
  // Wait >= 2950ms so portal loads AND FloatingSupportWidget (2450ms intro hop) docks completely
  await page.waitForTimeout(3100);
  await applyCleanCss(page);
}

async function buildClipQcStrips() {
  const { execFileSync } = require('child_process');
  const PY311 = 'C:\\Users\\ASHIK_CSE\\AppData\\Local\\Programs\\Python\\Python311\\python.exe';
  console.log(`\n[QC] Generating accurate 15%/50%/85% 3-frame contact strips for recorded clips...`);
  const pyCode = `
import glob, os, cv2, numpy as np
clips = sorted(glob.glob(os.path.join(${JSON.stringify(CLIPS_DIR)}, '*.mp4')))
for src in clips:
    cap = cv2.VideoCapture(src)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    pcts = [0.16, 0.50, 0.84] if 'clip_00' not in src else [0.22, 0.58, 0.88]
    panels = []
    for p in pcts:
        idx = max(0, min(total - 1, int(total * p)))
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, fr = cap.read()
        if ok and fr is not None:
            fr = cv2.resize(fr, (640, 360), interpolation=cv2.INTER_AREA)
            cv2.putText(fr, f"{int(p*100)}% (f={idx}/{total})", (14, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (56, 189, 248), 2, cv2.LINE_AA)
            panels.append(fr)
    cap.release()
    if panels:
        strip = np.hstack(panels)
        qc_out = os.path.join(${JSON.stringify(QC_DIR)}, 'qc_' + os.path.basename(src).replace('.mp4', '.jpg'))
        cv2.imwrite(qc_out, strip, [cv2.IMWRITE_JPEG_QUALITY, 90])
        print('  [QC OK]', qc_out)
`;
  execFileSync(PY311, ['-c', pyCode], { stdio: 'inherit' });
}

async function run() {
  const onlyArg = process.argv.find(a => a.startsWith('--only='))?.split('=')[1] || null;
  const shouldRun = (name) => !onlyArg || onlyArg.split(',').includes(name);

  console.log('Launching Chromium 1248 (1920x1080 WebGL Enabled)...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--hide-scrollbars',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  // -------------------------------------------------------------------------
  // CLIP 00: Smooth Real-Time Preloader (Clinical Starfield -> 2 Doctors -> SHASTHOSETU AI -> Hero)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_00_preloader')) {
    console.log('\n[REC] clip_00_preloader.mp4 (~9.5s)');
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      try {
        window.sessionStorage.removeItem('ss-preloader-seen-v1');
        window.sessionStorage.setItem('ss-orb-intro-done', '1');
        window.localStorage.setItem('ss-theme', 'dark');
        window.localStorage.setItem('ss-locale', 'en');
        // Slow preloader 38ms progress tick to 58ms so Doctors Back-to-Back & SHASTHOSETU AI breathe cleanly
        const origSI = window.setInterval.bind(window);
        window.setInterval = function (fn, ms, ...args) {
          if (ms === 38) return origSI(fn, 58, ...args);
          return origSI(fn, ms, ...args);
        };
      } catch (_) {}
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_00_preloader.mp4'));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      try {
        window.localStorage.setItem('ss-theme', 'dark');
        window.localStorage.setItem('ss-locale', 'en');
      } catch (_) {}
      if (!document.getElementById('__v2_clean_css')) {
        const st = document.createElement('style');
        st.id = '__v2_clean_css';
        st.textContent = '::-webkit-scrollbar{display:none!important;}html,body{scrollbar-width:none!important;}';
        document.head.appendChild(st);
      }
    });
    await captureRealtimeSeconds(page, cdp, writer, 9.5, []);
    const d = await writer.close();
    console.log(`  Saved clip_00_preloader.mp4 (${d.toFixed(2)}s)`);
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 01: Live 5-Member Team Roster Modal via Radial Orbit Menu (~10.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_01_team_roster')) {
    console.log('\n[REC] clip_01_team_roster.mp4 (~10.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/', 3100, 'clip_01_team_roster');
    await page.waitForSelector('button[aria-label="Toggle ShasthoSetu Radial Orbit Menu"]', { timeout: 8000 });
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_01_team_roster.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 10.5, [
      [0.35, async () => { await page.click('button[aria-label="Toggle ShasthoSetu Radial Orbit Menu"]'); }],
      [1.20, async () => {
        await page.waitForSelector('button[aria-label="Official Project Team"]', { timeout: 4000 });
        await page.click('button[aria-label="Official Project Team"]');
      }],
      [3.40, async () => {
        await page.evaluate(async () => {
          const el = document.querySelector('[role="dialog"] .overflow-y-auto');
          if (!el) return;
          for (let i = 1; i <= 45; i++) {
            el.scrollTop = (el.scrollHeight - el.clientHeight) * (i / 45);
            await new Promise(r => setTimeout(r, 110));
          }
        });
      }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_01_team_roster.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 02: Platform Homepage, 3D Lattice, EN/BN Switch & FindCare 8-Division Map (~14.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_02_home_care_map')) {
    console.log('\n[REC] clip_02_home_care_map.mp4 (~14.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_02_home_care_map.mp4'));

    await gotoReady(page, '/', 3100, 'clip_02_home');
    await captureRealtimeSeconds(page, cdp, writer, 6.2, [
      [1.0, async () => { await page.click('[data-testid="hero-layer-btn-1"]').catch(() => {}); }],
      [2.1, async () => { await page.click('[data-testid="public-settings-btn"]').catch(() => {}); }],
      [2.6, async () => { await page.click('[data-testid="public-lang-bn"]').catch(() => {}); }],
      [4.4, async () => { await page.click('[data-testid="public-lang-en"]').catch(() => {}); }],
      [5.0, async () => { await page.click('[data-testid="public-settings-btn"]').catch(() => {}); }],
    ]);

    await gotoReady(page, '/find-care', 3100, 'clip_02_findcare');
    await page.evaluate(() => document.getElementById('care-atlas')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(400);
    await captureRealtimeSeconds(page, cdp, writer, 4.8, [
      [1.2, async () => { await smoothScrollBy(page, 240, 2200); }],
    ]);

    await gotoReady(page, '/doctors', 3100, 'clip_02_doctors');
    await captureRealtimeSeconds(page, cdp, writer, 3.5, [
      [0.8, async () => { await smoothScrollBy(page, 340, 1800); }],
    ]);

    const d = await writer.close();
    console.log(`  Saved clip_02_home_care_map.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 03: PCOS Clinical XGBoost (M01) + Ultrasound ResNet18 (M02) (~16.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_03_pcos_ai')) {
    console.log('\n[REC] clip_03_pcos_ai.mp4 (~16.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/features/pcos', 3100, 'clip_03_pcos_ai');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_03_pcos_ai.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 16.5, [
      [1.8, async () => { await smoothScrollBy(page, 620, 1400); }],
      [3.8, async () => {
        await page.evaluate(() => document.querySelector('[data-testid="pcos-feature-calc-btn"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }],
      [5.2, async () => { await page.click('[data-testid="pcos-feature-calc-btn"]').catch(() => {}); }],
      [8.2, async () => { await smoothScrollToY(page, 460, 1100); }],
      [9.8, async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('2. Ultrasound AI'));
          if (btn) btn.click();
        });
      }],
      [12.5, async () => { await smoothScrollBy(page, 520, 1600); }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_03_pcos_ai.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 04: Viral Rash AI (M03) & DermoPed Pediatric Skin (M06) (~15.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_04_viral_pediatric')) {
    console.log('\n[REC] clip_04_viral_pediatric.mp4 (~15.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_04_viral_pediatric.mp4'));

    await gotoReady(page, '/features/viral-rash', 3100, 'clip_04_viral_rash');
    await captureRealtimeSeconds(page, cdp, writer, 8.0, [
      [1.6, async () => { await smoothScrollBy(page, 620, 1600); }],
      [4.4, async () => { await smoothScrollBy(page, 620, 1600); }],
    ]);

    await gotoReady(page, '/features/pediatric-rash', 3100, 'clip_04_pediatric');
    await captureRealtimeSeconds(page, cdp, writer, 7.5, [
      [1.8, async () => { await smoothScrollBy(page, 680, 2200); }],
    ]);

    const d = await writer.close();
    console.log(`  Saved clip_04_viral_pediatric.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 05: Safe Prescription OCR Studio & HTTP 422 Verification Gate (~15.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_05_ocr_studio')) {
    console.log('\n[REC] clip_05_ocr_studio.mp4 (~15.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_05_ocr_studio.mp4'));

    await demoLogin(page, 'patient');
    await gotoReady(page, '/services/prescription-ocr', 3100, 'clip_05_ocr_studio');
    await captureRealtimeSeconds(page, cdp, writer, 9.5, [
      [2.0, async () => { await smoothScrollBy(page, 400, 1600); }],
      [5.2, async () => { await smoothScrollBy(page, 420, 1600); }],
    ]);

    await gotoReady(page, '/features/prescription-ocr', 3100, 'clip_05_ocr_feature');
    await captureRealtimeSeconds(page, cdp, writer, 6.0, [
      [1.5, async () => { await smoothScrollBy(page, 500, 1800); }],
    ]);

    const d = await writer.close();
    console.log(`  Saved clip_05_ocr_studio.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 06: Bangla Voice AI 3D Particle Orb & Acoustic Studio (~12.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_06_bangla_voice')) {
    console.log('\n[REC] clip_06_bangla_voice.mp4 (~12.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/features/bangla-voice', 3100, 'clip_06_bangla_voice');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_06_bangla_voice.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 12.0, [
      [3.5, async () => { await smoothScrollBy(page, 520, 1800); }],
      [6.8, async () => { await smoothScrollBy(page, 520, 1800); }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_06_bangla_voice.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 07: Clinical RAG AI Assistant + 3D Body Scanner + LangGraph State Deck (~16.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_07_rag_3d_scanner')) {
    console.log('\n[REC] clip_07_rag_3d_scanner.mp4 (~16.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_07_rag_3d_scanner.mp4'));

    await gotoReady(page, '/services/ai-assistant', 3100, 'clip_07_ai_assistant');
    await captureRealtimeSeconds(page, cdp, writer, 6.5, [
      [1.0, async () => {
        const ta = await page.$('textarea, input[type="text"]');
        if (ta) {
          await ta.fill('Severe chest pain radiating to left arm and shortness of breath');
          await page.waitForTimeout(250);
          await ta.press('Enter').catch(() => {});
        }
      }],
    ]);

    await gotoReady(page, '/research', 3200, 'clip_07_research_3d');
    await page.evaluate(() => document.getElementById('res-3d-scanner')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(500);
    await captureRealtimeSeconds(page, cdp, writer, 5.0, []);

    await page.evaluate(() => document.getElementById('res-agents')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await page.waitForTimeout(700);
    await captureRealtimeSeconds(page, cdp, writer, 4.5, []);

    const d = await writer.close();
    console.log(`  Saved clip_07_rag_3d_scanner.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 08: Authenticated Doctor Telemedicine Desk & Live Call Studio (~12.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_08_doctor_telemedicine')) {
    console.log('\n[REC] clip_08_doctor_telemedicine.mp4 (~12.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await demoLogin(page, 'doctor');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_08_doctor_telemedicine.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 12.5, [
      [2.2, async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Open Live Video/Audio Room'));
          if (btn) btn.click();
        });
      }],
      [6.0, async () => { await smoothScrollBy(page, 540, 2200); }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_08_doctor_telemedicine.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 09: Blood Connect Interactive 5/10/20 km Geo-Radius Network (~10.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_09_blood_connect')) {
    console.log('\n[REC] clip_09_blood_connect.mp4 (~10.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/blood-connect', 3200, 'clip_09_blood_connect');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_09_blood_connect.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 10.5, [
      [1.6, async () => { await smoothScrollBy(page, 520, 1600); }],
      [4.2, async () => {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').trim() === '10 km');
          if (b) b.click();
        });
      }],
      [6.8, async () => { await smoothScrollBy(page, 460, 1800); }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_09_blood_connect.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 10: Zero-PHI Support Desk + Admin Governance & Immutable Audits (~12.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_10_security_rbac')) {
    console.log('\n[REC] clip_10_security_rbac.mp4 (~12.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_10_security_rbac.mp4'));

    await demoLogin(page, 'support');
    await captureRealtimeSeconds(page, cdp, writer, 6.2, [
      [1.0, async () => {
        await page.click('[data-testid="verify-zero-phi-btn"]').catch(() => {});
      }],
      [3.0, async () => { await smoothScrollBy(page, 380, 1400); }],
    ]);

    await demoLogin(page, 'admin');
    await captureRealtimeSeconds(page, cdp, writer, 5.8, [
      [1.8, async () => { await smoothScrollBy(page, 480, 1800); }],
    ]);

    const d = await writer.close();
    console.log(`  Saved clip_10_security_rbac.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 11: Closing 3D Care Lattice Atmospheric Motion Backdrop (~11.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_11_closing_bg')) {
    console.log('\n[REC] clip_11_closing_bg.mp4 (~11.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_11_closing_bg.mp4'));

    await gotoReady(page, '/', 3100, 'clip_11_closing_bg');
    await captureRealtimeSeconds(page, cdp, writer, 5.5, [
      [1.2, async () => { await page.click('[data-testid="hero-layer-btn-3"]').catch(() => {}); }],
    ]);

    await gotoReady(page, '/research', 3200, 'closing_research');
    await page.evaluate(() => document.getElementById('res-3d-scanner')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(500);
    await captureRealtimeSeconds(page, cdp, writer, 5.5, []);

    const d = await writer.close();
    console.log(`  Saved clip_11_closing_bg.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  await browser.close();
  await buildClipQcStrips();
  console.log('\n[DONE] All 12 live website clips recorded & QC contact strips built!');
}

run().catch(err => {
  console.error('Recorder fatal error:', err);
  process.exit(1);
});
