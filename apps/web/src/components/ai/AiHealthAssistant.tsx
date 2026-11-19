import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../../lib/apiClient";
import { useAuth } from "../../lib/authContext";
import { useI18n } from "../../lib/i18n";
import { CitationDrawer, type CitationRef } from "./CitationDrawer";
import { SafeMarkdown } from "./SafeMarkdown";
import {
  detectReplyVoiceLanguage,
  speakVoiceReply,
  stopGlobalVoiceReply,
  TtsSpeakControl,
  VoiceInputControls,
  type TtsCapabilities,
} from "./VoiceInputControls";

const GUEST_STORAGE_KEY = "ss_guest_ai_sessions_v1";

interface GuestSessionRecord {
  session: ChatSessionItem;
  messages: ChatMessageItem[];
}

function readGuestSessions(): GuestSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestSessionRecord[]) : [];
  } catch {
    return [];
  }
}

function writeGuestSessions(records: GuestSessionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(records.slice(0, 20)));
  } catch {
    // Ignore storage quota errors
  }
}

interface ChatSessionItem {
  id: string;
  title: string;
  language_mode: string;
  scope: string;
  message_count?: number;
  updated_at_utc: string;
}

interface ChatMessageItem {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM_NOTICE";
  input_modality: string;
  language_detected: string;
  content_text: string;
  grounded_status: string;
  model_id: string;
  index_version: string;
  latency_ms: number;
  safety_flags?: string[];
  citations?: CitationRef[];
  follow_up_questions?: string[];
  user_feedback?: "HELPFUL" | "NOT_HELPFUL" | null;
  created_at_utc?: string;
}

interface RuntimeStatusResp {
  components: Record<string, { label: string; model_id: string; status: string; detail: string }>;
  rag_index: { ready: boolean; chunk_count: number; index_version: string; dense_ready?: boolean };
  feature_flags?: { ai_chatbot_enabled: boolean; voice_ai_enabled: boolean };
}

export function AiHealthAssistant({
  portalMode = "public",
}: {
  portalMode?: "public" | "patient" | "doctor" | "support";
}) {
  const { locale } = useI18n();
  const { authenticated } = useAuth();

  const [languageMode, setLanguageMode] = useState<"auto" | "bn" | "en">("auto");
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeStatusResp | null>(null);
  const [ttsCaps, setTtsCaps] = useState<TtsCapabilities | null>(null);
  const [activeCitation, setActiveCitation] = useState<CitationRef | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingReplyNow, setSpeakingReplyNow] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const loadRuntimeAndSessions = useCallback(async () => {
    try {
      const [rt, tts] = await Promise.all([
        apiGet<RuntimeStatusResp>("/v1/ai/models/status"),
        apiGet<TtsCapabilities>("/v1/ai/voice/tts-status"),
      ]);
      setRuntime(rt);
      setTtsCaps(tts);
    } catch {
      setRuntime(null);
    }

    if (authenticated) {
      try {
        const res = await apiGet<{ sessions: ChatSessionItem[] }>("/v1/ai/chats");
        setSessions(res.sessions || []);
      } catch {
        setSessions([]);
      }
    } else {
      const guestList = readGuestSessions();
      setSessions(guestList.map((g) => g.session));
    }
  }, [authenticated]);

  useEffect(() => {
    void loadRuntimeAndSessions();
    return () => {
      stopGlobalVoiceReply();
    };
  }, [loadRuntimeAndSessions]);

  const openSession = async (sid: string) => {
    setErrorBanner(null);
    if (!authenticated) {
      const found = readGuestSessions().find((g) => g.session.id === sid);
      if (found) {
        setActiveSessionId(sid);
        setMessages(found.messages);
      }
      return;
    }
    try {
      const res = await apiGet<{ session: ChatSessionItem; messages: ChatMessageItem[] }>(`/v1/ai/chats/${encodeURIComponent(sid)}`);
      setActiveSessionId(sid);
      setMessages(res.messages || []);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Could not load chat session.");
    }
  };

  const startNewChat = () => {
    stopGlobalVoiceReply();
    setSpeakingReplyNow(false);
    setActiveSessionId(null);
    setMessages([]);
    setErrorBanner(null);
  };

  const deleteSession = async (sid: string) => {
    if (!authenticated) {
      const next = readGuestSessions().filter((g) => g.session.id !== sid);
      writeGuestSessions(next);
      if (activeSessionId === sid) startNewChat();
      setSessions(next.map((g) => g.session));
      return;
    }
    try {
      await apiDelete(`/v1/ai/chats/${encodeURIComponent(sid)}`);
      if (activeSessionId === sid) startNewChat();
      await loadRuntimeAndSessions();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Could not delete session.");
    }
  };

  const sendMessage = async (
    queryText: string,
    opts?: { modality?: "TEXT" | "VOICE"; asrJobId?: string; autoSpeakReply?: boolean }
  ) => {
    const clean = queryText.trim();
    if (!clean || sending) return;

    stopGlobalVoiceReply();
    setSpeakingReplyNow(false);
    setErrorBanner(null);
    setSending(true);
    const localUserId = `tmp-u-${Date.now()}`;
    const userBubble: ChatMessageItem = {
      id: localUserId,
      role: "USER",
      input_modality: opts?.modality || "TEXT",
      language_detected: languageMode,
      content_text: clean,
      grounded_status: "USER_INPUT",
      model_id: "",
      index_version: "",
      latency_ms: 0,
    };
    const nextWithUser = [...messages, userBubble];
    setMessages(nextWithUser);
    if (!opts?.asrJobId) setInputText("");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/v1/ai/chat", {
        method: "POST",
        credentials: "include",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: clean,
          session_id: authenticated ? activeSessionId : null,
          language_mode: languageMode,
          input_modality: opts?.modality || "TEXT",
          asr_job_id: opts?.asrJobId || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || resp.statusText || "Chat request failed.");
      }

      const detectedLang = detectReplyVoiceLanguage(data.answer_text || "");
      const assistantMsg: ChatMessageItem = {
        id: data.message_id || `tmp-a-${Date.now()}`,
        role: "ASSISTANT",
        input_modality: opts?.modality || "TEXT",
        language_detected: data.response_language || detectedLang,
        content_text: data.answer_text,
        grounded_status: data.grounded_status,
        model_id: data.model_id,
        index_version: data.index_version,
        latency_ms: data.latency_ms,
        safety_flags: data.safety_flags || [],
        citations: data.citations || [],
        follow_up_questions: data.follow_up_questions || [],
      };
      const updatedMsgs = [...nextWithUser, assistantMsg];
      setMessages(updatedMsgs);

      if (authenticated) {
        if (data.session_id) setActiveSessionId(data.session_id);
        void loadRuntimeAndSessions();
      } else {
        const sid = activeSessionId || `guest-${Date.now()}`;
        setActiveSessionId(sid);
        const currentList = readGuestSessions().filter((g) => g.session.id !== sid);
        const nowIso = new Date().toISOString();
        const record: GuestSessionRecord = {
          session: {
            id: sid,
            title: updatedMsgs[0]?.content_text?.slice(0, 56) || "Guest Health Chat",
            language_mode: languageMode,
            scope: "PUBLIC_GUEST",
            message_count: updatedMsgs.length,
            updated_at_utc: nowIso,
          },
          messages: updatedMsgs,
        };
        const merged = [record, ...currentList];
        writeGuestSessions(merged);
        setSessions(merged.map((g) => g.session));
      }

      if (opts?.autoSpeakReply && autoSpeak && data.answer_text) {
        const speakLang: "bn" | "en" =
          languageMode === "en" ? "en" : languageMode === "bn" ? "bn" : detectedLang;
        setSpeakingReplyNow(true);
        void speakVoiceReply(data.answer_text, speakLang, ttsCaps, () => {
          setSpeakingReplyNow(false);
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setErrorBanner(locale === "bn" ? "অনুরোধ বাতিল করা হয়েছে।" : "Request cancelled.");
      } else {
        setErrorBanner(err instanceof Error ? err.message : "Failed to reach RAG Chatbot API.");
      }
    } finally {
      abortRef.current = null;
      setSending(false);
      window.setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 120);
    }
  };

  const cancelInFlight = () => {
    abortRef.current?.abort();
  };

  const sendFeedback = async (msgId: string, rating: "HELPFUL" | "NOT_HELPFUL") => {
    if (!authenticated || msgId.startsWith("tmp-")) return;
    try {
      await apiPost(`/v1/ai/messages/${encodeURIComponent(msgId)}/feedback`, { rating });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, user_feedback: rating } : m)));
    } catch {
      // Ignore transient feedback failure
    }
  };

  const copyText = async (msgId: string, txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedId(msgId);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  const chatModelStatus = runtime?.components?.ollama_chat?.status || "UNAVAILABLE";
  const embedModelStatus = runtime?.components?.ollama_embed?.status || "UNAVAILABLE";
  const statusBadgeText = sending
    ? "Processing"
    : chatModelStatus === "READY"
    ? "Model Ready"
    : chatModelStatus === "LOADING"
    ? "Model Loading"
    : "Model Unavailable";

  const quickExamples =
    portalMode === "support"
      ? [
          "How do Zero-PHI rules protect patient privacy in Support?",
          "ডেমো পেমেন্ট রিসিপ্ট কোথা থেকে ডাউনলোড করবো?",
        ]
      : [
          "PCOS কী এবং কী কী লক্ষণ থাকতে পারে?",
          "PCOS er symptoms ki ki?",
          "What does PCOM on an ultrasound report mean?",
          "প্রেসক্রিপশনে 1+0+1 ও AC/PC বলতে কী বোঝায়?",
        ];

  return (
    <div className="space-y-4 text-white" data-testid="ai-health-assistant">
      {/* Top Status & Safety Banner */}
      <div className="ss-sapphire-card rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/35 text-sky-300 font-bold">
              <Bot className="w-3.5 h-3.5" />
              {portalMode === "support"
                ? "ZERO-PHI SUPPORT FAQ CHATBOT"
                : portalMode === "doctor"
                ? "CLINICAL REFERENCE RAG ASSISTANT"
                : "BILINGUAL MEDICAL INFORMATION RAG CHATBOT"}
            </span>
            <span
              data-testid="ai-model-status-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold ${
                sending
                  ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                  : chatModelStatus === "READY"
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                  : "bg-rose-500/20 border-rose-400/40 text-rose-200"
              }`}
            >
              {statusBadgeText}
            </span>
            <span className="text-slate-400">
              LLM: {runtime?.components?.ollama_chat?.model_id || "qwen2.5:7b"} • Index:{" "}
              {runtime?.rag_index?.chunk_count ?? 0} chunks ({embedModelStatus === "READY" ? "FAISS+BM25" : "BM25"})
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {portalMode === "support"
              ? "Support scope: Answers operational & Zero-PHI policy FAQs only. Private clinical records and patient chats remain blocked."
              : locale === "bn"
              ? "শিক্ষামূলক স্বাস্থ্য তথ্য ও ডাক্তার দেখানোর প্রস্তুতি সহায়ক — এটি রোগ নির্ণয়, ডোজ নির্ধারণ বা চিকিৎসকের বিকল্প নয়। জরুরি অবস্থায় ৯৯৯ কল করুন।"
              : "Educational health guidance & consultation prep grounded in cited sources. Not a medical diagnosis or prescription; call 999 for emergencies."}
          </p>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">Reply Language:</span>
          <div className="inline-flex rounded-full border border-sky-400/30 bg-[#040a18] p-0.5 text-xs font-mono" role="group" aria-label="Chat language mode">
            {(["auto", "bn", "en"] as const).map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`chat-lang-${m}`}
                onClick={() => setLanguageMode(m)}
                className={`min-h-9 px-3 rounded-full cursor-pointer transition ${
                  languageMode === m
                    ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {m === "auto" ? "Auto" : m === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Layout: Conversation Sidebar + Chat Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Conversation History Sidebar */}
        <aside className="lg:col-span-3 ss-sapphire-card rounded-3xl p-4 space-y-3">
          <button
            type="button"
            onClick={startNewChat}
            data-testid="chat-new-conversation-btn"
            className="w-full min-h-11 px-4 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            {locale === "bn" ? "নতুন কথোপকথন" : "New Conversation"}
          </button>

          <div className="text-[11px] font-mono uppercase text-slate-400 pt-1">
            {authenticated
              ? locale === "bn"
                ? "আমার চ্যাট ইতিহাস (SQLite)"
                : "My Chat History (SQLite)"
              : locale === "bn"
                ? "গেস্ট চ্যাট (লগইন ছাড়াই সেভ হয়)"
                : "Guest Chats (No Login Needed)"}
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto overscroll-contain pr-1">
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400">
                {authenticated
                  ? "No saved conversations yet."
                  : "Works without login — start typing or talking right now."}
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 text-xs transition ${
                    activeSessionId === s.id
                      ? "border-sky-400/60 bg-sky-500/15"
                      : "border-white/10 bg-[#040a18]/65 hover:border-white/25"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void openSession(s.id)}
                    data-testid={`chat-session-${s.id}`}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="font-semibold text-white truncate">{s.title}</div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {s.language_mode.toUpperCase()} • {s.message_count ?? 0} msgs
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    data-testid={`delete-session-${s.id}`}
                    onClick={() => void deleteSession(s.id)}
                    className="min-h-8 min-w-8 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 inline-flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Active Chat Thread + Composer */}
        <div className="lg:col-span-9 ss-sapphire-card rounded-3xl p-4 sm:p-5 flex flex-col space-y-4">
          {/* Messages List */}
          <div
            className="space-y-4 min-h-[360px] max-h-[540px] overflow-y-auto overscroll-contain pr-1"
            data-testid="chat-messages-thread"
          >
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-400/30 bg-[#040a18]/65 p-6 text-center space-y-4">
                <Sparkles className="w-8 h-8 text-sky-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-white">
                    {locale === "bn"
                      ? "বাংলা, ইংরেজি বা বাংলিশে স্বাস্থ্য প্রশ্ন করুন"
                      : "Ask Health Questions in বাংলা, English, or Banglish"}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xl mx-auto">
                    Every medical-information answer retrieves from approved sources and displays clickable evidence citations. Unsupported questions produce explicit abstention.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickExamples.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendMessage(q)}
                      className="min-h-10 px-3.5 rounded-full border border-sky-400/35 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs cursor-pointer transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "USER";
                const ttsLang: "bn" | "en" = detectReplyVoiceLanguage(m.content_text);
                return (
                  <div
                    key={m.id}
                    data-testid={`chat-msg-${m.role.toLowerCase()}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 space-y-3 ${
                        isUser
                          ? "bg-gradient-to-br from-sky-500/25 to-teal-500/20 border border-sky-400/40 text-white"
                          : m.grounded_status === "EMERGENCY_ESCALATION"
                          ? "bg-rose-950/60 border border-rose-400/55 text-rose-50"
                          : m.grounded_status === "MODEL_UNAVAILABLE"
                          ? "bg-amber-950/50 border border-amber-400/50 text-amber-50"
                          : "bg-[#040a18]/85 border border-white/15 text-slate-100"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/35 text-indigo-200 font-bold">
                              AI EXPLANATION
                            </span>
                            {m.grounded_status === "GROUNDED" && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 font-bold inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> VERIFIED SOURCE CITED
                              </span>
                            )}
                            {m.grounded_status === "EMERGENCY_ESCALATION" && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/30 border border-rose-300/50 text-rose-100 font-bold inline-flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> URGENT 999 CARE NOTICE
                              </span>
                            )}
                            {m.grounded_status === "ABSTAINED" && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/25 border border-amber-400/40 text-amber-200 font-bold">
                                HONEST ABSTENTION
                              </span>
                            )}
                            {m.grounded_status === "MODEL_UNAVAILABLE" && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/25 border border-rose-400/40 text-rose-200 font-bold">
                                FAILED / MODEL UNAVAILABLE
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400">
                            {m.model_id} • {m.latency_ms} ms
                          </span>
                        </div>
                      )}

                      <SafeMarkdown
                        content={m.content_text}
                        onCitationClick={(num) => {
                          const found = m.citations?.find((c) => c.citation_num === num) || m.citations?.[0];
                          if (found) setActiveCitation(found);
                        }}
                      />

                      {/* Clickable Source Citation Pills */}
                      {!isUser && m.citations && m.citations.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-1.5">
                          <div className="font-mono text-[10px] uppercase text-sky-300">
                            Verified Citations ({m.citations.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.citations.map((c) => (
                              <button
                                key={`${m.id}-${c.citation_num}`}
                                type="button"
                                data-testid={`citation-pill-${c.citation_num}`}
                                onClick={() => setActiveCitation(c)}
                                className="min-h-9 px-2.5 py-1 rounded-xl border border-emerald-400/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-left text-[11px] text-emerald-100 cursor-pointer transition"
                              >
                                <span className="font-mono font-bold text-emerald-300">[{c.citation_num}]</span>{" "}
                                {c.source_title} • <span className="text-slate-300">{c.page_or_section_ref}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Chips */}
                      {!isUser && m.follow_up_questions && m.follow_up_questions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {m.follow_up_questions.map((fq) => (
                            <button
                              key={fq}
                              type="button"
                              onClick={() => void sendMessage(fq)}
                              className="min-h-8 px-2.5 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-[11px] text-slate-200 cursor-pointer"
                            >
                              {fq}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Reply Actions: Copy, TTS Playback, Helpful / Not Helpful */}
                      {!isUser && (
                        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void copyText(m.id, m.content_text)}
                              className="min-h-9 px-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedId === m.id ? "Copied" : "Copy"}
                            </button>
                            <TtsSpeakControl text={m.content_text} language={ttsLang} ttsCapabilities={ttsCaps} />
                          </div>

                          {authenticated && !m.id.startsWith("tmp-") && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label="Helpful"
                                onClick={() => void sendFeedback(m.id, "HELPFUL")}
                                className={`min-h-9 min-w-9 rounded-lg border inline-flex items-center justify-center cursor-pointer ${
                                  m.user_feedback === "HELPFUL"
                                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                                    : "border-white/15 bg-white/5 text-slate-300"
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label="Not Helpful"
                                onClick={() => void sendFeedback(m.id, "NOT_HELPFUL")}
                                className={`min-h-9 min-w-9 rounded-lg border inline-flex items-center justify-center cursor-pointer ${
                                  m.user_feedback === "NOT_HELPFUL"
                                    ? "bg-rose-500/25 border-rose-400 text-rose-200"
                                    : "border-white/15 bg-white/5 text-slate-300"
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          {errorBanner && (
            <div role="alert" className="rounded-xl border border-rose-400/50 bg-rose-950/70 p-3 text-xs text-rose-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          {/* Speaking Auto-Reply Indicator */}
          {speakingReplyNow && (
            <div className="rounded-xl border border-cyan-400/50 bg-cyan-950/60 px-3.5 py-2 flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2 text-cyan-200 font-semibold">
                <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                {locale === "bn" ? "AI উত্তর পড়ে শোনাচ্ছে..." : "Speaking AI response aloud..."}
              </span>
              <button
                type="button"
                onClick={() => {
                  stopGlobalVoiceReply();
                  setSpeakingReplyNow(false);
                }}
                className="min-h-8 px-3 rounded-lg bg-rose-500/25 border border-rose-400/40 text-rose-200 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5" /> Stop Voice
              </button>
            </div>
          )}

          {/* Voice Input (Direct Live + Normal Record & Edit) */}
          <VoiceInputControls
            locale={locale}
            languageMode={languageMode}
            onChangeLanguageMode={setLanguageMode}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
            disabled={sending}
            onSubmitConfirmed={(confirmedText, asrJobId) => {
              void sendMessage(confirmedText, { modality: "VOICE", asrJobId, autoSpeakReply: autoSpeak });
            }}
            onSubmitDirect={(directText, asrJobId) => {
              void sendMessage(directText, { modality: "VOICE", asrJobId, autoSpeakReply: true });
            }}
          />

          {/* Text Input Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(inputText, { modality: "TEXT" });
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              data-testid="chat-text-input"
              placeholder={
                portalMode === "support"
                  ? "Ask about Zero-PHI rules, demo receipts, or rescheduling..."
                  : locale === "bn"
                  ? "বাংলা, English বা Banglish-এ প্রশ্ন লিখুন (যেমন: PCOS er symptoms ki ki?)..."
                  : "Ask in বাংলা, English, or Banglish (e.g. PCOS কী? / PCOS er symptoms ki ki?)..."
              }
              className="flex-1 min-h-12 rounded-2xl border border-sky-400/35 bg-[#040a18] px-4 text-sm text-white placeholder:text-slate-400"
            />
            {sending ? (
              <button
                type="button"
                onClick={cancelInFlight}
                className="min-h-12 px-5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                data-testid="chat-send-btn"
                className="min-h-12 px-6 rounded-2xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {locale === "bn" ? "পাঠান" : "Send"}
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Native <dialog> Citation Source Detail Drawer */}
      <CitationDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}
