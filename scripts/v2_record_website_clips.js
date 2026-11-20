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

async function gotoReady(page, urlPath, waitMs = 1500, clipName = '') {
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(waitMs);
  await applyCleanCss(page);
  await assertNoPreloaderOverlay(page, clipName);
  await page.waitForTimeout(300);
}

async function demoLogin(page, roleId) {
  await gotoReady(page, '/login', 1200, `login-${roleId}`);
  await page.click(`[data-testid="quick-demo-${roleId}"]`);
  await page.waitForTimeout(1800);
  await applyCleanCss(page);
}

async function buildClipQcStrips() {
  const { execFileSync } = require('child_process');
  const clips = fs.readdirSync(CLIPS_DIR).filter(f => f.endsWith('.mp4')).sort();
  console.log(`\n[QC] Generating 3-frame contact strips for ${clips.length} recorded clips...`);
  for (const clip of clips) {
    const src = path.join(CLIPS_DIR, clip);
    const qcOut = path.join(QC_DIR, `qc_${clip.replace('.mp4', '.jpg')}`);
    // Use ffmpeg select + tile 3x1 frames across clip duration
    try {
      execFileSync(FFMPEG, [
        '-y', '-loglevel', 'error',
        '-i', src,
        '-vf', 'select=not(mod(n\\,75)),scale=640:360,tile=3x1',
        '-frames:v', '1',
        qcOut,
      ]);
      console.log(`  [QC OK] ${qcOut}`);
    } catch (e) {
      // Fallback if clip < 150 frames
      execFileSync(FFMPEG, [
        '-y', '-loglevel', 'error',
        '-i', src,
        '-vf', 'select=not(mod(n\\,45)),scale=640:360,tile=3x1',
        '-frames:v', '1',
        qcOut,
      ]);
      console.log(`  [QC OK fallback] ${qcOut}`);
    }
  }
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
    // Clear preloader seen flag, suppress orb bouncing popup so intro looks clean
    await ctx.addInitScript(() => {
      try {
        window.sessionStorage.removeItem('ss-preloader-seen-v1');
        window.sessionStorage.setItem('ss-orb-intro-done', '1');
        window.localStorage.setItem('ss-theme', 'dark');
      } catch (_) {}
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_00_preloader.mp4'));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await applyCleanCss(page);
    await captureRealtimeSeconds(page, cdp, writer, 9.5, []);
    const d = await writer.close();
    console.log(`  Saved clip_00_preloader.mp4 (${d.toFixed(2)}s)`);
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 01: Live 5-Member Team Roster Modal via Radial Orbit Menu (~9.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_01_team_roster')) {
    console.log('\n[REC] clip_01_team_roster.mp4 (~9.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/', 1600, 'clip_01_team_roster');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_01_team_roster.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 9.0, [
      [0.3, async () => { await page.click('button[aria-label="Toggle ShasthoSetu Radial Orbit Menu"]'); }],
      [1.1, async () => { await page.click('button[aria-label="Official Project Team"]'); }],
      [3.6, async () => {
        await page.evaluate(async () => {
          const el = document.querySelector('[role="dialog"] .overflow-y-auto');
          if (!el) return;
          for (let i = 1; i <= 40; i++) {
            el.scrollTop = (el.scrollHeight - el.clientHeight) * (i / 40);
            await new Promise(r => setTimeout(r, 95));
          }
        });
      }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_01_team_roster.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 02: Platform Homepage, 3D Lattice, EN/BN Toggle & FindCare 8-Division Map (~14.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_02_home_care_map')) {
    console.log('\n[REC] clip_02_home_care_map.mp4 (~14.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/', 1800, 'clip_02_home_care_map');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_02_home_care_map.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 14.5, [
      [1.2, async () => { await page.click('[data-testid="hero-layer-btn-1"]').catch(() => {}); }],
      [2.8, async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'বাংলা');
          if (btn) btn.click();
        });
      }],
      [4.8, async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'EN');
          if (btn) btn.click();
        });
      }],
      [5.5, async () => { await gotoReady(page, '/find-care', 1200, 'find-care'); }],
      [7.8, async () => {
        await page.evaluate(() => document.getElementById('care-atlas')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }],
      [11.2, async () => { await gotoReady(page, '/doctors', 1200, 'doctors'); }],
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
    await gotoReady(page, '/features/pcos', 1800, 'clip_03_pcos_ai');
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
  // CLIP 04: Viral Rash AI (M03) & DermoPed Pediatric Skin (M06) (~15.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_04_viral_pediatric')) {
    console.log('\n[REC] clip_04_viral_pediatric.mp4 (~15.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/features/viral-rash', 1800, 'clip_04_viral_rash');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_04_viral_pediatric.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 15.0, [
      [2.0, async () => { await smoothScrollBy(page, 650, 1800); }],
      [4.5, async () => { await smoothScrollBy(page, 650, 1800); }],
      [7.5, async () => { await gotoReady(page, '/features/pediatric-rash', 1400, 'clip_04_pediatric'); }],
      [10.2, async () => { await smoothScrollBy(page, 720, 2200); }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_04_viral_pediatric.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 05: Safe Prescription OCR Studio & HTTP 422 Verification Gate (~15.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_05_ocr_studio')) {
    console.log('\n[REC] clip_05_ocr_studio.mp4 (~15.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await demoLogin(page, 'patient');
    await gotoReady(page, '/services/prescription-ocr', 2000, 'clip_05_ocr_studio');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_05_ocr_studio.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 15.0, [
      [2.5, async () => { await smoothScrollBy(page, 420, 1800); }],
      [5.5, async () => { await smoothScrollBy(page, 420, 1800); }],
      [9.5, async () => { await gotoReady(page, '/features/prescription-ocr', 1400, 'clip_05_ocr_feature'); }],
      [11.8, async () => { await smoothScrollBy(page, 500, 1800); }],
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
    await gotoReady(page, '/features/bangla-voice', 1800, 'clip_06_bangla_voice');
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
    await gotoReady(page, '/services/ai-assistant', 1800, 'clip_07_ai_assistant');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_07_rag_3d_scanner.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 16.0, [
      [1.2, async () => {
        const ta = await page.$('textarea, input[type="text"]');
        if (ta) {
          await ta.fill('Severe chest pain radiating to left arm and shortness of breath');
          await page.waitForTimeout(300);
          await ta.press('Enter').catch(() => {});
        }
      }],
      [6.2, async () => { await gotoReady(page, '/research', 1600, 'clip_07_research_3d'); }],
      [8.5, async () => {
        await page.evaluate(() => document.getElementById('res-3d-scanner')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }],
      [12.0, async () => {
        await page.evaluate(() => document.getElementById('res-agents')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_07_rag_3d_scanner.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 08: Authenticated Doctor Telemedicine Desk & Live Call Studio (~12.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_08_doctor_telemedicine')) {
    console.log('\n[REC] clip_08_doctor_telemedicine.mp4 (~12.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await demoLogin(page, 'doctor');
    await page.waitForTimeout(1500);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_08_doctor_telemedicine.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 12.0, [
      [2.8, async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Open Live Video/Audio Room'));
          if (btn) btn.click();
        });
      }],
      [6.5, async () => { await smoothScrollBy(page, 540, 2200); }],
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
    await gotoReady(page, '/blood-connect', 2000, 'clip_09_blood_connect');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_09_blood_connect.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 10.5, [
      [1.8, async () => { await smoothScrollBy(page, 520, 1600); }],
      [4.5, async () => {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').trim() === '10 km');
          if (b) b.click();
        });
      }],
      [7.0, async () => { await smoothScrollBy(page, 480, 1800); }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_09_blood_connect.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 10: Zero-PHI Support Desk + Admin Governance & Immutable Audits (~11.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_10_security_rbac')) {
    console.log('\n[REC] clip_10_security_rbac.mp4 (~11.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await demoLogin(page, 'support');
    await page.waitForTimeout(1400);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_10_security_rbac.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 11.5, [
      [1.4, async () => {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').toLowerCase().includes('zero-phi'));
          if (b) b.click();
        });
      }],
      [3.0, async () => { await smoothScrollBy(page, 400, 1200); }],
      [5.5, async () => { await demoLogin(page, 'admin'); }],
      [8.5, async () => { await smoothScrollBy(page, 460, 1600); }],
    ]);
    const d = await writer.close();
    console.log(`  Saved clip_10_security_rbac.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 11: Closing 3D Care Lattice Atmospheric Motion Backdrop (~10.5s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_11_closing_bg')) {
    console.log('\n[REC] clip_11_closing_bg.mp4 (~10.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/', 1800, 'clip_11_closing_bg');
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_11_closing_bg.mp4'));
    await captureRealtimeSeconds(page, cdp, writer, 10.5, [
      [2.5, async () => { await page.click('[data-testid="hero-layer-btn-3"]').catch(() => {}); }],
      [5.2, async () => { await gotoReady(page, '/research', 1200, 'closing_research'); }],
      [6.8, async () => {
        await page.evaluate(() => document.getElementById('res-3d-scanner')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }],
    ]);
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
