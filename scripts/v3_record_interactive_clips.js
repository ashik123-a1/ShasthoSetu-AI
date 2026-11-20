const { chromium } = require(require('path').resolve(__dirname, '../apps/web/node_modules/@playwright/test'));
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Users\\ASHIK_CSE\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe';
const FFMPEG = 'C:\\Users\\ASHIK_CSE\\AppData\\Local\\Programs\\Python\\Python311\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
const PY311 = 'C:\\Users\\ASHIK_CSE\\AppData\\Local\\Programs\\Python\\Python311\\python.exe';
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
        if (code !== 0) reject(new Error(`FFmpeg failed (${code}) for ${this.outPath}: ${this.stderr}`));
        else resolve(this.frames / this.fps);
      });
      this.proc.stdin.end();
    });
  }
}

async function injectNoPreloaderAndCleanUi(contextOrPage) {
  await contextOrPage.addInitScript(() => {
    try {
      window.sessionStorage.setItem('ss-preloader-seen-v1', '1');
      window.sessionStorage.setItem('ss-orb-intro-done', '1');
      window.localStorage.setItem('ss-theme', 'dark');
      window.localStorage.setItem('ss-locale', 'en');
    } catch (_) {}
  });
}

async function applyCleanCss(page) {
  await page.evaluate(() => {
    try {
      window.sessionStorage.setItem('ss-preloader-seen-v1', '1');
      window.sessionStorage.setItem('ss-orb-intro-done', '1');
      window.localStorage.setItem('ss-theme', 'dark');
      window.localStorage.setItem('ss-locale', 'en');
    } catch (_) {}
    if (!document.getElementById('__v3_clean_css')) {
      const st = document.createElement('style');
      st.id = '__v3_clean_css';
      st.textContent = '::-webkit-scrollbar{display:none!important;}html,body{scrollbar-width:none!important;}';
      document.head.appendChild(st);
    }
  });
}

async function assertNoPreloaderOverlay(page, clipName) {
  const hasSkip = await page.evaluate(() => (document.body.innerText || '').includes('Skip Intro (Esc)'));
  if (hasSkip) {
    console.log(`  [WARN] Preloader detected on ${clipName}, skipping...`);
    await page.click('[data-testid="skip-preloader-btn"]').catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function smoothScrollToY(page, targetY, durationMs = 1500) {
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

async function smoothScrollBy(page, deltaY, durationMs = 1500) {
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
      const res = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true });
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

async function gotoReady(page, urlPath, waitMs = 3100, clipName = '') {
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(Math.max(waitMs, 3100));
  await applyCleanCss(page);
  await assertNoPreloaderOverlay(page, clipName);
  await page.waitForTimeout(300);
}

async function demoLogin(page, roleId) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);
  await applyCleanCss(page);
  await assertNoPreloaderOverlay(page, `login-${roleId}`);
  await page.click(`[data-testid="quick-demo-${roleId}"]`);
  await page.waitForTimeout(3200);
  await applyCleanCss(page);
}

async function buildV3QcStrips(targetNames) {
  console.log(`\n[QC] Generating 4-panel (12%/38%/65%/88%) QC contact strips for ${targetNames.length} upgraded clips...`);
  const pyCode = `
import os, cv2, numpy as np
names = ${JSON.stringify(targetNames)}
for name in names:
    src = os.path.join(${JSON.stringify(CLIPS_DIR)}, name + '.mp4')
    if not os.path.exists(src): continue
    cap = cv2.VideoCapture(src)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    pcts = [0.12, 0.38, 0.65, 0.88] if 'preloader' not in name else [0.15, 0.42, 0.68, 0.90]
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
    if len(panels) == 4:
        grid = np.vstack([np.hstack(panels[:2]), np.hstack(panels[2:])])
        qc_out = os.path.join(${JSON.stringify(QC_DIR)}, 'qc_' + name + '.jpg')
        cv2.imwrite(qc_out, grid, [cv2.IMWRITE_JPEG_QUALITY, 90])
        print('  [QC OK]', qc_out)
`;
  execFileSync(PY311, ['-c', pyCode], { stdio: 'inherit' });
}

async function run() {
  const onlyArg = process.argv.find(a => a.startsWith('--only='))?.split('=')[1] || null;
  const targetAll = [
    'clip_00_preloader_fast',
    'clip_03_pcos_live',
    'clip_04_viral_pediatric_live',
    'clip_05_ocr_dual_gate',
    'clip_06_bangla_voice_live',
    'clip_07_rag_citations_live',
  ];
  const shouldRun = (name) => !onlyArg || onlyArg.split(',').includes(name);

  console.log('Launching Chromium 1248 for v3 interactive captures...');
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
  // CLIP 00 FAST: Crisp ~3.8s Preloader (Native 38ms Spring -> 2 Doctors -> SHASTHOSETU AI -> Hero)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_00_preloader_fast')) {
    console.log('\n[REC] clip_00_preloader_fast.mp4 (~4.7s)');
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      try {
        window.sessionStorage.removeItem('ss-preloader-seen-v1');
        window.sessionStorage.setItem('ss-orb-intro-done', '1');
        window.localStorage.setItem('ss-theme', 'dark');
        window.localStorage.setItem('ss-locale', 'en');
      } catch (_) {}
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_00_preloader_fast.mp4'));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      const st = document.createElement('style');
      st.textContent = '::-webkit-scrollbar{display:none!important;}html,body{scrollbar-width:none!important;}';
      document.head.appendChild(st);
    });
    // Wait 550ms so 8,600 particles converge cleanly onto 2 Doctors Back-to-Back right at frame 0
    await page.waitForTimeout(550);
    await captureRealtimeSeconds(page, cdp, writer, 4.7, []);
    const d = await writer.close();
    console.log(`  Saved clip_00_preloader_fast.mp4 (${d.toFixed(2)}s)`);
    await ctx.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 03 LIVE: PCOS M01 XGBoost + M02 ResNet18 Ultrasound (Input -> CyberScan -> Result -> Limitations)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_03_pcos_live')) {
    console.log('\n[REC] clip_03_pcos_live.mp4 (~18.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/features/pcos', 3100, 'clip_03_pcos_live');
    await page.evaluate(() => document.querySelector('[data-testid="analyze-ai-btn"]')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(400);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_03_pcos_live.mp4'));

    // Seg A: M01 Clinical XGBoost Input -> Vortex/Laser Execution -> Live Result + Non-Diagnostic Limit
    await captureRealtimeSeconds(page, cdp, writer, 9.0, [
      [1.2, async () => { await page.click('[data-testid="analyze-ai-btn"]'); }],
      [5.5, async () => { await smoothScrollBy(page, 260, 1800); }],
    ]);

    // Transition cleanly to Track 2 (Ultrasound ResNet18)
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => (el.textContent || '').includes('2. Ultrasound AI'));
      if (b) b.click();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('[data-testid="load-sample-pcos-ultrasound"]')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(400);

    // Seg B: Load Real Sample -> Run ResNet18 -> Live Result + Limitation Caveat
    await captureRealtimeSeconds(page, cdp, writer, 9.0, [
      [0.8, async () => { await page.click('[data-testid="load-sample-pcos-ultrasound"]'); }],
      [2.2, async () => { await page.click('[data-testid="analyze-ai-btn"]'); }],
      [6.0, async () => { await smoothScrollBy(page, 280, 1800); }],
    ]);

    const d = await writer.close();
    console.log(`  Saved clip_03_pcos_live.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 04 LIVE: Viral Rash (M03) + DermoPed (M06) Live Sample -> Execution -> Result -> Limitations
  // -------------------------------------------------------------------------
  if (shouldRun('clip_04_viral_pediatric_live')) {
    console.log('\n[REC] clip_04_viral_pediatric_live.mp4 (~19.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_04_viral_pediatric_live.mp4'));

    // Seg A: M03 Viral Rash
    await gotoReady(page, '/features/viral-rash', 3100, 'clip_04_viral');
    await page.evaluate(() => document.querySelector('[data-testid="load-sample-viral-rash"]')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(400);
    await captureRealtimeSeconds(page, cdp, writer, 9.5, [
      [0.7, async () => { await page.click('[data-testid="load-sample-viral-rash"]'); }],
      [2.0, async () => { await page.click('[data-testid="analyze-ai-btn"]'); }],
      [6.2, async () => { await smoothScrollBy(page, 420, 2000); }],
    ]);

    // Seg B: M06 DermoPed + N=22 Cohort Limit
    await gotoReady(page, '/features/pediatric-rash', 3100, 'clip_04_dermoped');
    await page.evaluate(() => document.querySelector('[data-testid="load-sample-dermoped"]')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(400);
    await captureRealtimeSeconds(page, cdp, writer, 9.5, [
      [0.7, async () => { await page.click('[data-testid="load-sample-dermoped"]'); }],
      [2.0, async () => { await page.click('[data-testid="analyze-ai-btn"]'); }],
      [6.0, async () => { await smoothScrollBy(page, 420, 2000); }],
    ]);

    const d = await writer.close();
    console.log(`  Saved clip_04_viral_pediatric_live.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 05 DUAL GATE: Patient Text Verification ("Not Clinician Authorized") + HTTP 422 Block vs Doctor Approval
  // -------------------------------------------------------------------------
  if (shouldRun('clip_05_ocr_dual_gate')) {
    console.log('\n[REC] clip_05_ocr_dual_gate.mp4 (~17.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_05_ocr_dual_gate.mp4'));
    const sampleRx = path.resolve(__dirname, '../services/api/evals/ocr_benchmark/rx_mixed_codeswitch.png');

    // Seg A1: Upload unverified synthetic Rx, save Patient text verification ("Not Clinician Authorized")
    await demoLogin(page, 'patient');
    await gotoReady(page, '/services/prescription-ocr', 3100, 'clip_05_ocr_patient');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput && fs.existsSync(sampleRx)) {
      await fileInput.setInputFiles(sampleRx);
      await page.waitForTimeout(2500);
    }
    await captureRealtimeSeconds(page, cdp, writer, 3.8, [
      [1.0, async () => { await page.click('[data-testid="ocr-verify-all-btn"]'); }],
      [2.6, async () => { await page.click('[data-testid="ocr-explain-btn"]'); }],
    ]);

    // Pause capture until Block 3 renders "Patient Acknowledged (Not Clinician Authorized)"
    await page.waitForSelector('[data-testid="ocr-explanation-container"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('[data-testid="ocr-explanation-container"]')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(400);
    await captureRealtimeSeconds(page, cdp, writer, 5.2, []);

    // Seg B: Show live HTTP 422 UNVERIFIED_OCR_FIELDS barrier on /features/prescription-ocr
    await gotoReady(page, '/features/prescription-ocr', 3100, 'clip_05_http422');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Step 2: Activate'));
      if (btn) btn.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(400);
    await captureRealtimeSeconds(page, cdp, writer, 3.5, [
      [0.8, async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Step 2: Activate'));
          if (btn) btn.click();
        });
      }],
    ]);

    // Seg C: Doctor Portal Separate Clinician Review & Signed e-Prescription
    await demoLogin(page, 'doctor');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Open Consultation Room'));
      if (btn) btn.click();
    }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h2, h3, div')).find(el => (el.textContent || '').includes('Issue Signed Demo E-Prescription'));
      if (h) h.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(400);
    await captureRealtimeSeconds(page, cdp, writer, 5.0, []);

    const d = await writer.close();
    console.log(`  Saved clip_05_ocr_dual_gate.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 06 BANGLA VOICE LIVE: Bangla Clinical Chip -> Live Response -> FLEURS 39.09% Limit Chart
  // -------------------------------------------------------------------------
  if (shouldRun('clip_06_bangla_voice_live')) {
    console.log('\n[REC] clip_06_bangla_voice_live.mp4 (~12.5s)');
    const { context, page, cdp } = await newCleanPage(browser);
    await gotoReady(page, '/features/bangla-voice', 3100, 'clip_06_bangla_voice_live');
    await page.evaluate(() => window.scrollTo(0, 420));
    await page.waitForTimeout(400);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_06_bangla_voice_live.mp4'));

    await captureRealtimeSeconds(page, cdp, writer, 3.8, [
      [1.2, async () => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('পিসিওএস') || (b.textContent || '').includes('Verify Rx'));
          if (btn) btn.click();
        });
      }],
    ]);

    // Wait cleanly up to 14s if live LLM reply is rendering before showing reply & FLEURS limitation section
    await page.waitForTimeout(6500);
    await captureRealtimeSeconds(page, cdp, writer, 8.7, [
      [3.2, async () => { await smoothScrollBy(page, 540, 2200); }],
    ]);

    const d = await writer.close();
    console.log(`  Saved clip_06_bangla_voice_live.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  // -------------------------------------------------------------------------
  // CLIP 07 RAG + CITATION DRAWER + 999 GATE + 3D SCANNER + LANGGRAPH (~20.0s)
  // -------------------------------------------------------------------------
  if (shouldRun('clip_07_rag_citations_live')) {
    console.log('\n[REC] clip_07_rag_citations_live.mp4 (~20.0s)');
    const { context, page, cdp } = await newCleanPage(browser);
    const writer = new FfmpegClipWriter(path.join(CLIPS_DIR, 'clip_07_rag_citations_live.mp4'));

    // Warm qwen2.5:7b before recording so response renders fast & reliably
    await gotoReady(page, '/services/ai-assistant', 3100, 'clip_07_warm');
    await page.evaluate(async () => {
      try {
        await fetch('/v1/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'What are the Rotterdam criteria for PCOS?', language_mode: 'en' }),
        });
      } catch (_) {}
    });

    // Seg A1: Type question & submit live
    await gotoReady(page, '/services/ai-assistant', 3100, 'clip_07_rag_qa');
    await captureRealtimeSeconds(page, cdp, writer, 2.2, [
      [0.4, async () => {
        const ta = await page.$('textarea, input[type="text"]');
        if (ta) {
          await ta.fill('What are the Rotterdam criteria for PCOS?');
          await page.waitForTimeout(250);
          await ta.press('Enter');
        }
      }],
    ]);

    // Wait cleanly for live grounded answer & citation pills
    await page.waitForSelector('[data-testid="citation-pill-1"]', { timeout: 22000 });
    await page.waitForTimeout(450);

    // Seg A2: Grounded Answer + Citations -> Click Citation Pill -> Hold Open CitationDrawer!
    await captureRealtimeSeconds(page, cdp, writer, 6.8, [
      [2.2, async () => { await page.click('[data-testid="citation-pill-1"]'); }],
      [4.5, async () => {
        await page.evaluate(() => {
          const dlg = document.querySelector('[data-testid="citation-source-dialog"] .overflow-y-auto, [data-testid="citation-source-dialog"]');
          if (dlg) dlg.scrollTop = 180;
        });
      }],
    ]);

    // Seg B: Separate Emergency Code 999 Red-Flag Override Demo
    await gotoReady(page, '/services/ai-assistant', 3100, 'clip_07_999');
    const ta2 = await page.$('textarea, input[type="text"]');
    if (ta2) {
      await ta2.fill('Severe chest pain radiating to left arm and shortness of breath');
      await page.waitForTimeout(200);
      await ta2.press('Enter');
    }
    await page.waitForFunction(() => (document.body.innerText || '').includes('999'), { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(400);
    await captureRealtimeSeconds(page, cdp, writer, 4.2, []);

    // Seg C & D: Research Holographic 3D Body Scanner + LangGraph State Machine
    await gotoReady(page, '/research', 3200, 'clip_07_research');
    await page.evaluate(() => document.getElementById('res-3d-scanner')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(450);
    await captureRealtimeSeconds(page, cdp, writer, 3.6, []);

    await page.evaluate(() => document.getElementById('res-agents')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await page.waitForTimeout(700);
    await captureRealtimeSeconds(page, cdp, writer, 3.2, []);

    const d = await writer.close();
    console.log(`  Saved clip_07_rag_citations_live.mp4 (${d.toFixed(2)}s)`);
    await context.close();
  }

  await browser.close();
  await buildV3QcStrips(onlyArg ? onlyArg.split(',') : targetAll);
  console.log('\n[DONE] v3 interactive clips captured & 4-panel QC strips generated!');
}

run().catch(err => {
  console.error('v3 recorder fatal error:', err);
  process.exit(1);
});
