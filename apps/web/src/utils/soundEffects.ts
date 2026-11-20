/**
 * ShasthoSetu Clinical Telemedicine & Notification Sound Synthesizer
 * Built using HTML5 Web Audio API — 100% offline, zero external file dependencies.
 */

let activeAudioCtx: AudioContext | null = null;
let activeRingtoneTimer: number | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!activeAudioCtx || activeAudioCtx.state === "closed") {
      activeAudioCtx = new AudioCtx();
    }
    if (activeAudioCtx.state === "suspended") {
      void activeAudioCtx.resume().catch(() => {});
    }
    return activeAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a single calling burst (dual-frequency European/telecom standard tone)
 */
function playRingBurst() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.setValueAtTime(440, now); // A4
  osc2.frequency.setValueAtTime(480, now); // B4

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
  gain.gain.setValueAtTime(0.08, now + 1.2);
  gain.gain.linearRampToValueAtTime(0.001, now + 1.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.36);
  osc2.stop(now + 1.36);
}

/**
 * Starts continuous calling ringtone loop (plays 1.3s burst every 3s)
 */
export function startCallingToneLoop(): () => void {
  stopCallingToneLoop();
  playRingBurst();
  activeRingtoneTimer = window.setInterval(() => {
    playRingBurst();
  }, 3200);

  return stopCallingToneLoop;
}

/**
 * Stops active ringtone loop
 */
export function stopCallingToneLoop() {
  if (activeRingtoneTimer !== null) {
    window.clearInterval(activeRingtoneTimer);
    activeRingtoneTimer = null;
  }
}

/**
 * Pleasant rising chime when call connects successfully (D5 -> A5)
 */
export function playCallConnected() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";

  osc.frequency.setValueAtTime(587.33, now); // D5
  osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

/**
 * Soft descending chime when call ends (A4 -> E4)
 */
export function playCallEnded() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";

  osc.frequency.setValueAtTime(440.0, now); // A4
  osc.frequency.setValueAtTime(329.63, now + 0.14); // E4

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.36);
}

/**
 * Crisp high notification ping for chat messages and support desk updates
 */
export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";

  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.setValueAtTime(1174.66, now + 0.08); // D6

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.26);
}

/**
 * Celebratory 3-tone harmonic triad for successful demo payment (C5 -> E5 -> G5)
 */
export function playPaymentSuccess() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const tones = [523.25, 659.25, 783.99]; // C5, E5, G5
  tones.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.09;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  });
}
