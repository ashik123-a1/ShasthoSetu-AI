import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  PhoneCall,
  PhoneOff,
  Send,
  ShieldCheck,
  Video,
} from "lucide-react";

type CallMode = "VIDEO" | "AUDIO";
type CallPhase = "IDLE" | "RINGING" | "CONNECTED" | "ENDED";

interface ChatMessage {
  id: string;
  sender: "you" | "remote" | "system";
  name: string;
  text: string;
  time: string;
}

export interface LiveConsultationCallStudioProps {
  roomId?: string;
  counterpartyName?: string;
  counterpartyRole?: string;
  counterpartyAvatar?: string;
  initialMode?: CallMode;
  compact?: boolean;
  onEndCall?: () => void;
}

function playToneChime(kind: "ring" | "connect" | "end") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (kind === "ring") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.14);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (kind === "connect") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.11);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(329.63, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.32);
    }
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Ignore autoplay restrictions
  }
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveConsultationCallStudio({
  roomId = "shasthosetu-consult-demo",
  counterpartyName = "Dr. Farhana Rahman",
  counterpartyRole = "OB-GYN & PCOS Specialist • BMDC #91044",
  counterpartyAvatar = "/images/doctors/doc-f-01.jpg",
  initialMode = "VIDEO",
  compact = false,
  onEndCall,
}: LiveConsultationCallStudioProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const [mode, setMode] = useState<CallMode>(initialMode);
  const [phase, setPhase] = useState<CallPhase>("IDLE");
  const [seconds, setSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(initialMode === "AUDIO");
  const [screenSharing, setScreenSharing] = useState(false);
  const [hardwareLive, setHardwareLive] = useState(false);
  const [statusNote, setStatusNote] = useState(
    "Ready for encrypted consultation. Start Video or Audio Call anytime."
  );
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 14 }, () => 14));
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "sys-1",
      sender: "system",
      name: "Consultation Room",
      text: `Secure consultation channel #${roomId} initialized.`,
      time: "Now",
    },
  ]);

  const stopAllMedia = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
      mediaStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((tr) => tr.stop());
      screenStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setHardwareLive(false);
    setScreenSharing(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, [stopAllMedia]);

  // BroadcastChannel multi-tab call chat sync
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return undefined;
    const ch = new BroadcastChannel(`shasthosetu-call-${roomId}`);
    channelRef.current = ch;
    ch.onmessage = (ev: MessageEvent) => {
      const payload = ev.data as ChatMessage | undefined;
      if (!payload || !payload.text) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        return [...prev, { ...payload, sender: "remote" }];
      });
    };
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [roomId]);

  // Call duration timer
  useEffect(() => {
    if (phase !== "CONNECTED") return undefined;
    const timer = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Ring -> Connected auto transition
  useEffect(() => {
    if (phase !== "RINGING") return undefined;
    const timer = window.setTimeout(() => {
      playToneChime("connect");
      setPhase("CONNECTED");
      setStatusNote(
        hardwareLive
          ? "Live call connected with real browser camera/microphone stream."
          : "Live call connected in Simulated Clinical Studio (camera/mic unavailable or blocked)."
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `greet-${Date.now()}`,
          sender: "remote",
          name: counterpartyName,
          text: `Assalamu Alaikum! I am ${counterpartyName}. Your ${mode.toLowerCase()} consultation room is active. Please share your symptoms or question.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [phase, hardwareLive, counterpartyName, mode]);

  // Equalizer WebAudio analyzer loop (real mic FFT or smooth simulated wave)
  useEffect(() => {
    if (phase !== "CONNECTED" && phase !== "RINGING") {
      setBars(Array.from({ length: 14 }, () => 12));
      return undefined;
    }

    let running = true;
    const freqData = analyserRef.current ? new Uint8Array(analyserRef.current.frequencyBinCount) : null;
    let tick = 0;

    const frame = () => {
      if (!running) return;
      tick += 0.14;
      if (micMuted) {
        setBars(Array.from({ length: 14 }, () => 8));
      } else if (analyserRef.current && freqData) {
        analyserRef.current.getByteFrequencyData(freqData);
        const step = Math.max(1, Math.floor(freqData.length / 14));
        const nextBars = Array.from({ length: 14 }, (_, i) => {
          const val = freqData[i * step] ?? 0;
          return Math.max(12, Math.min(100, Math.round((val / 255) * 100) + 12));
        });
        setBars(nextBars);
      } else {
        const nextBars = Array.from({ length: 14 }, (_, i) =>
          Math.round(24 + Math.abs(Math.sin(tick + i * 0.55)) * 58)
        );
        setBars(nextBars);
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, micMuted, hardwareLive]);

  const startCall = async (targetMode: CallMode) => {
    stopAllMedia();
    setMode(targetMode);
    setCamOff(targetMode === "AUDIO");
    setMicMuted(false);
    setSeconds(0);
    setPhase("RINGING");
    playToneChime("ring");
    setStatusNote(
      targetMode === "VIDEO"
        ? "Requesting camera + microphone for HD video consultation..."
        : "Connecting HD clinical audio channel..."
    );

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: targetMode === "VIDEO",
          audio: true,
        });
        mediaStreamRef.current = stream;
        if (localVideoRef.current && targetMode === "VIDEO") {
          localVideoRef.current.srcObject = stream;
        }
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
          // AudioContext optional
        }
        setHardwareLive(true);
        return;
      } catch {
        setHardwareLive(false);
        setStatusNote(
          "Camera/mic permission unavailable in this browser — using simulated AV stream & WebAudio call."
        );
      }
    } else {
      setHardwareLive(false);
      setStatusNote("Browser mediaDevices unavailable — running interactive simulated call studio.");
    }
  };

  const endCall = () => {
    playToneChime("end");
    stopAllMedia();
    setPhase("ENDED");
    setStatusNote(`Consultation ended • Duration ${formatClock(seconds)}. Zero server video stored.`);
    onEndCall?.();
  };

  const toggleMic = () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((tr) => {
        tr.enabled = !nextMuted;
      });
    }
  };

  const toggleCam = () => {
    const nextOff = !camOff;
    setCamOff(nextOff);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach((tr) => {
        tr.enabled = !nextOff;
      });
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((tr) => tr.stop());
        screenStreamRef.current = null;
      }
      if (localVideoRef.current && mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
      setScreenSharing(false);
      setStatusNote("Stopped screen share; returned to camera view.");
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatusNote("Screen share API is not supported in this browser tab.");
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = displayStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }
      setScreenSharing(true);
      setStatusNote("Sharing clinical report / screen locally in consultation room.");
      displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenSharing(false);
        if (localVideoRef.current && mediaStreamRef.current) {
          localVideoRef.current.srcObject = mediaStreamRef.current;
        }
      });
    } catch {
      setStatusNote("Screen share cancelled by user.");
    }
  };

  const sendMessage = (textOverride?: string) => {
    const raw = (textOverride ?? chatInput).trim();
    if (!raw) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: "you",
      name: "You",
      text: raw,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
    if (!textOverride) setChatInput("");
    channelRef.current?.postMessage(msg);

    // Helpful solo demo acknowledgement
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ack-${Date.now()}`,
          sender: "remote",
          name: counterpartyName,
          text: `Received: "${raw.slice(0, 64)}". I have noted this in our live consultation summary.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 650);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT: AV STAGE & CONTROLS */}
      <div className={`${compact ? "lg:col-span-12" : "lg:col-span-7"} rounded-3xl border border-cyan-500/30 bg-[#050d1e]/95 text-white p-4 sm:p-5 space-y-4 shadow-2xl`}>
        {/* Room Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={counterpartyAvatar}
              alt={counterpartyName}
              className="w-11 h-11 rounded-full object-cover border-2 border-cyan-400/70 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-bold text-sm text-white truncate">{counterpartyName}</div>
              <div className="text-[11px] text-cyan-300 font-mono truncate">{counterpartyRole}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold inline-flex items-center gap-1.5 border ${
                phase === "CONNECTED"
                  ? "bg-emerald-950/90 border-emerald-400/50 text-emerald-300"
                  : phase === "RINGING"
                    ? "bg-amber-950/90 border-amber-400/50 text-amber-300"
                    : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  phase === "CONNECTED"
                    ? "bg-emerald-400 animate-pulse"
                    : phase === "RINGING"
                      ? "bg-amber-400 animate-ping"
                      : "bg-slate-500"
                }`}
              />
              {phase} {phase === "CONNECTED" ? `• ${formatClock(seconds)}` : ""}
            </span>
          </div>
        </div>

        {/* Main Video / Audio Stage */}
        <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#071229] via-[#0b1936] to-[#061529] border border-cyan-500/25 overflow-hidden flex items-center justify-center">
          {/* Remote Counterparty Stage Backdrop */}
          <div className="text-center px-6 space-y-3 z-10">
            <div className="relative inline-block">
              <img
                src={counterpartyAvatar}
                alt={counterpartyName}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 mx-auto shadow-xl ${
                  phase === "CONNECTED" ? "border-emerald-400" : "border-cyan-400/60"
                }`}
              />
              {phase === "CONNECTED" && (
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold">
                  {mode}
                </span>
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-white">{counterpartyName}</p>
              <p className="text-[11px] text-slate-300">
                {phase === "IDLE"
                  ? "Select Video Call or Audio Call below to start"
                  : phase === "RINGING"
                    ? `Ringing encrypted ${mode.toLowerCase()} room...`
                    : phase === "CONNECTED"
                      ? `${mode === "VIDEO" ? "HD Video" : "Crystal Audio"} Connected • ${formatClock(seconds)}`
                      : "Session Ended"}
              </p>
            </div>

            {/* Live WebAudio Equalizer */}
            <div className="flex items-end justify-center gap-1 h-8 pt-1" aria-hidden="true">
              {bars.map((val, idx) => (
                <span
                  key={idx}
                  className="w-1.5 rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(14, Math.min(100, val))}%`,
                    backgroundColor: phase === "CONNECTED" ? "#22d3ee" : "#334155",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Local Camera PIP / Screen Share */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`absolute bottom-3 right-3 w-32 sm:w-44 aspect-video rounded-xl object-cover border-2 border-cyan-400/70 shadow-2xl bg-slate-950 z-20 ${
              (hardwareLive && mode === "VIDEO" && !camOff) || screenSharing ? "block" : "hidden"
            }`}
          />

          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 border border-cyan-500/30 font-mono text-[10px] text-cyan-200 z-20">
            E2E CLINIC ROOM • {hardwareLive ? "LIVE MIC/CAM" : "SIMULATED AV"}
          </span>
        </div>

        {/* Call Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void startCall("VIDEO")}
              className="min-h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              {phase === "CONNECTED" && mode === "VIDEO" ? "Restart Video" : "Start Video Call"}
            </button>

            <button
              type="button"
              onClick={() => void startCall("AUDIO")}
              className="min-h-11 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              {phase === "CONNECTED" && mode === "AUDIO" ? "Restart Audio" : "Start Audio Call"}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={`min-h-11 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                micMuted
                  ? "bg-rose-500/20 border-rose-400/50 text-rose-200"
                  : "bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-400/50"
              }`}
            >
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {micMuted ? "Unmute" : "Mute"}
            </button>

            <button
              type="button"
              onClick={toggleCam}
              disabled={mode === "AUDIO"}
              className="min-h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400/50 disabled:opacity-40 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {camOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              {camOff ? "Cam On" : "Cam Off"}
            </button>

            <button
              type="button"
              onClick={() => void toggleScreenShare()}
              className={`min-h-11 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                screenSharing
                  ? "bg-indigo-500/30 border-indigo-400 text-indigo-200"
                  : "bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-400/50"
              }`}
            >
              <MonitorUp className="w-4 h-4" />
              {screenSharing ? "Stop Share" : "Share Report"}
            </button>

            {(phase === "CONNECTED" || phase === "RINGING") && (
              <button
                type="button"
                onClick={endCall}
                className="min-h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" /> End Call
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{statusNote}</span>
        </p>
      </div>

      {/* RIGHT: LIVE IN-CALL CLINICAL CHAT (SYNCED VIA BROADCASTCHANNEL) */}
      {!compact && (
        <div className="lg:col-span-5 rounded-3xl border border-cyan-500/25 bg-[#071126]/95 text-slate-100 p-4 sm:p-5 flex flex-col justify-between min-h-[380px] shadow-2xl">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Live In-Call Clinical Chat</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                Multi-Tab Sync
              </span>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {["Shared latest CBC report", "Fever 101°F for 2 days", "Please advise dosage"].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-200 cursor-pointer"
                >
                  + {prompt}
                </button>
              ))}
            </div>

            {/* Message Feed */}
            <div className="flex-1 max-h-60 overflow-y-auto space-y-2.5 pr-1 py-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-2xl text-xs ${
                    m.sender === "you"
                      ? "bg-cyan-500/20 border border-cyan-400/40 ml-8 text-white"
                      : m.sender === "system"
                        ? "bg-slate-900/90 border border-slate-800 text-slate-400 text-[11px] font-mono"
                        : "bg-slate-900 border border-slate-700/80 mr-8 text-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 font-mono">
                    <span className="font-bold text-cyan-300">{m.name}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message or symptom note..."
                className="flex-1 min-h-11 rounded-xl bg-slate-900 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-11 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>

            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Local WebRTC/getUserMedia demo • No video frames saved on server</span>
              <Phone className="w-3 h-3 text-cyan-400 ml-auto shrink-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
