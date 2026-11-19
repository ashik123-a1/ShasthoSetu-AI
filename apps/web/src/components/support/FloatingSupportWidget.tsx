import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Headphones,
  MessageCircle,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useI18n } from "../../lib/i18n";
import type { VoiceOrbState } from "../three/LandGuardVoiceOrb3D";

const LazyVoiceOrb3D = lazy(() =>
  import("../three/LandGuardVoiceOrb3D").then((m) => ({ default: m.LandGuardVoiceOrb3D }))
);

interface SupportChatItem {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

const QUICK_TOPICS: Array<{ label: string; answer: string }> = [
  {
    label: "Book a Doctor",
    answer:
      "You can browse 43 verified specialist doctors across 8 departments in Find Care (/find-care), open any doctor profile, inspect consultation hours, and book an open slot or start an Instant Video/Audio preview.",
  },
  {
    label: "Diagnostic Home Collect",
    answer:
      "We offer 12 Bangladesh diagnostic tests (CBC, HbA1c, Thyroid TSH, Lipid Profile, Dengue NS1, etc.) under Health Services (/services#section-other-services) with Home Sample Collection support.",
  },
  {
    label: "Order Medicine",
    answer:
      "Visit Health Services -> ePharma Medicine Store (/services#section-other-services) to filter 24 essential medicines across 8 categories, add items to your cart, and place a simulated demo order.",
  },
  {
    label: "Blood Emergency",
    answer:
      "Open Blood Connect (/blood-connect) to match emergency donors within 5 / 10 / 20 km across 8 divisions. Phone numbers remain consent-locked until dual verification.",
  },
  {
    label: "Zero-PHI Policy",
    answer:
      "ShasthoSetu enforces strict Zero-PHI separation: Support agents can help with bookings, demo payments, and platform help without ever accessing private diagnoses, clinical notes, or prescriptions (HTTP 403 enforced).",
  },
];

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FloatingSupportWidget() {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "chat" | "call">("menu");
  const [input, setInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [messages, setMessages] = useState<SupportChatItem[]>([
    {
      id: "init-1",
      sender: "bot",
      text:
        locale === "bn"
          ? "স্বাস্থ্যসেতু ৩ডি সাপোর্ট ডেস্কে স্বাগতম! অ্যাপয়েন্টমেন্ট, ল্যাব টেস্ট, মেডিসিন অর্ডার বা জরুরি সহায়তার জন্য প্রশ্ন করুন।"
          : "Welcome to ShasthoSetu 3D Support Desk! Ask about doctor booking, diagnostic tests, ePharma orders, or start a live support audio call.",
      time: "Online",
    },
  ]);

  // Audio Support Call state
  const [callActive, setCallActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [hardwareAudio, setHardwareAudio] = useState(false);
  const audioLevelRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopAudioCall = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    audioLevelRef.current = 0;
    setHardwareAudio(false);
    setCallActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAudioCall();
    };
  }, [stopAudioCall]);

  useEffect(() => {
    if (!callActive) return undefined;
    const timer = window.setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callActive]);

  useEffect(() => {
    if (!callActive) return undefined;
    let running = true;
    const freqData = analyserRef.current ? new Uint8Array(analyserRef.current.frequencyBinCount) : null;
    let phase = 0;
    const step = () => {
      if (!running) return;
      phase += 0.12;
      if (micMuted) {
        audioLevelRef.current = 0.02;
      } else if (analyserRef.current && freqData) {
        analyserRef.current.getByteFrequencyData(freqData);
        const avg = freqData.reduce((a, b) => a + b, 0) / Math.max(1, freqData.length);
        audioLevelRef.current = Math.min(1, avg / 140);
      } else {
        audioLevelRef.current = 0.25 + Math.abs(Math.sin(phase)) * 0.45;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      running = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [callActive, micMuted, hardwareAudio]);

  const startAudioCall = async () => {
    stopAudioCall();
    setView("call");
    setCallSeconds(0);
    setMicMuted(false);
    setCallActive(true);

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            src.connect(analyser);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
          }
        } catch {
          // Optional WebAudio meter
        }
        setHardwareAudio(true);
      } catch {
        setHardwareAudio(false);
      }
    }
  };

  const toggleMute = () => {
    const next = !micMuted;
    setMicMuted(next);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((tr) => {
        tr.enabled = !next;
      });
    }
  };

  const sendReply = (promptText: string, presetAnswer?: string) => {
    const clean = promptText.trim();
    if (!clean) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: "user", text: clean, time: nowTime },
    ]);
    if (!presetAnswer) setInput("");
    setChatSending(true);

    window.setTimeout(() => {
      const matched = QUICK_TOPICS.find((t) =>
        clean.toLowerCase().includes(t.label.split(" ")[0].toLowerCase())
      );
      const reply =
        presetAnswer ||
        matched?.answer ||
        "Thanks for contacting ShasthoSetu Support! For detailed ticket tracking or refunds, sign in to your Patient or Support Portal (/support/dashboard). Reminder: Zero-PHI isolation is active.";
      setMessages((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, sender: "bot", text: reply, time: nowTime },
      ]);
      setChatSending(false);
    }, 450);
  };

  const orbState: VoiceOrbState = callActive
    ? micMuted
      ? "IDLE"
      : "SPEAKING"
    : chatSending
      ? "PROCESSING"
      : "LISTENING";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="ShasthoSetu 3D Support Desk"
          className="w-[340px] sm:w-[390px] rounded-3xl border border-cyan-400/40 bg-[#050d1f]/95 backdrop-blur-2xl text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.75)] overflow-hidden"
          style={{ boxShadow: "0 20px 60px rgba(0, 0, 0, 0.78), 0 0 32px rgba(34, 211, 238, 0.22)" }}
        >
          {/* Top Modal Header (DocTime style) */}
          <div className="px-5 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-[#0a1833] via-[#0d2144] to-[#0a1833] flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-300">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                3D Support Desk • Zero-PHI
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                {locale === "bn" ? "আমরা আপনাকে কীভাবে সাহায্য করতে পারি?" : "How can we help you?"}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                stopAudioCall();
                setOpen(false);
              }}
              aria-label="Close support dialog"
              className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 3D Interactive Holographic Orb (Only mounts when open) */}
          <div className="px-4 pt-3">
            <Suspense
              fallback={
                <div className="h-[144px] rounded-2xl border border-cyan-500/30 bg-[#040b1b] flex items-center justify-center text-xs font-mono text-cyan-300">
                  Loading 3D Support Core...
                </div>
              }
            >
              <LazyVoiceOrb3D
                state={orbState}
                audioLevelRef={audioLevelRef}
                className="!h-[144px] !rounded-2xl"
                label={
                  callActive
                    ? `SUPPORT VOICE LIVE • ${formatClock(callSeconds)}`
                    : view === "chat"
                      ? "3D SUPPORT CHAT ACTIVE"
                      : "3D SUPPORT DESK READY"
                }
              />
            </Suspense>
          </div>

          {/* View Switcher Tabs when inside chat or call */}
          <div className="px-4 pt-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setView("menu")}
              className={`px-3 py-1.5 rounded-xl font-semibold border cursor-pointer transition ${
                view === "menu"
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                  : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Options
            </button>
            <button
              type="button"
              onClick={() => setView("chat")}
              className={`px-3 py-1.5 rounded-xl font-semibold border inline-flex items-center gap-1.5 cursor-pointer transition ${
                view === "chat"
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                  : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </button>
            <button
              type="button"
              onClick={() => void startAudioCall()}
              className={`px-3 py-1.5 rounded-xl font-semibold border inline-flex items-center gap-1.5 cursor-pointer transition ${
                view === "call"
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                  : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" /> Talk Now
            </button>
          </div>

          {/* VIEW 1: DocTime Quick Action Cards ("আমাদের সাথে চ্যাট করুন" / "আমাদের সাথে কথা বলুন") */}
          {view === "menu" && (
            <div className="p-4 space-y-2.5">
              <button
                type="button"
                onClick={() => setView("chat")}
                className="w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-cyan-500/30 hover:border-cyan-400 flex items-center justify-between gap-3 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-cyan-300">
                      আমাদের সাথে চ্যাট করুন
                    </div>
                    <div className="text-[11px] text-slate-400">Chat with Us • Instant 3D Support Bot &amp; Ticket Help</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => void startAudioCall()}
                className="w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-500/30 hover:border-emerald-400 flex items-center justify-between gap-3 text-left transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-emerald-300">
                      আমাদের সাথে কথা বলুন
                    </div>
                    <div className="text-[11px] text-slate-400">Talk with Us • Live Support Audio Call (09617-885-599 Demo)</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
              </button>

              <Link
                to="/patient/support"
                onClick={() => setOpen(false)}
                className="block text-center text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 pt-1"
              >
                Open Full Ticket History Portal →
              </Link>
            </div>
          )}

          {/* VIEW 2: Interactive Chat */}
          {view === "chat" && (
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => sendReply(t.label, t.answer)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-200 cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-cyan-500/20 border border-cyan-400/40 ml-6 text-white"
                        : "bg-slate-900/95 border border-slate-800 mr-4 text-slate-200"
                    }`}
                  >
                    <p>{m.text}</p>
                    <span className="block text-[9px] font-mono text-slate-400 mt-1">{m.time}</span>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendReply(input);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={locale === "bn" ? "আপনার প্রশ্ন লিখুন..." : "Type your support question..."}
                  className="flex-1 min-h-10 rounded-xl bg-slate-900 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-10 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* VIEW 3: Live Audio Call */}
          {view === "call" && (
            <div className="p-4 space-y-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/35 space-y-1.5">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-300">
                  {hardwareAudio ? "Live Browser Microphone Active" : "Simulated Support Audio Connected"}
                </div>
                <div className="text-2xl font-black font-mono text-white">{formatClock(callSeconds)}</div>
                <p className="text-[11px] text-slate-400">ShasthoSetu Care Coordinator Desk (Zero-PHI)</p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`min-h-11 px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
                    micMuted
                      ? "bg-amber-500/20 border-amber-400 text-amber-200"
                      : "bg-slate-900 border-slate-700 text-white hover:border-cyan-400"
                  }`}
                >
                  {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {micMuted ? "Muted" : "Mute Mic"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopAudioCall();
                    setView("menu");
                  }}
                  className="min-h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" /> End Audio Call
                </button>
              </div>
            </div>
          )}

          {/* Zero-PHI Footer Notice */}
          <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Zero-PHI Desk: Never reads private clinical records or diagnoses.</span>
          </div>
        </div>
      )}

      {/* Floating Toggle Pill */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open 3D Support Chat and Audio Call"
        className="h-12 px-4 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 text-slate-950 font-extrabold text-xs shadow-[0_10px_30px_rgba(34,211,238,0.45)] hover:scale-105 transition inline-flex items-center gap-2 cursor-pointer border border-white/30"
      >
        <Headphones className="w-4 h-4" />
        <span>{locale === "bn" ? "সাহায্য ও সাপোর্ট" : "Support 3D"}</span>
      </button>
    </div>
  );
}
