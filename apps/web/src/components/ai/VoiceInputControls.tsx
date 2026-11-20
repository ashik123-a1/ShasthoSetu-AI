import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mic,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Send,
  Square,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { apiPost, apiPostForm } from "../../lib/apiClient";

// Narrow local interface for Web Speech API without mutating tsconfig globals
interface BrowserSpeechAlternative {
  transcript: string;
}
interface BrowserSpeechResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechAlternative;
}
interface BrowserSpeechResultList {
  length: number;
  [index: number]: BrowserSpeechResult;
}
interface BrowserSpeechEvent {
  resultIndex: number;
  results: BrowserSpeechResultList;
}
interface BrowserSpeechErrorEvent {
  error: string;
}
interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: BrowserSpeechEvent) => void) | null;
  onerror: ((ev: BrowserSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function encodePcmWav(samples: Float32Array, sourceRate: number, targetRate = 16000): Blob {
  let mono = samples;
  if (sourceRate !== targetRate && samples.length > 0) {
    const ratio = sourceRate / targetRate;
    const newLen = Math.max(1, Math.round(samples.length / ratio));
    const resampled = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
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
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
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
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

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
  status?: string;
  limitation_note: string;
  requires_confirmation: boolean;
}

export interface TtsCapabilities {
  english: { available: boolean; engine: string };
  bengali: { available: boolean; engine: string; unavailable_message?: string | null };
}

export function detectReplyVoiceLanguage(text: string): "bn" | "en" {
  const bnCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const enCount = (text.match(/[A-Za-z]/g) || []).length;
  return bnCount >= enCount && bnCount > 0 ? "bn" : "en";
}

function cleanSpeechText(raw: string): string {
  return (raw || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/[#*`_>|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1100);
}

// Shared playback controller for auto-speak direct voice mode
let activeGlobalAudio: HTMLAudioElement | null = null;
let activeGlobalUrl: string | null = null;

export function stopGlobalVoiceReply() {
  if (activeGlobalAudio) {
    activeGlobalAudio.pause();
    activeGlobalAudio.currentTime = 0;
    activeGlobalAudio = null;
  }
  if (activeGlobalUrl) {
    URL.revokeObjectURL(activeGlobalUrl);
    activeGlobalUrl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export async function speakVoiceReply(
  text: string,
  language: "bn" | "en",
  ttsCapabilities: TtsCapabilities | null,
  onDone?: () => void
): Promise<void> {
  stopGlobalVoiceReply();
  const clean = cleanSpeechText(text);
  if (!clean) {
    onDone?.();
    return;
  }

  const serverSupported =
    language === "bn" ? Boolean(ttsCapabilities?.bengali.available) : Boolean(ttsCapabilities?.english.available);

  if (serverSupported) {
    try {
      const resp = await fetch("/v1/ai/voice/speak", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, language }),
      });
      const ct = resp.headers.get("content-type") || "";
      if (resp.ok && ct.includes("audio")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        activeGlobalUrl = url;
        const audio = new Audio(url);
        activeGlobalAudio = audio;
        audio.onended = () => onDone?.();
        audio.onerror = () => onDone?.();
        await audio.play();
        return;
      }
    } catch {
      // Fall through cleanly to browser SpeechSynthesis
    }
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(language));
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = language === "bn" ? "bn-BD" : "en-US";
    if (match) utt.voice = match;
    utt.onend = () => onDone?.();
    utt.onerror = () => onDone?.();
    window.speechSynthesis.speak(utt);
    return;
  }

  onDone?.();
}

export function VoiceInputControls({
  locale,
  languageMode,
  onChangeLanguageMode,
  onSubmitConfirmed,
  onSubmitDirect,
  autoSpeak = true,
  onToggleAutoSpeak,
  disabled = false,
}: {
  locale: "bn" | "en";
  languageMode: "auto" | "bn" | "en";
  onChangeLanguageMode: (lang: "auto" | "bn" | "en") => void;
  onSubmitConfirmed: (confirmedText: string, asrJobId?: string) => void;
  onSubmitDirect?: (transcript: string, asrJobId?: string) => void;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  disabled?: boolean;
}) {
  const [voiceMode, setVoiceMode] = useState<"direct" | "normal">("direct");

  // Shared AudioCapture state
  const [recording, setRecording] = useState(false);
  const [directListening, setDirectListening] = useState(false);
  const [directPhase, setDirectPhase] = useState<string>("");
  const [interimText, setInterimText] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFilename, setAudioFilename] = useState("mic_capture.wav");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [asrResult, setAsrResult] = useState<TranscribeResult | null>(null);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const directModeActiveRef = useRef(false);
  const vadSpeechSeenRef = useRef(false);
  const vadSilenceStartRef = useRef<number>(0);

  const cleanupAudioUrl = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  const stopTracks = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    procRef.current?.disconnect();
    procRef.current = null;
    gainRef.current?.disconnect();
    gainRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      directModeActiveRef.current = false;
      speechRecRef.current?.abort();
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
    };
  }, []);

  const submitFinalDirect = (finalText: string, asrJobId?: string) => {
    const clean = finalText.trim();
    if (!clean) return;
    if (onSubmitDirect) {
      onSubmitDirect(clean, asrJobId);
    } else if (asrJobId) {
      onSubmitConfirmed(clean, asrJobId);
    } else {
      onSubmitConfirmed(clean);
    }
  };

  // Start PCM capture with silent gain sink (zero speaker echo, fixed for both BN & EN)
  const startPcmMic = async (isDirectVad: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(
        locale === "bn"
          ? "ব্রাউজার মাইক্রোফোন সমর্থন করে না; অডিও ফাইল আপলোড করুন।"
          : "Browser microphone API unavailable; please upload an audio file."
      );
      return false;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    streamRef.current = stream;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    audioCtxRef.current = ctx;

    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    pcmChunksRef.current = [];
    vadSpeechSeenRef.current = false;
    vadSilenceStartRef.current = 0;

    proc.onaudioprocess = (ev) => {
      const ch = ev.inputBuffer.getChannelData(0);
      pcmChunksRef.current.push(new Float32Array(ch));

      if (isDirectVad && directModeActiveRef.current) {
        let rms = 0;
        for (let i = 0; i < ch.length; i += 8) rms += ch[i] * ch[i];
        rms = Math.sqrt(rms / Math.max(1, ch.length / 8));
        const now = Date.now();
        if (rms > 0.015) {
          vadSpeechSeenRef.current = true;
          vadSilenceStartRef.current = 0;
        } else if (vadSpeechSeenRef.current) {
          if (vadSilenceStartRef.current === 0) {
            vadSilenceStartRef.current = now;
          } else if (now - vadSilenceStartRef.current > 1800) {
            directModeActiveRef.current = false;
            window.setTimeout(() => void stopDirectVoiceAndSubmitPcm(), 10);
          }
        }
      }
    };

    src.connect(proc);
    proc.connect(silentGain);
    silentGain.connect(ctx.destination);
    procRef.current = proc;
    gainRef.current = silentGain;
    return true;
  };

  // ==================== DIRECT REAL-TIME VOICE ====================
  const stopDirectVoiceAndSubmitPcm = async () => {
    const rate = audioCtxRef.current?.sampleRate || 44100;
    const chunks = pcmChunksRef.current;
    stopTracks();
    setDirectListening(false);
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;

    const totalLen = chunks.reduce((acc, a) => acc + a.length, 0);
    if (totalLen < 1600) {
      setDirectPhase("");
      setErrorMsg(
        locale === "bn"
          ? "কোনো কথা শোনা যায়নি — অনুগ্রহ করে ১–২ সেকেন্ড কথা বলুন।"
          : "No speech detected — please speak clearly for 1–2 seconds."
      );
      return;
    }

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    const wav = encodePcmWav(merged, rate, 16000);
    setTranscribing(true);
    setDirectPhase(locale === "bn" ? "Whisper AI ভয়েস প্রসেস করছে..." : "Processing speech with Whisper AI...");
    try {
      const fd = new FormData();
      fd.append("file", wav, "direct_voice_16k.wav");
      fd.append("language_mode", languageMode);
      const res = await apiPostForm<TranscribeResult>("/v1/ai/voice/transcribe", fd);
      const txt = (res.raw_transcript || "").trim();
      if (!txt) {
        setErrorMsg(locale === "bn" ? "কোনো শব্দ বোঝা যায়নি।" : "Could not recognize speech; try speaking again.");
        setDirectPhase("");
        return;
      }
      await apiPost(`/v1/ai/voice/jobs/${encodeURIComponent(res.asr_job_id)}/confirm`, {
        confirmed_transcript: txt,
      });
      setDirectPhase(locale === "bn" ? "উত্তর তৈরি হচ্ছে..." : "Sending directly to AI...");
      submitFinalDirect(txt, res.asr_job_id);
      setDirectPhase("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Direct voice transcription failed.");
      setDirectPhase("");
    } finally {
      setTranscribing(false);
    }
  };

  const startDirectWhisperFallback = async () => {
    directModeActiveRef.current = true;
    setDirectListening(true);
    setRecordSeconds(0);
    setDirectPhase(
      locale === "bn"
        ? "শুনছি... কথা শেষ করলে নিজে থেকেই উত্তর দেবে (অথবা Stop চাপুন)"
        : "Listening via mic... will auto-send after pause (or click Send Now)"
    );
    try {
      const ok = await startPcmMic(true);
      if (!ok) {
        setDirectListening(false);
        directModeActiveRef.current = false;
        return;
      }
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setDirectListening(false);
      directModeActiveRef.current = false;
      setErrorMsg(err instanceof Error ? err.message : "Microphone permission denied.");
    }
  };

  const startDirectVoice = () => {
    setErrorMsg(null);
    setInterimText("");
    const SpeechRec = getSpeechRecognitionCtor();
    const useEnSpeech = languageMode === "en" || (languageMode === "auto" && locale === "en");

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = useEnSpeech ? "en-US" : "bn-BD";
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        speechRecRef.current = rec;

        let capturedFinal = "";
        let fellBack = false;
        setDirectListening(true);
        setDirectPhase(
          useEnSpeech
            ? "Live Direct Mic Active (English) — Speak now..."
            : "সরাসরি লাইভ মাইক চালু (বাংলা/EN) — এখন বলুন..."
        );

        rec.onresult = (ev) => {
          let interim = "";
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const chunk = ev.results[i]?.[0]?.transcript || "";
            if (ev.results[i]?.isFinal) {
              capturedFinal += (capturedFinal ? " " : "") + chunk;
            } else {
              interim += chunk;
            }
          }
          setInterimText((capturedFinal + " " + interim).trim());
        };

        rec.onerror = (ev) => {
          if (ev.error === "aborted") return;
          if (!fellBack && (ev.error === "network" || ev.error === "service-not-allowed" || ev.error === "not-allowed" || ev.error === "audio-capture" || ev.error === "no-speech")) {
            fellBack = true;
            try {
              rec.abort();
            } catch {
              // ignore
            }
            void startDirectWhisperFallback();
          }
        };

        rec.onend = () => {
          if (fellBack) return;
          setDirectListening(false);
          setDirectPhase("");
          const out = capturedFinal.trim();
          if (out) {
            setInterimText("");
            submitFinalDirect(out);
          }
        };

        rec.start();
        return;
      } catch {
        // Fallback below
      }
    }

    void startDirectWhisperFallback();
  };

  const stopDirectVoiceNow = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
      return;
    }
    if (directModeActiveRef.current) {
      directModeActiveRef.current = false;
      void stopDirectVoiceAndSubmitPcm();
    }
  };

  // ==================== NORMAL RECORD & EDIT FLOW ====================
  const startRecording = async () => {
    setErrorMsg(null);
    setAsrResult(null);
    cleanupAudioUrl(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    try {
      const ok = await startPcmMic(false);
      if (!ok) return;
      setRecordSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    const rate = audioCtxRef.current?.sampleRate || 44100;
    stopTracks();
    setRecording(false);
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;

    const totalLen = pcmChunksRef.current.reduce((acc, a) => acc + a.length, 0);
    if (totalLen < 800) {
      setErrorMsg(locale === "bn" ? "কোনো অডিও ধারণ করা যায়নি।" : "Recording was empty or too short.");
      return;
    }
    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunksRefOrFallback(pcmChunksRef.current)) {
      merged.set(c, offset);
      offset += c.length;
    }
    const wav = encodePcmWav(merged, rate, 16000);
    setAudioBlob(wav);
    setAudioFilename("mic_recording.wav");
    const nextUrl = URL.createObjectURL(wav);
    cleanupAudioUrl(audioUrl);
    setAudioUrl(nextUrl);
  };

  const cancelRecording = () => {
    stopTracks();
    setRecording(false);
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    pcmChunksRef.current = [];
    cleanupAudioUrl(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setAsrResult(null);
    setEditableTranscript("");
    setErrorMsg(null);
  };

  const handleFilePick = (file?: File | null) => {
    if (!file) return;
    setErrorMsg(null);
    setAsrResult(null);
    setAudioBlob(file);
    setAudioFilename(file.name);
    const nextUrl = URL.createObjectURL(file);
    cleanupAudioUrl(audioUrl);
    setAudioUrl(nextUrl);
  };

  const runTranscribe = async () => {
    if (!audioBlob) return;
    setTranscribing(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", audioBlob, audioFilename);
      fd.append("language_mode", languageMode);
      const res = await apiPostForm<TranscribeResult>("/v1/ai/voice/transcribe", fd);
      setAsrResult(res);
      setEditableTranscript(res.raw_transcript || "");
    } catch (err) {
      const rawErr = err instanceof Error ? err.message : "Speech transcription failed.";
      const cleanErr = rawErr.includes("Whisper model") || rawErr.includes("huggingface.co")
        ? locale === "bn"
          ? "স্থানীয় ভয়েস মডেল (Whisper) বর্তমানে অফলাইনে রয়েছে। নিচে চ্যাট বক্সে লিখে আপনার প্রশ্ন পাঠান।"
          : "Local Whisper voice model is currently offline. Please type your question in the chat box below."
        : rawErr;
      setErrorMsg(cleanErr);
    } finally {
      setTranscribing(false);
    }
  };

  const confirmAndSend = async () => {
    if (!asrResult || !editableTranscript.trim()) return;
    setConfirming(true);
    setErrorMsg(null);
    try {
      const conf = await apiPost<{ asr_job_id: string; confirmed_transcript: string }>(
        `/v1/ai/voice/jobs/${encodeURIComponent(asrResult.asr_job_id)}/confirm`,
        { confirmed_transcript: editableTranscript.trim() }
      );
      onSubmitConfirmed(conf.confirmed_transcript, conf.asr_job_id);
      setAsrResult(null);
      setEditableTranscript("");
      cleanupAudioUrl(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not confirm transcript.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-2xl border border-purple-400/35 bg-[#071028]/90 p-3.5 space-y-3 text-xs" data-testid="voice-input-panel">
      {/* Header Row: 2 Voice Workflow Modes + Language Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-cyan-400/35 bg-black/50 p-0.5 font-mono text-[10.5px]">
          <button
            type="button"
            onClick={() => setVoiceMode("direct")}
            data-testid="voice-mode-direct"
            className={`min-h-8 px-3 rounded-full cursor-pointer transition inline-flex items-center gap-1 ${
              voiceMode === "direct" ? "bg-emerald-400 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            <Radio className="w-3 h-3" />
            {locale === "bn" ? "সরাসরি ভয়েস (Direct)" : "Direct Live Voice"}
          </button>
          <button
            type="button"
            onClick={() => setVoiceMode("normal")}
            data-testid="voice-mode-normal"
            className={`min-h-8 px-3 rounded-full cursor-pointer transition inline-flex items-center gap-1 ${
              voiceMode === "normal" ? "bg-purple-400 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
            }`}
          >
            <Mic className="w-3 h-3" />
            {locale === "bn" ? "নরমাল রেকর্ড ও যাচাই" : "Normal Record & Edit"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onToggleAutoSpeak && (
            <button
              type="button"
              onClick={onToggleAutoSpeak}
              className={`min-h-8 px-2.5 rounded-full border text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer ${
                autoSpeak
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-bold"
                  : "bg-black/40 border-white/15 text-slate-400"
              }`}
            >
              <Volume2 className="w-3 h-3" />
              {autoSpeak ? "Auto-Speak: ON" : "Auto-Speak: OFF"}
            </button>
          )}

          <div className="inline-flex rounded-full border border-white/15 bg-black/40 p-0.5 font-mono text-[10px]">
            {(["auto", "bn", "en"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeLanguageMode(m)}
                className={`min-h-8 px-2.5 rounded-full cursor-pointer transition ${
                  languageMode === m ? "bg-purple-400 text-slate-950 font-bold" : "text-slate-300 hover:text-white"
                }`}
              >
                {m === "auto" ? "Auto" : m === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MODE A: DIRECT REAL-TIME VOICE */}
      {voiceMode === "direct" && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {!directListening ? (
              <button
                type="button"
                disabled={disabled || transcribing}
                onClick={startDirectVoice}
                data-testid="voice-direct-btn"
                className="min-h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                {transcribing
                  ? locale === "bn"
                    ? "প্রসেস হচ্ছে..."
                    : "Processing Voice..."
                  : locale === "bn"
                    ? "সরাসরি কথা বলুন (তাৎক্ষণিক উত্তর)"
                    : "Start Direct Talk (Instant Reply)"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopDirectVoiceNow}
                className="min-h-11 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold inline-flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <Square className="w-3.5 h-3.5" />
                {locale === "bn" ? `থামান ও পাঠান (${recordSeconds}s)` : `Finish & Send (${recordSeconds}s)`}
              </button>
            )}

            <span className="text-[11px] text-slate-300">
              {directPhase ||
                (locale === "bn"
                  ? "মাইকে সরাসরি বাংলা বা ইংরেজিতে বলুন — সঙ্গে সঙ্গে চ্যাটে যাবে এবং AI উত্তর পড়ে শোনাবে।"
                  : "Speak Bangla or English naturally — sends automatically and speaks answer aloud.")}
            </span>
          </div>

          {interimText && (
            <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-400/40 text-emerald-100 font-mono text-xs">
              Live Transcript: &ldquo;{interimText}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* MODE B: NORMAL RECORD, TRANSCRIBE, EDIT & UPLOAD */}
      {voiceMode === "normal" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <button
                type="button"
                disabled={disabled || transcribing}
                onClick={() => void startRecording()}
                data-testid="voice-record-btn"
                className="min-h-11 px-3.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/50 text-purple-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Mic className="w-4 h-4" /> {locale === "bn" ? "রেকর্ড শুরু" : "Record Mic"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={stopRecording}
                  data-testid="voice-stop-btn"
                  className="min-h-11 px-3.5 rounded-xl bg-rose-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Square className="w-3.5 h-3.5" /> {locale === "bn" ? `থামান (${recordSeconds}s)` : `Stop (${recordSeconds}s)`}
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="min-h-11 px-3 rounded-xl border border-white/20 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.webm,.ogg,.m4a,.flac,audio/*"
              className="hidden"
              data-testid="voice-file-input"
              onChange={(e) => handleFilePick(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={recording || transcribing || disabled}
              onClick={() => fileInputRef.current?.click()}
              data-testid="voice-upload-btn"
              className="min-h-11 px-3.5 rounded-xl border border-sky-400/35 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" /> {locale === "bn" ? "অডিও আপলোড" : "Upload Audio"}
            </button>

            {audioBlob && !recording && (
              <>
                <button
                  type="button"
                  disabled={transcribing}
                  onClick={() => void runTranscribe()}
                  data-testid="voice-transcribe-btn"
                  className="min-h-11 px-4 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {transcribing ? (locale === "bn" ? "ট্রান্সক্রাইব হচ্ছে..." : "Transcribing...") : locale === "bn" ? "ট্রান্সক্রাইব করুন" : "Transcribe"}
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="min-h-11 px-3 rounded-xl border border-white/15 text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              </>
            )}
          </div>

          {audioUrl && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">{audioFilename}</span>
              <audio controls src={audioUrl} className="h-9 max-w-full" />
            </div>
          )}

          {asrResult && (
            <div className="rounded-xl border border-amber-400/45 bg-amber-500/10 p-3 space-y-2.5" data-testid="voice-transcript-confirm-box">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-amber-300 font-bold">
                  NEEDS HUMAN CONFIRMATION • {asrResult.model_id} ({asrResult.detected_language.toUpperCase()} • {asrResult.latency_ms} ms)
                </span>
                <span className="text-slate-300">BN Unicode: {asrResult.bn_unicode_pct}%</span>
              </div>
              <p className="text-[11px] text-amber-200/90">{asrResult.limitation_note}</p>
              <textarea
                rows={2}
                value={editableTranscript}
                onChange={(e) => setEditableTranscript(e.target.value)}
                placeholder={
                  locale === "bn"
                    ? "এখানে আপনার ট্রান্সক্রিপ্ট বা প্রশ্ন লিখুন বা সম্পাদনা করুন..."
                    : "Type or edit your voice transcript here..."
                }
                data-testid="voice-editable-transcript"
                aria-label="Editable voice transcript"
                className="w-full rounded-xl border border-white/20 bg-black/50 p-2.5 text-sm text-white"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  {locale === "bn" ? "ভুল থাকলে সম্পাদনা করে তারপর পাঠান — সরাসরি প্রেরণ বন্ধ রাখা হয়েছে।" : "Edit any ASR errors above before confirming."}
                </span>
                <button
                  type="button"
                  disabled={confirming || !editableTranscript.trim()}
                  onClick={() => void confirmAndSend()}
                  data-testid="voice-confirm-send-btn"
                  className="min-h-10 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {locale === "bn" ? "নিশ্চিত করে চ্যাটে পাঠান" : "Confirm & Send to Chat"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {errorMsg && (
        <div role="alert" className="rounded-xl border border-rose-400/45 bg-rose-950/60 p-2.5 text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

function chunksRefOrFallback(chunks: Float32Array[]): Float32Array[] {
  return chunks;
}

export function TtsSpeakControl({
  text,
  language,
  ttsCapabilities,
}: {
  text: string;
  language: "bn" | "en";
  ttsCapabilities: TtsCapabilities | null;
}) {
  const [state, setState] = useState<"IDLE" | "LOADING" | "PLAYING" | "PAUSED">("IDLE");
  const [unavailableNote, setUnavailableNote] = useState<string | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const sync = () => setBrowserVoices(window.speechSynthesis.getVoices());
    sync();
    window.speechSynthesis.addEventListener?.("voiceschanged", sync);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", sync);
  }, []);

  const hasBrowserBn = browserVoices.some((v) => v.lang.toLowerCase().startsWith("bn"));
  const hasBrowserEn = browserVoices.some((v) => v.lang.toLowerCase().startsWith("en"));
  // Optimistic EN & server capability support (since SpeechSynthesis en-US voices may populate asynchronously)
  const serverSupported = language === "bn" ? Boolean(ttsCapabilities?.bengali.available) : Boolean(ttsCapabilities?.english.available ?? true);
  const browserSupported = language === "bn" ? hasBrowserBn : hasBrowserEn || (typeof window !== "undefined" && "speechSynthesis" in window);
  const anySupported = serverSupported || browserSupported;

  const stopPlayback = () => {
    stopGlobalVoiceReply();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState("IDLE");
  };

  const startPlayback = async () => {
    stopPlayback();
    setUnavailableNote(null);
    const cleanedText = cleanSpeechText(text);
    if (!cleanedText) {
      setUnavailableNote("No readable text");
      return;
    }
    if (!anySupported) {
      setUnavailableNote(language === "bn" ? "Bengali voice unavailable" : "English voice unavailable");
      return;
    }

    setState("LOADING");
    try {
      const resp = await fetch("/v1/ai/voice/speak", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText, language }),
      });
      const ct = resp.headers.get("content-type") || "";
      if (resp.ok && ct.includes("audio")) {
        const blob = await resp.blob();
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audio.onended = () => setState("IDLE");
        audio.onerror = () => setState("IDLE");
        audioElRef.current = audio;
        await audio.play();
        setState("PLAYING");
        return;
      }
    } catch {
      // Fallback below
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const freshVoices = window.speechSynthesis.getVoices();
      const utt = new SpeechSynthesisUtterance(cleanedText);
      utt.lang = language === "bn" ? "bn-BD" : "en-US";
      const match = freshVoices.find((v) => v.lang.toLowerCase().startsWith(language));
      if (match) utt.voice = match;
      utt.onend = () => setState("IDLE");
      utt.onerror = () => setState("IDLE");
      window.speechSynthesis.speak(utt);
      setState("PLAYING");
      return;
    }

    setState("IDLE");
    setUnavailableNote(language === "bn" ? "Bengali voice unavailable" : "English voice unavailable");
  };

  const pausePlayback = () => {
    if (audioElRef.current && !audioElRef.current.paused) {
      audioElRef.current.pause();
      setState("PAUSED");
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setState("PAUSED");
    }
  };

  const resumePlayback = () => {
    if (audioElRef.current && audioElRef.current.paused) {
      void audioElRef.current.play();
      setState("PLAYING");
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setState("PLAYING");
    }
  };

  if (!anySupported && unavailableNote === null) {
    return (
      <span
        data-testid={`tts-unavailable-${language}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[11px] font-mono text-slate-400"
      >
        <VolumeX className="w-3.5 h-3.5" />
        {language === "bn" ? "Bengali voice unavailable" : "English voice unavailable"}
      </span>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {state === "IDLE" || state === "LOADING" ? (
        <button
          type="button"
          onClick={() => void startPlayback()}
          data-testid={`tts-play-${language}`}
          className="min-h-9 px-2.5 rounded-lg border border-sky-400/35 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer"
        >
          {state === "LOADING" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
          {language === "bn" ? "শুনুন (BN)" : "Listen (EN)"}
        </button>
      ) : (
        <>
          {state === "PLAYING" ? (
            <button
              type="button"
              onClick={pausePlayback}
              className="min-h-9 px-2.5 rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-200 text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={resumePlayback}
              className="min-h-9 px-2.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}
          <button
            type="button"
            onClick={stopPlayback}
            className="min-h-9 px-2.5 rounded-lg border border-rose-400/40 bg-rose-500/15 text-rose-200 text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer"
          >
            <Square className="w-3 h-3" /> Stop
          </button>
          <button
            type="button"
            onClick={() => void startPlayback()}
            className="min-h-9 px-2.5 rounded-lg border border-white/15 bg-white/5 text-slate-200 text-[11px] font-mono inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Replay
          </button>
        </>
      )}
      {unavailableNote && <span className="text-[11px] font-mono text-amber-300">{unavailableNote}</span>}
    </div>
  );
}
