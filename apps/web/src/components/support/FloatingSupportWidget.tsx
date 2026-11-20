import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Github,
  MessageCircle,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { TEAM_INFO } from "../../data/teamData";
import { useI18n } from "../../lib/i18n";
import { MedicalAiChatbotOrb } from "./MedicalAiChatbotOrb";
import { ShasthoSetuRadialMenu } from "./ShasthoSetuRadialMenu";
import { TeamRosterModal } from "../team/TeamRosterModal";

interface SupportChatItem {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

const QUICK_TOPICS: Array<{ label: string; answer: string; answerBn: string }> = [
  {
    label: "Book a Doctor",
    answer:
      "You can browse 43 verified specialist doctors across 8 departments in Find Care (/find-care), open any doctor profile, inspect consultation hours, and book an open slot or start an Instant Video/Audio preview.",
    answerBn:
      "আপনি 'Find Care' (/find-care) পেজে ৮টি বিভাগের ৪৩ জন যাচাইকৃত বিশেষজ্ঞ ডাক্তারদের তালিকা দেখতে পারেন এবং সরাসরি ভিডিও বা অডিও অ্যাপয়েন্টমেন্ট বুক করতে পারেন।",
  },
  {
    label: "Diagnostic Home Collect",
    answer:
      "We offer 12 Bangladesh diagnostic tests (CBC, HbA1c, Thyroid TSH, Lipid Profile, Dengue NS1, etc.) under Health Services (/services#section-other-services) with Home Sample Collection support.",
    answerBn:
      "স্বাস্থ্যসেতু ১২টি প্রয়োজনীয় ডায়াগনস্টিক ল্যাব টেস্ট (CBC, HbA1c, TSH, Lipid, Dengue NS1 ইত্যাদি) অফার করে যেখানে হোম স্যাম্পল কালেকশন সুবিধা রয়েছে।",
  },
  {
    label: "Order Medicine",
    answer:
      "Visit Health Services -> ePharma Medicine Store (/services#section-other-services) to filter 24 essential medicines across 8 categories, add items to your cart, and place a simulated demo order.",
    answerBn:
      "ই-ফার্মাসি স্টোর থেকে ২৪টি প্রয়োজনীয় ওষুধ ৮টি ক্যাটাগরিতে ফিল্টার করে কার্টে যোগ করে সিমুলেটেড ডেমো অর্ডার করতে পারবেন।",
  },
  {
    label: "Blood Emergency",
    answer:
      "Open Blood Connect (/blood-connect) to match emergency donors within 5 / 10 / 20 km across 8 divisions. Phone numbers remain consent-locked until dual verification.",
    answerBn:
      "জরুরি রক্তের প্রয়োজনে ব্লাড কানেক্ট (/blood-connect) পেজে ৫/১০/২০ কিলোমিটার দূরত্বের ডোনারদের সাথে যোগাযোগ করতে পারেন।",
  },
  {
    label: "Zero-PHI Policy",
    answer:
      "ShasthoSetu enforces strict Zero-PHI separation: Support agents can help with bookings, demo payments, and platform help without ever accessing private diagnoses, clinical notes, or prescriptions (HTTP 403 enforced).",
    answerBn:
      "স্বাস্থ্যসেতু জিরো-পিএইচআই নীতি প্রয়োগ করে: সাপোর্ট এজেন্টরা প্রেসক্রিপশন বা ক্লিনিক্যাল নোট দেখা ছাড়াই বুকিং ও পেমেন্টে সাহায্য করে।",
  },
];

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getCenterOffset(bottomPx = 20) {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  // Dual-Gyro Orb is 86x86 during intro (radius 43px), anchored at right: 20px, bottom: bottomPx
  return {
    x: -(window.innerWidth / 2 - 20 - 43),
    y: -(window.innerHeight / 2 - bottomPx - 43),
  };
}

export function FloatingSupportWidget() {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [view, setView] = useState<"menu" | "chat" | "call">("menu");
  const [input, setInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // AgriSense-style animated 3D Glowing Orb state machine
  const [stage, setStage] = useState<"hidden" | "intro" | "docked">("hidden");
  const [showGreeting, setShowGreeting] = useState(false);
  const [centerOffset, setCenterOffset] = useState(() => getCenterOffset(20));

  const [messages, setMessages] = useState<SupportChatItem[]>([
    {
      id: "init-1",
      sender: "bot",
      text:
        locale === "bn"
          ? "স্বাস্থ্যসেতু ৩ডি এআই সাপোর্ট ডেস্কে স্বাগতম! অ্যাপয়েন্টমেন্ট, ডায়াগনস্টিক ল্যাব, মেডিসিন অর্ডার বা লাইভ সহায়তার জন্য বার্তা দিন।"
          : "Welcome to ShasthoSetu 3D AI Support Desk! Ask about doctor appointments, lab tests, ePharma medicine orders, or launch live conversational voice.",
      time: "Online",
    },
  ]);

  // Audio Support Call state
  const [callActive, setCallActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [hardwareAudio, setHardwareAudio] = useState(false);
  const [callSpeaking, setCallSpeaking] = useState(false);
  const [callListening, setCallListening] = useState(false);

  const audioLevelRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const timersRef = useRef<number[]>([]);

  // Calculate center coordinates dynamically on resize
  const updateCenterCoords = useCallback(() => {
    setCenterOffset(getCenterOffset(20));
  }, []);

  // Entrance hop sequence on every page mount
  useEffect(() => {
    updateCenterCoords();
    window.addEventListener("resize", updateCenterCoords);

    setStage("hidden");
    const r1 = window.requestAnimationFrame(() => {
      const r2 = window.requestAnimationFrame(() => {
        setStage("intro");
        const t1 = window.setTimeout(() => setShowGreeting(true), 420);
        const t2 = window.setTimeout(() => {
          setShowGreeting(false);
          setStage("docked");
        }, 2450);
        timersRef.current.push(t1, t2);
      });
      timersRef.current.push(r2);
    });
    timersRef.current.push(r1);

    return () => {
      window.removeEventListener("resize", updateCenterCoords);
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, [updateCenterCoords]);

  // Play text aloud via Browser Speech Synthesis
  const playTextSpeech = useCallback((textId: string, textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (playingVoiceId === textId) {
      window.speechSynthesis.cancel();
      setPlayingVoiceId(null);
      setCallSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingVoiceId(textId);
    setCallSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const isBangla = /[\u0980-\u09FF]/.test(textToSpeak);
    utterance.lang = isBangla ? "bn-BD" : "en-US";

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) =>
      isBangla ? v.lang.toLowerCase().startsWith("bn") : v.lang.toLowerCase().startsWith("en")
    );
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setPlayingVoiceId(null);
      setCallSpeaking(false);
    };
    utterance.onerror = () => {
      setPlayingVoiceId(null);
      setCallSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [playingVoiceId]);

  const stopAudioCall = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
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
    setCallSpeaking(false);
    setCallListening(false);
    setPlayingVoiceId(null);
  }, []);

  useEffect(() => {
    let t: number | undefined;
    if (callActive) {
      t = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [callActive]);

  useEffect(() => {
    return () => {
      stopAudioCall();
    };
  }, [stopAudioCall]);

  const startAudioCall = async () => {
    setView("call");
    setCallActive(true);
    setCallSeconds(0);
    setMicMuted(false);

    // Initial greeting aloud
    const greetingText =
      locale === "bn"
        ? "আসসালামু আলাইকুম, আমি স্বাস্থ্যসেতু ৩ডি এআই অ্যাসিস্ট্যান্ট। আমি আপনাকে কীভাবে সাহায্য করতে পারি?"
        : "Hello, I am ShasthoSetu 3D AI Assistant. How can I help you today?";
    playTextSpeech("call-init", greetingText);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        setHardwareAudio(true);

        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const pollAudio = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          audioLevelRef.current = avg;
          setCallListening(avg > 18);
          rafRef.current = requestAnimationFrame(pollAudio);
        };
        rafRef.current = requestAnimationFrame(pollAudio);

        const SpeechRec =
          (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

        if (SpeechRec) {
          try {
            const rec = new SpeechRec();
            rec.continuous = true;
            rec.interimResults = false;
            rec.lang = locale === "bn" ? "bn-BD" : "en-US";
            rec.onresult = (e: any) => {
              const last = e.results[e.results.length - 1];
              if (last && last[0] && last[0].transcript) {
                const heard = last[0].transcript.trim();
                if (heard) {
                  sendReply(heard, undefined, true);
                }
              }
            };
            rec.start();
            recognitionRef.current = rec;
          } catch {
            // SpeechRecognition may be restricted or unsupported
          }
        }
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

  const sendReply = (promptText: string, presetAnswer?: string, speakResponseOutLoud = false) => {
    const clean = promptText.trim();
    if (!clean) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `u-${Date.now()}`;
    const botMsgId = `b-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: clean, time: nowTime },
    ]);
    if (!presetAnswer) setInput("");
    setChatSending(true);

    window.setTimeout(() => {
      const matched = QUICK_TOPICS.find((t) =>
        clean.toLowerCase().includes(t.label.split(" ")[0].toLowerCase())
      );
      const reply =
        presetAnswer ||
        (locale === "bn" && matched?.answerBn ? matched.answerBn : matched?.answer) ||
        (locale === "bn"
          ? "স্বাস্থ্যসেতু ৩ডি সাপোর্টে যোগাযোগের জন্য ধন্যবাদ! বিস্তারিত টিকিট ট্র্যাকিং বা রিফান্ডের জন্য পোর্টাল (/support/dashboard) ব্যবহার করুন। আমাদের জিরো-পিএইচআই পলিসি সবসময় কার্যকর।"
          : "Thanks for contacting ShasthoSetu Support! For detailed ticket tracking or refunds, sign in to your Patient or Support Portal (/support/dashboard). Reminder: Zero-PHI isolation is active.");

      setMessages((prev) => [
        ...prev,
        { id: botMsgId, sender: "bot", text: reply, time: nowTime },
      ]);
      setChatSending(false);

      if (speakResponseOutLoud || view === "call") {
        playTextSpeech(botMsgId, reply);
      }
    }, 450);
  };

  const launcherTransform =
    stage === "docked"
      ? "translate3d(0px, 0px, 0) scale(1)"
      : stage === "intro"
        ? `translate3d(${centerOffset.x}px, ${centerOffset.y}px, 0) scale(1)`
        : `translate3d(${centerOffset.x}px, ${centerOffset.y}px, 0) scale(0.2)`;

  return (
    <>
      {/* Radial Menu Trigger (AgriSense Orbit Pattern: anchored at bottom 76px, right 28px) */}
      {!open && stage === "docked" && (
        <ShasthoSetuRadialMenu
          githubUrl={TEAM_INFO.githubRepoUrl}
          onOpenTeamModal={() => setTeamModalOpen(true)}
          onStartVoiceCall={() => {
            setOpen(true);
            void startAudioCall();
          }}
        />
      )}

      {/* Main Bottom-Right 3D Support Launcher / Dialog */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 no-print select-none">
        {/* Support Chat / Call Dialog Window */}
        {open && (
          <div
            role="dialog"
            aria-label="ShasthoSetu 3D Support Desk"
            className="w-[340px] sm:w-[410px] rounded-3xl border border-cyan-400/40 bg-[#050d1f]/95 backdrop-blur-2xl text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.75)] overflow-hidden"
            style={{ boxShadow: "0 20px 60px rgba(0, 0, 0, 0.78), 0 0 32px rgba(56, 189, 248, 0.28)" }}
          >
            {/* Top Modal Header */}
            <div className="px-5 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-[#0a1833] via-[#0d2144] to-[#0a1833] flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-300">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  3D AI Healthcare Orb • Zero-PHI
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
                className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3D Interactive Medical AI Chatbot Orb */}
            <div className="px-4 pt-3">
              <div className="h-[148px] rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#040e24] via-[#05132d] to-[#030918] flex flex-col items-center justify-center relative overflow-hidden">
                <MedicalAiChatbotOrb
                  size="hero"
                  isSpeaking={callSpeaking || playingVoiceId !== null || chatSending}
                  isListening={callListening || callActive}
                />
                <div className="absolute bottom-2 inset-x-0 text-center font-mono text-[10px] tracking-wider text-cyan-300 uppercase">
                  {callActive
                    ? `CONVERSATIONAL VOICE LIVE • ${formatClock(callSeconds)}`
                    : view === "chat"
                      ? "3D SUPPORT CHAT ACTIVE • ZERO-PHI"
                      : "3D GYROSCOPIC AI HEALTHCARE CORE"}
                </div>
              </div>
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
                Menu
              </button>
              <button
                type="button"
                onClick={() => setView("chat")}
                className={`px-3 py-1.5 rounded-xl font-semibold border cursor-pointer transition ${
                  view === "chat"
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Chat Support
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!callActive) void startAudioCall();
                  else setView("call");
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold border cursor-pointer transition ${
                  view === "call"
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Voice Call {callActive ? `(${formatClock(callSeconds)})` : ""}
              </button>
            </div>

            {/* VIEW 1: Main Menu with Actions */}
            {view === "menu" && (
              <div className="p-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className="w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-400/50 flex items-center justify-between gap-3 text-left transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white group-hover:text-cyan-300">
                        {locale === "bn" ? "সাপোর্ট চ্যাট ও প্রশ্নোত্তর" : "Live Support Chat"}
                      </div>
                      <div className="text-[11px] text-slate-400">Zero-PHI • Instant Resolution</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 shrink-0" />
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
                        {locale === "bn" ? "আমাদের সাথে কথা বলুন (ভয়েস কল)" : "Conversational Voice Call"}
                      </div>
                      <div className="text-[11px] text-slate-400">Direct Hands-Free Speech • Bilingual</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Link
                    to="/support/dashboard"
                    onClick={() => setOpen(false)}
                    className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    Open Full Ticket History Portal →
                  </Link>
                  <a
                    href={TEAM_INFO.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-[11px] font-semibold text-slate-200 hover:text-white transition"
                  >
                    <Github className="w-3.5 h-3.5 text-cyan-400" />
                    <span>GitHub Repo</span>
                  </a>
                </div>
              </div>
            )}

            {/* VIEW 2: Interactive Chat with on-demand [🔊 Listen] buttons */}
            {view === "chat" && (
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => sendReply(t.label, locale === "bn" ? t.answerBn : t.answer)}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-200 cursor-pointer"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        m.sender === "user"
                          ? "bg-cyan-500/20 border border-cyan-400/40 ml-6 text-white"
                          : "bg-slate-900/95 border border-slate-800 mr-4 text-slate-200"
                      }`}
                    >
                      <p>{m.text}</p>
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/5 text-[10px]">
                        <span className="font-mono text-slate-400">{m.time}</span>
                        {m.sender === "bot" && (
                          <button
                            type="button"
                            onClick={() => playTextSpeech(m.id, m.text)}
                            aria-label="Listen to response voice"
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                              playingVoiceId === m.id
                                ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold"
                                : "bg-slate-800/80 border-slate-700 text-cyan-300 hover:border-cyan-400"
                            }`}
                          >
                            {playingVoiceId === m.id ? (
                              <>
                                <VolumeX className="w-3 h-3" /> Stop
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" /> {locale === "bn" ? "শুনুন" : "Listen"}
                              </>
                            )}
                          </button>
                        )}
                      </div>
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

            {/* VIEW 3: Live Audio Call (Hands-Free Conversational Voice) */}
            {view === "call" && (
              <div className="p-4 space-y-3 text-center">
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/35 space-y-1.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-emerald-300">
                    {hardwareAudio ? "Live Microphone Active • Hands-Free Conversational Voice" : "Simulated Support Audio Active"}
                  </div>
                  <div className="text-2xl font-black font-mono text-white">{formatClock(callSeconds)}</div>
                  <p className="text-[11px] text-slate-300">
                    {callSpeaking
                      ? "AI is speaking back aloud..."
                      : callListening
                        ? "Listening to your voice..."
                        : "Speak normally — automatic speech detection is running."}
                  </p>
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
                    <PhoneOff className="w-4 h-4" /> End Call
                  </button>
                </div>
              </div>
            )}

            {/* Zero-PHI Footer Notice */}
            <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Zero-PHI Desk: Isolated from private clinical notes.</span>
            </div>
          </div>
        )}

        {/* Main Docked 3D Gyroscopic Orb Support Launcher (AgriSense double-hop into dock) */}
        {!open && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem("ss-orb-intro-done", "1");
              }
              setStage("docked");
              setOpen(true);
            }}
            aria-label="Open 3D Support Chat, Hands-Free Voice and Care Help"
            className={`ai-orb-launcher stage-${stage}`}
            style={{
              bottom: "20px",
              right: "20px",
              transform: launcherTransform,
            }}
          >
            {stage === "intro" && (
              <span className={`ai-intro-bubble ${showGreeting ? "show" : ""}`}>
                {locale === "bn" ? "Hi! I'm ShasthoSetu AI" : "Hi! I'm ShasthoSetu AI"}
              </span>
            )}

            <MedicalAiChatbotOrb size={stage === "docked" ? "docked" : "intro"} />

            <div className="ai-launcher-label text-left">
              <span className="font-extrabold text-white text-xs leading-tight">
                Support 3D
              </span>
              <span className="text-[10px] font-mono text-cyan-300 font-medium">
                Zero-PHI • Voice &amp; Chat
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Global Team Roster Modal (Accessible from anywhere) */}
      <TeamRosterModal isOpen={teamModalOpen} onClose={() => setTeamModalOpen(false)} />
    </>
  );
}
