import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { apiPost, apiPostForm } from "../../lib/apiClient";
import { useI18n } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";
import { TrustBadge } from "../ui";
import { LandGuardVoiceOrb3D, type VoiceOrbState } from "../three/LandGuardVoiceOrb3D";

interface TranscribeResult {
  asr_job_id: string;
  raw_transcript: string;
  language_mode: string;
  detected_language: string;
  model_id: string;
  device: string;
  duration_sec: number;
  bn_unicode_pct: number;
  latency_ms: number;
  limitation_note: string;
  requires_confirmation: boolean;
}

interface ChatCitation {
  citation_num: number;
  source_title: string;
  publisher: string;
  snippet_text: string;
}

interface ChatResponse {
  answer_text: string;
  response_language: string;
  grounded_status: string;
  model_id: string;
  latency_ms: number;
  safety_flags: string[];
  citations: ChatCitation[];
}

function encodePcmWav(samples: Float32Array, sourceRate: number, targetRate = 16000): Blob {
  let mono = samples;
  if (sourceRate !== targetRate && samples.length > 0) {
    const ratio = sourceRate / targetRate;
    const newLen = Math.max(1, Math.round(samples.length / ratio));
    const resampled = new Float32Array(newLen);
    for (let i = 0; i < newLen; i += 1) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = samples[idx] ?? 0;
      const b = samples[Math.min(samples.length - 1, idx + 1)] ?? a;
      resampled[i] = a + (b - a) * frac;
    }
    mono = resampled;
  }

  const buffer = new ArrayBuffer(44 + mono.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + mono.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, mono.length * 2, true);

  let offset = 44;
  for (let i = 0; i < mono.length; i += 1) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

const SAMPLE_MEDICAL_PROMPTS = [
  { label: "\"পিসিওএস-এর প্রধান লক্ষণ কী?\"", text: "পিসিওএস-এর প্রধান লক্ষণ কী এবং আল্ট্রাসাউন্ড কি একাই রোগ নির্ণয় করে?", lang: "bn" as const },
  { label: "\"শিশুর জ্বর ও র‍্যাশে কখন জরুরি?\"", text: "শিশুর জ্বর ও র‍্যাশের সাথে কোন লক্ষণ থাকলে তাৎক্ষণিক জরুরি হাসপাতালে নিতে হবে?", lang: "bn" as const },
  { label: "\"Verify Rx OCR before alarms?\"", text: "Why must prescription OCR doses be verified by a human before activating medication reminders?", lang: "en" as const },
  { label: "\"রক্ত নেওয়ার আগে হাসপাতালে কী পরীক্ষা?\"", text: "ব্লাড কানেক্টে রক্তদাতা পাওয়ার পর হাসপাতালে কী কী পরীক্ষা বাধ্যতামূলক?", lang: "bn" as const },
];

const EQ_BAND_COUNT = 32;

export function BanglaVoiceWorkbench({
  onScanStateChange,
}: {
  onScanStateChange?: (scanning: boolean, conf: number | null) => void;
}) {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();

  const [languageMode, setLanguageMode] = useState<"auto" | "bn" | "en">("auto");
  const [orbState, setOrbState] = useState<VoiceOrbState>("IDLE");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [askingAi, setAskingAi] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const [asrResult, setAsrResult] = useState<TranscribeResult | null>(null);
  const [editableText, setEditableText] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [chatReply, setChatReply] = useState<ChatResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioLevelRef = useRef<number>(0);
  const eqBarRefs = useRef<(HTMLDivElement | null)[]>([]);
  const energyLabelRef = useRef<HTMLSpanElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);

  const playChime = (kind: "activate" | "reply" | "stop") => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      if (kind === "activate") {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(920, now + 0.14);
      } else if (kind === "reply") {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      } else {
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.14);
      }
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
      window.setTimeout(() => void ctx.close(), 300);
    } catch {
      // Optional audio feedback
    }
  };

  // Drive the 32-band equalizer & 3D orb audio intensity via requestAnimationFrame (zero React re-renders!)
  useEffect(() => {
    if (motionPaused) {
      audioLevelRef.current = 0;
      eqBarRefs.current.forEach((b, idx) => {
        if (b) b.style.height = `${16 + (idx % 4) * 5}%`;
      });
      return undefined;
    }

    let rafId = 0;
    const freqData = new Uint8Array(64);
    const tick = (nowMs: number) => {
      const sec = nowMs / 1000;
      let level = 0.08;

      if (recording && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < 32; i += 1) sum += freqData[i];
        level = Math.min(0.45, (sum / (32 * 255)) * 0.65);
        eqBarRefs.current.forEach((bar, idx) => {
          if (!bar) return;
          const v = freqData[idx % 32] ?? 0;
          const pct = Math.max(12, Math.min(100, Math.round((v / 255) * 100)));
          bar.style.height = `${pct}%`;
        });
      } else {
        const mult =
          orbState === "PROCESSING" ? 0.85 : orbState === "SPEAKING" ? 0.78 : orbState === "LISTENING" ? 0.55 : 0.18;
        level = mult * 0.28 * (0.65 + 0.35 * Math.sin(sec * 5));
        eqBarRefs.current.forEach((bar, idx) => {
          if (!bar) return;
          const wave = 0.5 + 0.5 * Math.sin(sec * (orbState === "IDLE" ? 2.6 : 9.5) + idx * 0.42);
          const pct = Math.max(10, Math.min(98, Math.round((0.14 + wave * mult) * 100)));
          bar.style.height = `${pct}%`;
        });
      }

      audioLevelRef.current = level;
      if (energyLabelRef.current) {
        const displayPct = Math.round(Math.max(12, Math.min(100, level * 260)));
        energyLabelRef.current.textContent = `${displayPct}% LEVEL`;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [recording, orbState, motionPaused]);

  const stopMicStream = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    procRef.current?.disconnect();
    procRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
  };

  const stopPlayback = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setOrbState("IDLE");
    onScanStateChange?.(false, null);
  };

  useEffect(() => {
    return () => {
      stopMicStream();
      stopPlayback();
    };
  }, []);

  const runTranscribeBlob = async (blob: Blob, filename: string) => {
    setTranscribing(true);
    setOrbState("PROCESSING");
    onScanStateChange?.(true, null);
    setErrorMsg(null);
    setAsrResult(null);

    try {
      const fd = new FormData();
      fd.append("file", blob, filename);
      fd.append("language_mode", languageMode);
      const res = await apiPostForm<TranscribeResult>("/v1/ai/voice/transcribe", fd);
      setAsrResult(res);
      setEditableText(res.raw_transcript || "");
      setManualQuery(res.raw_transcript || "");
      playChime("reply");
      setOrbState("IDLE");
      onScanStateChange?.(false, Math.min(1, (res.bn_unicode_pct || 85) / 100));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Voice transcription failed.");
      setOrbState("ERROR");
      onScanStateChange?.(false, null);
    } finally {
      setTranscribing(false);
    }
  };

  const startMicCapture = async () => {
    stopPlayback();
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        locale === "bn"
          ? "ব্রাউজার মাইক্রোফোন সাপোর্ট করে না — অনুগ্রহ করে অডিও ফাইল আপলোড বা নিচে লিখে জিজ্ঞাসা করুন।"
          : "Browser microphone API unavailable here — upload an audio file or ask a question below."
      );
      setOrbState("ERROR");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyserRef.current = analyser;

      const proc = ctx.createScriptProcessor(4096, 1, 1);
      pcmChunksRef.current = [];
      proc.onaudioprocess = (ev) => {
        const ch = ev.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(ch));
      };
      src.connect(proc);
      proc.connect(ctx.destination);
      procRef.current = proc;

      setRecordSeconds(0);
      setRecording(true);
      setOrbState("LISTENING");
      onScanStateChange?.(true, null);
      playChime("activate");
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Microphone permission denied.");
      setOrbState("ERROR");
    }
  };

  const stopMicAndTranscribe = () => {
    const rate = audioCtxRef.current?.sampleRate || 44100;
    const chunks = pcmChunksRef.current;
    stopMicStream();
    setRecording(false);
    playChime("stop");

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLen < 800) {
      setErrorMsg(locale === "bn" ? "রেকর্ডিং খুব ছোট ছিল; অন্তত ১-২ সেকেন্ড কথা বলুন।" : "Recording too short; please speak for at least 1-2 seconds.");
      setOrbState("IDLE");
      onScanStateChange?.(false, null);
      return;
    }
    const merged = new Float32Array(totalLen);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.length;
    }
    const wavBlob = encodePcmWav(merged, rate, 16000);
    void runTranscribeBlob(wavBlob, "voice_mic_16k.wav");
  };

  const handleConfirmAndAsk = async (queryOverride?: string, langOverride?: "auto" | "bn" | "en") => {
    const queryToSend = (queryOverride ?? (asrResult ? editableText : manualQuery)).trim();
    if (!queryToSend) return;

    stopPlayback();
    setAskingAi(true);
    setOrbState("PROCESSING");
    onScanStateChange?.(true, null);
    setErrorMsg(null);

    try {
      let confirmedJobId: string | undefined;
      if (asrResult && !queryOverride) {
        const conf = await apiPost<{ asr_job_id: string; confirmed_transcript: string }>(
          `/v1/ai/voice/jobs/${encodeURIComponent(asrResult.asr_job_id)}/confirm`,
          { confirmed_transcript: queryToSend }
        );
        confirmedJobId = conf.asr_job_id;
      }

      const res = await apiPost<ChatResponse>("/v1/ai/chat", {
        query: queryToSend,
        language_mode: langOverride ?? languageMode,
        input_modality: confirmedJobId ? "VOICE" : "TEXT",
        asr_job_id: confirmedJobId,
      });
      setChatReply(res);
      playChime("reply");
      setOrbState("IDLE");
      onScanStateChange?.(false, 0.92);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Voice medical RAG query failed.");
      setOrbState("ERROR");
      onScanStateChange?.(false, null);
    } finally {
      setAskingAi(false);
    }
  };

  const handleSpeakReply = async (textToSpeak: string, lang: "auto" | "bn" | "en") => {
    if (!textToSpeak.trim()) return;
    stopPlayback();
    setSpeaking(true);
    setOrbState("SPEAKING");
    onScanStateChange?.(true, 0.95);

    try {
      const resp = await fetch("/v1/ai/voice/speak", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak.slice(0, 1400), language: lang }),
      });

      const ct = resp.headers.get("content-type") || "";
      if (resp.ok && ct.includes("audio")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        playbackUrlRef.current = url;
        const audio = new Audio(url);
        playbackAudioRef.current = audio;
        audio.onended = () => {
          stopPlayback();
        };
        audio.onerror = () => {
          stopPlayback();
        };
        await audio.play();
        return;
      }
    } catch {
      // Fallback cleanly to browser SpeechSynthesis below
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.lang = lang === "en" ? "en-US" : "bn-BD";
      utter.onend = () => stopPlayback();
      utter.onerror = () => stopPlayback();
      window.speechSynthesis.speak(utter);
    } else {
      stopPlayback();
    }
  };

  return (
    <div className="space-y-5 text-white" data-testid="bangla-voice-live-workbench">
      {/* Top HUD Telemetry Bar */}
      <div className="rounded-2xl bg-[#040b1b]/90 border border-purple-400/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-300">
            <span className={`w-2.5 h-2.5 rounded-full ${recording ? "bg-rose-400 animate-ping" : "bg-cyan-400"}`} />
            M05 LIVE VOICE ENGINE • WHISPER-SMALL-BN + QWEN2.5 RAG + MMS-TTS
          </span>
          <TrustBadge kind="RESEARCH_ONLY" />
        </div>

        {/* Language Mode Pills */}
        <div className="inline-flex rounded-full border border-white/15 bg-black/50 p-1 font-mono text-[11px]">
          {(
            [
              ["auto", "Auto (BN/EN)"],
              ["bn", "বাংলা"],
              ["en", "English"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLanguageMode(code)}
              className={`min-h-8 px-3 rounded-full cursor-pointer transition font-bold ${
                languageMode === code ? "bg-gradient-to-r from-[#22d3ee] to-[#c084fc] text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Land-Guard 3D Particle Voice Orb + 32-Band Equalizer + Live Mic Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col gap-3">
          <LandGuardVoiceOrb3D
            state={orbState}
            audioLevelRef={audioLevelRef}
            onClick={() => {
              if (recording) stopMicAndTranscribe();
              else void startMicCapture();
            }}
            label={
              recording
                ? `RECORDING MIC (${recordSeconds}s) — CLICK TO STOP & TRANSCRIBE`
                : transcribing
                  ? "WHISPER-BN TRANSCRIBING..."
                  : askingAi
                    ? "QUERYING GROUNDED MEDICAL RAG..."
                    : speaking
                      ? "SPEAKING NEURAL VOICE REPLY..."
                      : "CLICK 3D ORB TO SPEAK (BN / EN)"
            }
          />

          {/* Land-Guard 32-Band Neural Frequency Spectrum Equalizer */}
          <div className="rounded-2xl bg-[#040b1b]/90 border border-cyan-400/25 p-3 space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-cyan-300 font-bold">
                <Sparkles className="w-3 h-3" /> NEURAL SPECTRUM (32-BAND)
              </span>
              <span ref={energyLabelRef} className="text-cyan-300 font-bold">
                18% LEVEL
              </span>
            </div>
            <div className="h-9 flex items-end justify-between gap-[3px] px-1.5 py-1 rounded-xl bg-[#020612] border border-white/10 overflow-hidden">
              {Array.from({ length: EQ_BAND_COUNT }, (_, idx) => (
                <div
                  key={idx}
                  ref={(el) => {
                    eqBarRefs.current[idx] = el;
                  }}
                  className="flex-1 rounded-t-sm transition-[height] duration-75"
                  style={{
                    height: "18%",
                    background: "linear-gradient(180deg, #f472b6 0%, #818cf8 50%, #22d3ee 100%)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Controls: Mic + Audio Upload + Editable Whisper Confirmation + Text/Sample Q&A */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4 rounded-3xl border border-white/15 bg-[#040a18]/85 p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-bold text-white">
                {locale === "bn"
                  ? "সরাসরি বাংলা বা ইংরেজিতে বলুন, অডিও দিন অথবা লিখে পরীক্ষা করুন"
                  : "Speak in Bangla/English, Upload Audio Clip, or Test Sample Prompts"}
              </h4>
              <span className="font-mono text-[10px] text-purple-300 bg-purple-500/15 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                39.09% FLEURS WER Audited
              </span>
            </div>

            {/* Mic + Upload Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!recording ? (
                <button
                  type="button"
                  disabled={transcribing || askingAi}
                  onClick={() => void startMicCapture()}
                  data-testid="live-voice-record-btn"
                  className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#22d3ee] via-[#818cf8] to-[#c084fc] text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  {locale === "bn" ? "মাইক্রোফোন শুরু করুন" : "Start Live Microphone"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopMicAndTranscribe}
                  data-testid="live-voice-stop-btn"
                  className="min-h-11 px-5 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer animate-pulse shadow-lg"
                >
                  <Square className="w-3.5 h-3.5" /> Stop &amp; Transcribe ({recordSeconds}s)
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3,.ogg,.webm,.m4a,.flac,audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void runTranscribeBlob(f, f.name);
                }}
              />
              <button
                type="button"
                disabled={recording || transcribing || askingAi}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-11 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-[#2dd4bf]" />
                {locale === "bn" ? "অডিও ফাইল আপলোড (.wav/.mp3)" : "Upload Audio Clip"}
              </button>

              {speaking && (
                <button
                  type="button"
                  onClick={stopPlayback}
                  className="min-h-11 px-4 rounded-full bg-rose-500/20 border border-rose-400/45 text-rose-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <VolumeX className="w-4 h-4" /> Stop Audio
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Editable Whisper Transcript Confirmation Gate */}
            {asrResult && (
              <div className="rounded-2xl bg-[#07142e] border border-cyan-400/45 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                  <span className="text-cyan-300 font-bold">
                    TRANSCRIBED ({asrResult.model_id} • {asrResult.device.toUpperCase()} • {asrResult.latency_ms}ms)
                  </span>
                  <span className="text-teal-300">
                    {asrResult.detected_language.toUpperCase()} • {asrResult.bn_unicode_pct}% BN Unicode
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="w-full rounded-xl bg-[#020713] border border-white/20 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-200">
                    Review or edit transcript before submitting to AI assistant.
                  </span>
                  <button
                    type="button"
                    disabled={askingAi || !editableText.trim()}
                    onClick={() => void handleConfirmAndAsk()}
                    className="min-h-10 px-4 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {askingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Confirm &amp; Ask AI
                  </button>
                </div>
              </div>
            )}

            {/* Direct Text Query Bar + Instant Sample Questions */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleConfirmAndAsk(manualQuery);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={
                  locale === "bn"
                    ? "বাংলা বা ইংরেজিতে স্বাস্থ্য-প্রশ্ন লিখুন বা উপরে মাইকে বলুন..."
                    : "Type any Bangla/English clinical info question or speak above..."
                }
                className="flex-1 min-h-11 rounded-2xl bg-[#020713] border border-white/15 px-4 text-xs text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={askingAi || !manualQuery.trim()}
                className="min-h-11 px-5 rounded-2xl bg-[#38bdf8] hover:bg-sky-300 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {askingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Ask Grounded AI
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_MEDICAL_PROMPTS.map((sp) => (
                <button
                  key={sp.label}
                  type="button"
                  onClick={() => {
                    setManualQuery(sp.text);
                    void handleConfirmAndAsk(sp.text, sp.lang);
                  }}
                  className="min-h-8 px-3 rounded-lg bg-white/5 hover:bg-cyan-500/15 border border-white/15 hover:border-cyan-400/50 text-[11px] text-sky-200 cursor-pointer transition text-left"
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grounded AI Answer + Live Spoken TTS Buttons */}
          {chatReply ? (
            <div className="rounded-2xl bg-[#071530] border border-teal-400/35 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-[10px] font-bold text-teal-300">
                  {chatReply.grounded_status} • {chatReply.model_id} • {chatReply.latency_ms}ms
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleSpeakReply(chatReply.answer_text, "bn")}
                    className="min-h-8 px-3 rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> বাংলা শুনুন (TTS)
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSpeakReply(chatReply.answer_text, "en")}
                    className="min-h-8 px-3 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Listen EN
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
                {chatReply.answer_text}
              </p>

              {chatReply.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                  {chatReply.citations.map((c) => (
                    <span
                      key={`${c.citation_num}-${c.source_title}`}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-sky-200"
                    >
                      [{c.citation_num}] {c.source_title} ({c.publisher})
                    </span>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-amber-200/90 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                <span>Informational grounded summary only — never replaces qualified clinician examination.</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#020713]/80 border border-white/10 p-3.5 text-xs text-slate-400">
              Ready for real Bangla (`Whisper-Small-BN`) or English (`Whisper-Small`) speech capture, transcription confirmation, grounded medical Q&amp;A, and spoken TTS playback.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
