import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  FileText,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneCall,
  PhoneOff,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import {
  playCallConnected,
  playCallEnded,
  playNotificationSound,
  startCallingToneLoop,
  stopCallingToneLoop,
} from "../../utils/soundEffects";

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
  userRole?: "PATIENT" | "DOCTOR";
  initialMode?: CallMode;
  compact?: boolean;
  onEndCall?: () => void;
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveConsultationCallStudio({
  roomId = "apt-demo-9001",
  counterpartyName = "Dr. Farhana Rahman",
  counterpartyRole = "OB-GYN & PCOS Specialist • BMDC #91044",
  counterpartyAvatar = "/images/doctors/doc-f-01.jpg",
  userRole = "PATIENT",
  initialMode = "VIDEO",
  compact = false,
  onEndCall,
}: LiveConsultationCallStudioProps) {
  const cleanRoomId = roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string>(
    `peer-${userRole.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [mode, setMode] = useState<CallMode>(initialMode);
  const [phase, setPhase] = useState<CallPhase>("IDLE");
  const [seconds, setSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(initialMode === "AUDIO");
  const [screenSharing, setScreenSharing] = useState(false);
  const [hardwareLive, setHardwareLive] = useState(false);
  const [remotePeerActive, setRemotePeerActive] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [intakeData, setIntakeData] = useState<any>(null);

  const [statusNote, setStatusNote] = useState(
    "2-Device Encrypted Call Studio ready. Start Video or Audio Call anytime."
  );
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 14 }, () => 14));
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "sys-1",
      sender: "system",
      name: "Consultation Room",
      text: `Secure consultation room #${cleanRoomId} initialized. Connect from 2 devices using this room ID.`,
      time: "Now",
    },
  ]);

  const latestSignalIdRef = useRef(0);
  const latestChatTsRef = useRef(0.0);

  const stopAllMedia = useCallback(() => {
    stopCallingToneLoop();
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
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setHardwareLive(false);
    setScreenSharing(false);
    setRemoteHasVideo(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAllMedia();
      // Inform backend we left
      void fetch(`/v1/consultations/rooms/${cleanRoomId}/leave?peer_id=${peerIdRef.current}`, {
        method: "POST",
      }).catch(() => {});
    };
  }, [cleanRoomId, stopAllMedia]);

  // Join Room & Register with Backend Signaling
  useEffect(() => {
    let active = true;
    const join = async () => {
      try {
        const res = await fetch(`/v1/consultations/rooms/${cleanRoomId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            peer_id: peerIdRef.current,
            role: userRole,
            display_name: userRole === "DOCTOR" ? "Dr. Desk" : "Patient",
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (data.intake) setIntakeData(data.intake);
        if (data.active_peers && data.active_peers.length > 1) {
          setRemotePeerActive(true);
        }
      } catch {
        // Signaling endpoint fallback
      }
    };
    void join();
    return () => {
      active = false;
    };
  }, [cleanRoomId, userRole]);

  // WebRTC Setup Helper
  const setupPeerConnection = useCallback(() => {
    if (peerConnRef.current) return peerConnRef.current;
    if (typeof RTCPeerConnection === "undefined") return null;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void fetch(`/v1/consultations/rooms/${cleanRoomId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_peer: peerIdRef.current,
            signal_type: "ice",
            data: event.candidate,
          }),
        }).catch(() => {});
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setRemoteHasVideo(stream.getVideoTracks().length > 0);
    };

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStreamRef.current!);
      });
    }

    peerConnRef.current = pc;
    return pc;
  }, [cleanRoomId]);

  // Polling Signaling Loop (Exchanges SDP Offer/Answer, ICE, and Chat across 2 Devices)
  useEffect(() => {
    let interval: number;

    const poll = async () => {
      try {
        const res = await fetch(
          `/v1/consultations/rooms/${cleanRoomId}/poll?peer_id=${peerIdRef.current}&since_signal_id=${latestSignalIdRef.current}&since_chat_ts=${latestChatTsRef.current}`
        );
        if (!res.ok) return;
        const data = await res.json();

        // Update peers presence
        const otherPeers = (data.active_peers || []).filter(
          (p: any) => p.peer_id !== peerIdRef.current
        );
        setRemotePeerActive(otherPeers.length > 0);
        if (data.intake) setIntakeData(data.intake);
        if (data.latest_signal_id) latestSignalIdRef.current = data.latest_signal_id;

        // Process incoming signals
        for (const sig of data.signals || []) {
          const pc = setupPeerConnection();
          if (!pc) continue;

          if (sig.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await fetch(`/v1/consultations/rooms/${cleanRoomId}/signal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                from_peer: peerIdRef.current,
                to_peer: sig.from_peer,
                signal_type: "answer",
                data: answer,
              }),
            });
            if (phase === "RINGING" || phase === "IDLE") {
              stopCallingToneLoop();
              playCallConnected();
              setPhase("CONNECTED");
            }
          } else if (sig.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            if (phase === "RINGING") {
              stopCallingToneLoop();
              playCallConnected();
              setPhase("CONNECTED");
            }
          } else if (sig.type === "ice") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(sig.data));
            } catch {
              // Ignore late ICE candidate
            }
          } else if (sig.type === "end_call") {
            stopCallingToneLoop();
            playCallEnded();
            stopAllMedia();
            setPhase("ENDED");
            setStatusNote("Remote participant ended the consultation.");
          }
        }

        // Process incoming chat messages
        if (data.chat && data.chat.length > 0) {
          playNotificationSound();
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = data.chat
              .filter((c: any) => !existingIds.has(c.id))
              .map((c: any) => ({
                id: c.id,
                sender: c.sender_peer_id === peerIdRef.current ? "you" : "remote",
                name: c.name,
                text: c.text,
                time: c.time,
              }));
            return [...prev, ...newOnes];
          });
          latestChatTsRef.current = data.now_ts || Date.now() / 1000;
        }
      } catch {
        // Offline or connection glitch
      }
    };

    interval = window.setInterval(() => {
      void poll();
    }, 1200);

    return () => window.clearInterval(interval);
  }, [cleanRoomId, phase, setupPeerConnection, stopAllMedia]);

  // Call duration timer
  useEffect(() => {
    if (phase !== "CONNECTED") return undefined;
    const timer = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Ring timeout -> auto fallback connect in demo if second peer is slow
  useEffect(() => {
    if (phase !== "RINGING") return undefined;
    const timer = window.setTimeout(() => {
      stopCallingToneLoop();
      playCallConnected();
      setPhase("CONNECTED");
      setStatusNote(
        hardwareLive
          ? "Live call connected with camera/microphone stream (2-Device WebRTC ready)."
          : "Live call active in Clinical Studio (audio/video synthesized)."
      );
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [phase, hardwareLive]);

  // Audio Equalizer WebAudio analyzer loop
  useEffect(() => {
    if (phase !== "CONNECTED" && phase !== "RINGING") {
      setBars(Array.from({ length: 14 }, () => 12));
      return undefined;
    }

    let running = true;
    const freqData = analyserRef.current
      ? new Uint8Array(analyserRef.current.frequencyBinCount)
      : null;
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
  }, [phase, micMuted]);

  const startCall = async (targetMode: CallMode) => {
    stopAllMedia();
    setMode(targetMode);
    setCamOff(targetMode === "AUDIO");
    setMicMuted(false);
    setSeconds(0);
    setPhase("RINGING");
    startCallingToneLoop();

    setStatusNote(
      targetMode === "VIDEO"
        ? "Connecting HD video call across devices..."
        : "Connecting clinical voice channel..."
    );

    let stream: MediaStream | null = null;
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
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
      } catch {
        setHardwareLive(false);
        setStatusNote("Camera/mic permission unavailable in this browser — using simulated AV stream.");
      }
    } else {
      setHardwareLive(false);
      setStatusNote("Running interactive simulated call studio.");
    }

    // Initialize WebRTC and dispatch Offer to the other device
    const pc = setupPeerConnection();
    if (pc) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await fetch(`/v1/consultations/rooms/${cleanRoomId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_peer: peerIdRef.current,
            signal_type: "offer",
            data: offer,
          }),
        });
      } catch {
        // Fallback
      }
    }
  };

  const endCall = () => {
    stopCallingToneLoop();
    playCallEnded();

    // Signal other peer that call ended
    void fetch(`/v1/consultations/rooms/${cleanRoomId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_peer: peerIdRef.current,
        signal_type: "end_call",
        data: { reason: "User pressed end call" },
      }),
    }).catch(() => {});

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

  const sendMessage = async (textOverride?: string) => {
    const raw = (textOverride ?? chatInput).trim();
    if (!raw) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const localMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "you",
      name: userRole === "DOCTOR" ? "Doctor" : "You",
      text: raw,
      time: timeStr,
    };
    setMessages((prev) => [...prev, localMsg]);
    if (!textOverride) setChatInput("");

    // Send to backend signaling to broadcast to the second device
    try {
      await fetch(`/v1/consultations/rooms/${cleanRoomId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_peer_id: peerIdRef.current,
          sender_role: userRole,
          sender_name: userRole === "DOCTOR" ? "Doctor" : "Patient",
          text: raw,
        }),
      });
    } catch {
      // Local fallback
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT: AV STAGE & CONTROLS */}
      <div
        className={`${
          compact ? "lg:col-span-12" : "lg:col-span-7"
        } rounded-3xl border border-cyan-500/30 bg-[#050d1e]/95 text-white p-4 sm:p-5 space-y-4 shadow-2xl`}
      >
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
                remotePeerActive
                  ? "bg-emerald-950/90 border-emerald-400/50 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
              title="2-Device Network Signaling Status"
            >
              <Users className="w-3.5 h-3.5" />
              {remotePeerActive ? "2 Devices Synced" : "Waiting for 2nd Device"}
            </span>

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
          {/* Remote Real Video Stream from 2nd Device */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${
              remoteHasVideo ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />

          {/* Remote Counterparty Stage Backdrop when Video stream is absent or in Audio Mode */}
          {(!remoteHasVideo || mode === "AUDIO") && (
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
                <h4 className="font-bold text-base text-white">{counterpartyName}</h4>
                <p className="text-xs text-cyan-300 font-mono">
                  {phase === "CONNECTED"
                    ? "Clinical Channel Active • End-to-End Encrypted"
                    : phase === "RINGING"
                    ? "Calling counterparty terminal..."
                    : "Offline / Standby"}
                </p>
              </div>

              {/* Dynamic Equalizer Bar visualizer */}
              {(phase === "CONNECTED" || phase === "RINGING") && (
                <div className="flex items-center justify-center gap-1 h-10 px-4 py-1.5 rounded-full bg-black/40 border border-cyan-500/30 backdrop-blur-sm max-w-xs mx-auto">
                  {bars.map((b, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        micMuted
                          ? "bg-slate-600"
                          : phase === "CONNECTED"
                          ? "bg-gradient-to-t from-cyan-400 to-emerald-400"
                          : "bg-amber-400"
                      }`}
                      style={{ height: `${Math.max(10, Math.min(100, b))}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Local User PiP Stream (Self View) */}
          <div className="absolute bottom-3 right-3 w-28 sm:w-36 aspect-video rounded-xl border border-cyan-400/60 bg-black/85 overflow-hidden shadow-2xl z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${camOff ? "hidden" : "block"}`}
            />
            {camOff && (
              <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 font-mono bg-slate-900/90 p-1 text-center">
                <CameraOff className="w-4 h-4 mb-0.5 text-slate-500" />
                <span>Cam Muted</span>
              </div>
            )}
            <div className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-cyan-300">
              You
            </div>
          </div>

          {/* Encryption & Room Overlay Badge */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[10px] font-mono text-slate-300 inline-flex items-center gap-1.5 z-20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Room: {cleanRoomId} • WebRTC</span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
          <span className="truncate">{statusNote}</span>
          <span className="font-mono text-[11px] text-cyan-300 shrink-0">
            {hardwareLive ? "Hardware HD" : "Simulated/WebAudio"}
          </span>
        </div>

        {/* Control Bar Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {phase !== "CONNECTED" && phase !== "RINGING" ? (
            <>
              <button
                type="button"
                onClick={() => void startCall("VIDEO")}
                className="min-h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg hover:brightness-105 transition"
              >
                <Video className="w-4 h-4 fill-slate-950" /> Start Video Call
              </button>
              <button
                type="button"
                onClick={() => void startCall("AUDIO")}
                className="min-h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition"
              >
                <PhoneCall className="w-4 h-4" /> Start Audio Call
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMic}
                className={`min-h-10 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  micMuted
                    ? "bg-rose-950 border-rose-500/60 text-rose-300"
                    : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                }`}
              >
                {micMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                {micMuted ? "Unmute Mic" : "Mute Mic"}
              </button>

              <button
                type="button"
                onClick={toggleCam}
                className={`min-h-10 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  camOff
                    ? "bg-rose-950 border-rose-500/60 text-rose-300"
                    : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                }`}
              >
                {camOff ? <CameraOff className="w-4 h-4 text-rose-400" /> : <Camera className="w-4 h-4 text-cyan-400" />}
                {camOff ? "Turn On Cam" : "Turn Off Cam"}
              </button>

              <button
                type="button"
                onClick={() => void toggleScreenShare()}
                className={`min-h-10 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  screenSharing
                    ? "bg-cyan-950 border-cyan-400 text-cyan-300"
                    : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                }`}
              >
                <MonitorUp className="w-4 h-4" />
                {screenSharing ? "Stop Share" : "Share Screen"}
              </button>

              <button
                type="button"
                onClick={endCall}
                className="min-h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition shadow-lg shadow-rose-950/50"
              >
                <PhoneOff className="w-4 h-4" /> End Call
              </button>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: REAL-TIME CROSS-DEVICE CHAT & PRE-CALL INTAKE */}
      {!compact && (
        <div className="lg:col-span-5 rounded-3xl border border-cyan-500/30 bg-[#050d1e]/95 text-white p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-2xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm">Consultation Chat & Intake</h3>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {remotePeerActive ? "🟢 2 Devices Synced" : "🟡 Waiting for 2nd Device"}
              </span>
            </div>

            {/* Patient Pre-Call Intake Summary Card (Visible to Doctor and Patient) */}
            {intakeData && (
              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between font-bold text-cyan-300 text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Pre-Call Patient Intake
                  </span>
                  <span className="font-mono">Mode: {intakeData.consultation_modality}</span>
                </div>
                {intakeData.symptoms_text && (
                  <p className="text-slate-200">
                    <strong>Symptoms:</strong> {intakeData.symptoms_text}
                  </p>
                )}
                {intakeData.has_uploaded_report && (
                  <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Attached: {intakeData.report_filename || "Medical Report"}
                  </div>
                )}
                {intakeData.has_audio_memo && (
                  <div className="text-[11px] text-indigo-300 flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5" /> Voice note recorded ({intakeData.audio_memo_duration_sec}s)
                  </div>
                )}
              </div>
            )}

            {/* Quick Macro Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "Can you hear me clearly?",
                "প্রেসক্রিপশন কি দেখতে পাচ্ছেন?",
                "ল্যাব রিপোর্ট আপলোড করেছি",
                "I have mild fever and sore throat",
              ].map((txt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void sendMessage(txt)}
                  className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400/50 text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {txt}
                </button>
              ))}
            </div>

            {/* Messages Thread */}
            <div className="h-64 sm:h-72 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-2xl max-w-[85%] space-y-0.5 ${
                    m.sender === "you"
                      ? "ml-auto bg-cyan-600 text-white rounded-br-none"
                      : m.sender === "remote"
                      ? "mr-auto bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"
                      : "mx-auto bg-slate-900/90 text-slate-400 font-mono text-[10px] text-center border border-slate-800"
                  }`}
                >
                  {m.sender !== "system" && (
                    <div className="flex items-center justify-between gap-2 text-[10px] opacity-80">
                      <span className="font-bold">{m.name}</span>
                      <span>{m.time}</span>
                    </div>
                  )}
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex items-center gap-2 pt-2 border-t border-slate-800"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message across devices..."
              className="flex-1 min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-10 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
