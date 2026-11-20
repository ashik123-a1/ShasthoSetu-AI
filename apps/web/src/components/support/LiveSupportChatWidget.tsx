import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Headphones,
  LifeBuoy,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useI18n } from "../../lib/i18n";
import { formatDhakaDateTime } from "../../lib/formatters";
import { StatusBadge, useToast } from "../ui";
import { playNotificationSound } from "../../utils/soundEffects";

export interface TicketSummary {
  id: string;
  ticket_number: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  created_at_utc: string;
}

export interface ChatMessage {
  id: string;
  sender_role: string;
  body_text: string;
  sender_name?: string;
  created_at_utc: string;
  isBot?: boolean;
  isSystem?: boolean;
}

interface LiveSupportChatWidgetProps {
  tickets: TicketSummary[];
  onRefresh?: () => Promise<void> | void;
}

export function LiveSupportChatWidget({
  tickets,
  onRefresh,
}: LiveSupportChatWidgetProps) {
  const { locale } = useI18n();
  const { pushToast } = useToast();

  const [selectedTicketId, setSelectedTicketId] = useState<string>(() => {
    return tickets[0]?.id || "";
  });
  const [tabFilter, setTabFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ACTIVE");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");

  // Agent Presence Simulation State
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentJoining, setAgentJoining] = useState(false);
  const agentName = "ফারহান রহমান (Support Officer Farhan)";

  // New Ticket Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCategory, setNewCategory] = useState("DEMO_PAYMENT");
  const [newSubject, setNewSubject] = useState("");
  const [newInitialMsg, setNewInitialMsg] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (tabFilter === "ACTIVE") return t.status !== "RESOLVED" && t.status !== "CLOSED";
    if (tabFilter === "RESOLVED") return t.status === "RESOLVED" || t.status === "CLOSED";
    return true;
  });

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  // Load messages for selected ticket
  const loadTicketMessages = useCallback(async (ticketId: string) => {
    if (!ticketId) return;
    setLoadingMsgs(true);
    try {
      const res = await apiGet<{
        ticket: TicketSummary;
        messages: Array<{
          id: string;
          sender_role: string;
          body_text: string;
          sender_name?: string;
          created_at_utc: string;
        }>;
      }>(`/v1/patient/tickets/${ticketId}`);

      const mapped: ChatMessage[] = (res.messages || []).map((m) => ({
        id: m.id,
        sender_role: m.sender_role,
        body_text: m.body_text,
        sender_name: m.sender_name || (m.sender_role === "SUPPORT" ? "সাপোর্ট অফিসার ফারহান" : "আমি (রোগী)"),
        created_at_utc: m.created_at_utc,
        isBot: m.body_text.startsWith("[স্বয়ংক্রিয় উত্তর]") || m.body_text.includes("AI Bot"),
        isSystem: m.body_text.startsWith("🟢") || m.body_text.startsWith("ℹ️"),
      }));

      // Check if a human support officer previously answered in this ticket
      const hasSupportReplies = mapped.some((m) => m.sender_role === "SUPPORT");
      setAgentOnline(hasSupportReplies);
      setMessages(mapped);
    } catch {
      pushToast({
        title: locale === "bn" ? "মেসেজ লোড করা যায়নি" : "Failed to load chat messages",
        tone: "danger",
      });
    } finally {
      setLoadingMsgs(false);
      setTimeout(scrollToBottom, 150);
    }
  }, [locale, pushToast]);

  useEffect(() => {
    if (selectedTicketId) {
      void loadTicketMessages(selectedTicketId);
    } else if (tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [selectedTicketId, tickets, loadTicketMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect human agent
  const handleConnectHumanAgent = () => {
    if (agentOnline || agentJoining) return;
    setAgentJoining(true);

    setTimeout(() => {
      setAgentOnline(true);
      setAgentJoining(false);

      const joinSysMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender_role: "SYSTEM",
        sender_name: "System",
        body_text: "🟢 সাপোর্ট অফিসার ফারহান চ্যাটে যুক্ত হয়েছেন (Support Officer Farhan joined the chat)",
        created_at_utc: new Date().toISOString(),
        isSystem: true,
      };

      const agentHelloMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender_role: "SUPPORT",
        sender_name: agentName,
        body_text:
          locale === "bn"
            ? `আসসালামু আলাইকুম! আমি স্বাস্থ্যসেতু সাপোর্ট অফিসার ফারহান। বর্তমানে সব ডেস্ক ব্যস্ত থাকায় কিছুটা সময় নিয়েছি। আপনার টিকিট (${activeTicket?.ticket_number || ""}) সংক্রান্ত বিষয়ে আমি কিভাবে সাহায্য করতে পারি?`
            : `Hello! I am Farhan, ShasthoSetu Support Desk Officer. Apologies for the brief queue delay. How can I assist you today regarding ticket ${activeTicket?.ticket_number || ""}?`,
        created_at_utc: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, joinSysMsg, agentHelloMsg]);
      playNotificationSound();
      pushToast({
        title: locale === "bn" ? "সাপোর্ট অফিসার চ্যাটে যোগ দিয়েছেন" : "Support Officer joined the chat",
        tone: "success",
      });
    }, 900);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeTicket || sending) return;

    setSending(true);
    setInputText("");

    const tempUserMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender_role: "PATIENT",
      sender_name: locale === "bn" ? "আমি (রোগী)" : "You (Patient)",
      body_text: text,
      created_at_utc: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await apiPost(`/v1/patient/tickets/${activeTicket.id}/reply`, {
        body_text: text,
      });

      // If no human agent is online, the AI Support Bot replies automatically with busy notification
      if (!agentOnline) {
        setTimeout(() => {
          let botReplyText = "";
          const lower = text.toLowerCase();

          if (lower.includes("payment") || lower.includes("রসিদ") || lower.includes("পেমেন্ট") || lower.includes("receipt") || lower.includes("টাকা")) {
            botReplyText =
              locale === "bn"
                ? "আমাদের সকল সাপোর্ট এজেন্ট বর্তমানে অন্য রোগীদের সহায়তায় ব্যস্ত রয়েছেন। [স্বয়ংক্রিয় উত্তর]: আপনার ডেমো পেমেন্ট ও ডিজিটাল রসিদ দেখতে 'পেমেন্ট ও রিসিপ্ট' ট্যাবে যান। সেখানে প্রতিটি লেনদেনের জন্য অফিশিয়াল মেডিকেল প্রেসক্রিপশন ও ক্যাশ মেমো PDF সংরক্ষিত থাকে। মানব সহায়তার জন্য উপরে 'সাপোর্ট অফিসার যুক্ত করুন' বাটনে চাপুন।"
                : "All our human support desks are currently engaged. [Automated Bot]: You can inspect or print verified medical payment receipts under 'Demo Payments & Receipts'. For human desk assistance, click 'Connect Human Agent' above.";
          } else if (lower.includes("doctor") || lower.includes("ডাক্তার") || lower.includes("স্লট") || lower.includes("appointment")) {
            botReplyText =
              locale === "bn"
                ? "আমাদের সকল সাপোর্ট এজেন্ট বর্তমানে অন্য রোগীদের সহায়তায় ব্যস্ত রয়েছেন। [স্বয়ংক্রিয় উত্তর]: আপনার ডাক্তার অ্যাপয়েন্টমেন্ট শিডিউল পরিবর্তন বা নতুন স্লট বুক করতে 'Find Doctors' সেকশনে যান। সেখানে ৪৩ জন অনুমোদিত বিশেষজ্ঞ চিকিৎসকের লাইভ কনসালটেশন স্লট উপলব্ধ রয়েছে।"
                : "All support officers are currently busy assisting other patients. [Automated Bot]: To reschedule or book a doctor slot, visit Find Doctors where 43 verified specialists have open video/clinic slots.";
          } else if (lower.includes("prescription") || lower.includes("প্রেসক্রিপশন") || lower.includes("ocr")) {
            botReplyText =
              locale === "bn"
                ? "আমাদের সকল সাপোর্ট এজেন্ট বর্তমানে অন্য রোগীদের সহায়তায় ব্যস্ত রয়েছেন। [স্বয়ংক্রিয় উত্তর]: প্রেসক্রিপশন ভল্ট এবং নতুন প্রেসক্রিপশন স্ক্যান করতে 'Prescription OCR' সেকশনে ভিজিট করুন। সেখানে বাংলা ও ইংরেজি প্রেসক্রিপশনের ওষুধ শনাক্তকরণ সুবিধা রয়েছে।"
                : "Our human agents are currently busy. [Automated Bot]: Check the Prescription OCR section to upload or review digital prescription vault archives.";
          } else {
            botReplyText =
              locale === "bn"
                ? "আমাদের সকল মানবিক সাপোর্ট এজেন্ট বর্তমানে অন্য রোগীদের সহায়তায় ব্যস্ত রয়েছেন। আপনি সিরিয়ালে ১ নম্বরে আছেন। আমি স্বাস্থ্যসেতু সহায়তা বট—আপনার মেসেজটি কিউতে জমা করা হয়েছে। আপনি চাইলে উপরের বাটনে ক্লিক করে লাইভ এজেন্ট রিকোয়েস্ট পাঠাতে পারেন।"
                : "All human support officers are currently busy assisting other patients. You are #1 in queue. I am the ShasthoSetu Support Bot—your query is logged. You may click 'Connect Human Agent' above to request live pickup.";
          }

          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender_role: "BOT",
            sender_name: "স্বাস্থ্যসেতু এআই সহায়তা বট (AI Assistant)",
            body_text: botReplyText,
            created_at_utc: new Date().toISOString(),
            isBot: true,
          };

          setMessages((prev) => [...prev, botMsg]);
          playNotificationSound();
        }, 800);
      }
    } catch {
      pushToast({
        title: locale === "bn" ? "মেসেজ পাঠানো যায়নি" : "Failed to send message",
        tone: "danger",
      });
    } finally {
      setSending(false);
    }
  };

  // Create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMsg.trim()) return;

    setCreatingTicket(true);
    try {
      await apiPost("/v1/patient/tickets", {
        category: newCategory,
        subject: newSubject.trim(),
        message: newInitialMsg.trim(),
      });

      pushToast({
        title: locale === "bn" ? "নতুন সাপোর্ট টিকিট তৈরি হয়েছে" : "Support ticket created successfully",
        tone: "success",
      });

      setShowNewModal(false);
      setNewSubject("");
      setNewInitialMsg("");

      if (onRefresh) {
        await onRefresh();
      }
    } catch {
      pushToast({
        title: locale === "bn" ? "টিকিট তৈরি ব্যর্থ হয়েছে" : "Failed to create support ticket",
        tone: "danger",
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  const QUICK_PROMPTS = [
    locale === "bn" ? "পেমেন্ট রসিদ কোথায় পাব?" : "Where can I download my payment receipt?",
    locale === "bn" ? "ডাক্তার স্লট পরিবর্তন করতে চাই" : "How do I change my doctor appointment slot?",
    locale === "bn" ? "শিশু টিকা শিডিউল সম্পর্কে জানতে চাই" : "Tell me about child vaccine schedules",
    locale === "bn" ? "সরাসরি মানব এজেন্ট কানেক্ট করুন" : "Please connect me to a human support agent",
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner with Zero-PHI Safety Reminder */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <LifeBuoy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              {locale === "bn" ? "লাইভ সাপোর্ট ডেস্ক ও টিকেট চ্যাট" : "Live Support Desk & Interactive Ticket Chat"}
            </h3>
            <p className="text-slate-400 text-[11px]">
              {locale === "bn"
                ? "বুকিং, ডেমো পেমেন্ট ও প্ল্যাটফর্ম টেকনিক্যাল সহায়তায় ২৪/৭ চ্যাট সাপোর্ট"
                : "24/7 dedicated support for appointments, demo payments, and platform navigation"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="min-h-9 px-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{locale === "bn" ? "নতুন সাপোর্ট চ্যাট খুলুন" : "+ New Support Chat"}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Live Support Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[620px]">
        {/* LEFT COLUMN (4 cols): Conversations / Ticket History Inbox */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <span className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              {locale === "bn" ? "সাপোর্ট ইনবক্স" : "Support Inbox"} ({filteredTickets.length})
            </span>

            {/* Filter Tabs */}
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setTabFilter("ACTIVE")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  tabFilter === "ACTIVE" ? "bg-cyan-500/25 text-cyan-300 font-bold" : "text-slate-400"
                }`}
              >
                {locale === "bn" ? "চলমান" : "Active"}
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("RESOLVED")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  tabFilter === "RESOLVED" ? "bg-cyan-500/25 text-cyan-300 font-bold" : "text-slate-400"
                }`}
              >
                {locale === "bn" ? "ইতিহাস" : "History"}
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("ALL")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  tabFilter === "ALL" ? "bg-cyan-500/25 text-cyan-300 font-bold" : "text-slate-400"
                }`}
              >
                {locale === "bn" ? "সকল" : "All"}
              </button>
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[520px] pr-1">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p>{locale === "bn" ? "এই ট্যাবে কোনো টিকিট নেই।" : "No tickets in this tab."}</p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/15 shadow-sm"
                        : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        {t.ticket_number}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                      {t.subject}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono">{t.category}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDhakaDateTime(t.created_at_utc, locale)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (8 cols): Interactive Live Chat Thread */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/90 flex flex-col overflow-clip shadow-xl">
          {activeTicket ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-cyan-400">
                        {activeTicket.ticket_number}
                      </span>
                      <StatusBadge status={activeTicket.status} />
                    </div>
                    <h4 className="font-bold text-sm text-white truncate max-w-md">
                      {activeTicket.subject}
                    </h4>
                  </div>
                </div>

                {/* Agent Presence Pill & Action */}
                <div className="flex items-center gap-2.5">
                  {agentOnline ? (
                    <div className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{locale === "bn" ? "সাপোর্ট অফিসার যুক্ত আছেন" : "Support Officer Live"}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>{locale === "bn" ? "সব ডেস্ক ব্যস্ত • বট সক্রিয়" : "Agents Busy • AI Bot Active"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleConnectHumanAgent}
                        disabled={agentJoining}
                        className="min-h-8 px-2.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>
                          {agentJoining
                            ? locale === "bn"
                              ? "যুক্ত হচ্ছেন..."
                              : "Connecting..."
                            : locale === "bn"
                            ? "মানব অফিসার চাই"
                            : "Connect Officer"}
                        </span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void loadTicketMessages(activeTicket.id)}
                    title="Refresh chat"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition border border-slate-800"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMsgs ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Message Thread Area */}
              <div className="flex-1 p-4 overflow-y-auto max-h-[460px] min-h-[340px] space-y-3.5 bg-gradient-to-b from-slate-950/60 to-slate-950">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="text-center py-14 text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>{locale === "bn" ? "মেসেজ লোড হচ্ছে..." : "Loading chat messages..."}</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 space-y-2">
                    <LifeBuoy className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>{locale === "bn" ? "এই চ্যাটে কোনো মেসেজ নেই। নিচে আপনার প্রশ্ন লিখুন।" : "No messages yet. Send a message below to start."}</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    // System Notification Pill
                    if (m.isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-2">
                          <span className="px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/35 text-cyan-300 text-[11px] font-mono font-medium">
                            {m.body_text}
                          </span>
                        </div>
                      );
                    }

                    const isUser = m.sender_role === "PATIENT";
                    const isBot = m.isBot || m.sender_role === "BOT";

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 items-end ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isUser && (
                          <div
                            className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                              isBot
                                ? "bg-purple-950 border border-purple-500/40 text-purple-300"
                                : "bg-cyan-950 border border-cyan-500/40 text-cyan-300"
                            }`}
                          >
                            {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-md space-y-1 ${
                            isUser
                              ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-br-none"
                              : isBot
                              ? "bg-slate-900 border border-purple-500/35 text-slate-200 rounded-bl-none"
                              : "bg-slate-900 border border-cyan-500/35 text-slate-200 rounded-bl-none"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] font-mono opacity-80 border-b border-white/10 pb-1">
                            <span className="font-bold flex items-center gap-1">
                              {isBot && <Sparkles className="w-2.5 h-2.5 text-purple-400" />}
                              {m.sender_name || (isUser ? "আমি (রোগী)" : "সাপোর্ট অফিসার")}
                            </span>
                            <span>{formatDhakaDateTime(m.created_at_utc, locale)}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{m.body_text}</p>
                        </div>

                        {isUser && (
                          <div className="w-7 h-7 rounded-lg shrink-0 bg-sky-950 border border-sky-400/40 flex items-center justify-center text-sky-300 text-xs font-bold">
                            <UserCheck className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
                  {locale === "bn" ? "দ্রুত প্রশ্ন:" : "Quick:"}
                </span>
                {QUICK_PROMPTS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (q.includes("মানব") || q.includes("human")) {
                        handleConnectHumanAgent();
                      } else {
                        void handleSendMessage(q);
                      }
                    }}
                    className="min-h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700 shrink-0 cursor-pointer transition text-[11px]"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendMessage();
                }}
                className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    locale === "bn"
                      ? "আপনার প্রশ্ন বা সমস্যা লিখুন (যেমন: পেমেন্ট রসিদ, ডাক্তার শিডিউল)..."
                      : "Type your support message (e.g. payment receipt, doctor slot)..."
                  }
                  className="flex-1 min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="min-h-11 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{locale === "bn" ? "পাঠান" : "Send"}</span>
                </button>
              </form>

              {/* Zero-PHI Safety Footer */}
              <div className="px-4 py-1.5 border-t border-slate-900 bg-slate-950 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1 text-teal-400/80">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Zero-PHI Safe Desk • Non-clinical technical support only</span>
                </span>
                <span>Audit logged per ShasthoSetu Security Protocol</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <LifeBuoy className="w-12 h-12 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-200">
                {locale === "bn" ? "কোনো টিকিট নির্বাচিত নেই" : "No Support Conversation Selected"}
              </h3>
              <p className="text-xs max-w-sm text-slate-400">
                {locale === "bn"
                  ? "বামপাশের তালিকা থেকে একটি কথোপকথন বাছাই করুন অথবা নতুন সাপোর্ট চ্যাট শুরু করুন।"
                  : "Select a ticket conversation from the left inbox or start a new support chat."}
              </p>
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="min-h-9 px-4 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{locale === "bn" ? "নতুন চ্যাট শুরু করুন" : "Start New Chat"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">
                  {locale === "bn" ? "নতুন সাপোর্ট চ্যাট শুরু করুন" : "Open New Support Chat"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {locale === "bn" ? "সমস্যার ধরন (Category)" : "Category"}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="DEMO_PAYMENT">Demo Payment &amp; Receipts</option>
                  <option value="DOCTOR_APPOINTMENT">Doctor Appointment &amp; Video Call</option>
                  <option value="PRESCRIPTION_OCR">Prescription OCR &amp; Health Records</option>
                  <option value="GENERAL">General Platform Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {locale === "bn" ? "বিষয় (Subject)" : "Subject"}
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder={
                    locale === "bn"
                      ? "যেমন: পেমেন্ট রসিদ ডাউনলোড সংক্রান্ত সহায়তা"
                      : "e.g. Assistance with receipt download"
                  }
                  className="w-full min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {locale === "bn" ? "বিস্তারিত বার্তা (Message)" : "Detailed Message"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  placeholder={
                    locale === "bn"
                      ? "আপনার সমস্যার সংক্ষিপ্ত বিবরণ দিন (সংবেদনশীল ব্যক্তিগত স্বাস্থ্য তথ্য এড়িয়ে চলুন)..."
                      : "Describe your question or issue (avoid clinical PHI)..."
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {locale === "bn"
                    ? "সাপোর্ট এজেন্টরা চিকিৎসাগত রোগ নির্ণয় করতে পারেন না। যেকোনো চিকিৎসা পরামর্শের জন্য অনুমোদিত বিশেষজ্ঞ ডাক্তারের অ্যাপয়েন্টমেন্ট নিন।"
                    : "Support agents cannot provide clinical diagnoses. For medical triage, book a verified doctor consultation."}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="min-h-10 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  {locale === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="min-h-10 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {creatingTicket
                      ? locale === "bn"
                        ? "তৈরি হচ্ছে..."
                        : "Creating..."
                      : locale === "bn"
                      ? "চ্যাট শুরু করুন"
                      : "Start Chat"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
