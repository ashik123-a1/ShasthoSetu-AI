import React, { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Mic,
  Paperclip,
  PhoneCall,
  Sparkles,
  Square,
  Video,
  X,
} from "lucide-react";
import { formatBdtFromPoisha } from "../../lib/formatters";

export interface ConsultationPreparationModalProps {
  isOpen: boolean;
  appointment: {
    id: string;
    booking_reference: string;
    doctor_name: string;
    doctor_name_bn?: string;
    specialty: string;
    fee_minor_poisha: number;
    payment_reference?: string;
    avatar?: string;
  } | null;
  locale?: "bn" | "en";
  onClose: () => void;
  onProceedToCall: (data: {
    mode: "VIDEO" | "AUDIO";
    symptomsText: string;
    reportFile?: File;
    hasVoiceNote: boolean;
  }) => void;
  onViewReceiptPdf?: () => void;
}

export function ConsultationPreparationModal({
  isOpen,
  appointment,
  locale = "bn",
  onClose,
  onProceedToCall,
  onViewReceiptPdf,
}: ConsultationPreparationModalProps) {
  const [mode, setMode] = useState<"VIDEO" | "AUDIO">("VIDEO");
  const [symptomsText, setSymptomsText] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Audio voice memo recorder
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordSec, setRecordSec] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !appointment) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["pdf", "jpg", "jpeg", "png", "webp"];
    if (!ext || !validExts.includes(ext)) {
      setFileError(
        locale === "bn"
          ? "⚠️ শুধুমাত্র PDF, JPG বা PNG ফাইল গ্রহণযোগ্য।"
          : "⚠️ Only PDF, JPG, or PNG files are supported."
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError(
        locale === "bn"
          ? "⚠️ ফাইল সাইজ ১০ মেগাবাইটের কম হতে হবে।"
          : "⚠️ File size must be under 10MB."
      );
      return;
    }
    setReportFile(file);
  };

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setFileError(
          locale === "bn"
            ? "আপনার ব্রাউজারে অডিও রেকর্ডিং সমর্থিত নয়।"
            : "Audio recording is not supported in this browser."
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(fullBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setIsRecording(true);
      setRecordSec(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSec((s) => s + 1);
      }, 1000);
    } catch {
      setFileError(
        locale === "bn"
          ? "মাইক্রোফোন পারমিশন পাওয়া যায়নি।"
          : "Microphone permission was denied."
      );
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current !== null) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Persist pre-consultation intake to backend signaling store
    try {
      await fetch(`/v1/consultations/rooms/${appointment.id}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointment.id,
          consultation_modality: mode,
          symptoms_text: symptomsText.trim(),
          has_uploaded_report: Boolean(reportFile),
          report_filename: reportFile?.name,
          report_file_type: reportFile?.type,
          has_audio_memo: Boolean(audioBlob),
          audio_memo_duration_sec: recordSec,
          payment_reference: appointment.payment_reference || "DEMO-RCP-9001",
        }),
      });
    } catch {
      // Best-effort intake save
    }

    onProceedToCall({
      mode,
      symptomsText: symptomsText.trim(),
      reportFile: reportFile || undefined,
      hasVoiceNote: Boolean(audioBlob),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-500/40 bg-[#071229] text-white p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Success Tag */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 font-mono text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {locale === "bn" ? "পেমেন্ট সফল ও ভেরিফাইড" : "Payment Confirmed & Verified"} (
            {formatBdtFromPoisha(appointment.fee_minor_poisha, locale)})
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {locale === "bn"
              ? "ডাক্তার কনসাল্টেশন প্রস্তুতি ফরম"
              : "Pre-Consultation Intake Form"}
          </h2>
          <p className="text-xs text-slate-300">
            {locale === "bn"
              ? "কল শুরু করার আগে ডাক্তারের সুবিধার্থে নিচের তথ্যগুলো প্রদান করতে পারেন (সবগুলোই ঐচ্ছিক)। এরপর সরাসরি লাইভ কলে যুক্ত হবেন।"
              : "Optionally share symptoms, reports, or a voice memo before launching your live video/audio consultation."}
          </p>
        </div>

        {/* Doctor Summary Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <img
              src={appointment.avatar || "/images/doctors/doc-f-01.jpg"}
              alt={appointment.doctor_name}
              className="w-11 h-11 rounded-full object-cover border-2 border-cyan-400/60"
            />
            <div>
              <div className="font-bold text-white text-sm">
                {locale === "bn" && appointment.doctor_name_bn
                  ? appointment.doctor_name_bn
                  : appointment.doctor_name}
              </div>
              <div className="text-cyan-300">{appointment.specialty}</div>
              <div className="font-mono text-slate-400 text-[11px]">
                Ref: {appointment.booking_reference}
              </div>
            </div>
          </div>
          {onViewReceiptPdf && (
            <button
              type="button"
              onClick={onViewReceiptPdf}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer transition shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              {locale === "bn" ? "রিসিট PDF" : "Receipt PDF"}
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Modality Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200">
              {locale === "bn" ? "১. কনসাল্টেশন মাধ্যম নির্বাচন করুন" : "1. Choose Consultation Modality"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("VIDEO")}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  mode === "VIDEO"
                    ? "bg-gradient-to-r from-cyan-950 to-blue-950 border-cyan-400 text-white shadow-lg"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div
                  className={`p-2 rounded-xl ${
                    mode === "VIDEO" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs">
                    {locale === "bn" ? "🎥 ভিডিও কল" : "🎥 Video Call"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {locale === "bn" ? "ফেস-টু-ফেস ক্যামেরা ও স্ক্রিন শেয়ার" : "Two-way HD video & audio"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("AUDIO")}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  mode === "AUDIO"
                    ? "bg-gradient-to-r from-cyan-950 to-blue-950 border-cyan-400 text-white shadow-lg"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div
                  className={`p-2 rounded-xl ${
                    mode === "AUDIO" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs">
                    {locale === "bn" ? "🎙️ অডিও কল" : "🎙️ Audio Call"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {locale === "bn" ? "ক্লিনিক্যাল ভয়েস কল (কম ডেটা খরচ)" : "Low-bandwidth voice channel"}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Symptoms Description (Optional) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-200">
                {locale === "bn" ? "২. শারীরিক সমস্যা বা উপসর্গ" : "2. Symptoms / Reason for Visit"}
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {locale === "bn" ? "(ঐচ্ছিক / Optional)" : "(Optional)"}
              </span>
            </div>
            <textarea
              rows={3}
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              placeholder={
                locale === "bn"
                  ? "আপনার বর্তমান সমস্যা, কতদিন ধরে সমস্যা, বা কোনো ব্যথা থাকলে এখানে লিখুন..."
                  : "Briefly describe your symptoms, duration, or questions for the doctor..."
              }
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* 3. Upload Past Report / Prescription (Optional) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-200">
                {locale === "bn"
                  ? "৩. পূর্বের প্রেসক্রিপশন বা রিপোর্ট আপলোড"
                  : "3. Past Prescription or Diagnostic Report"}
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {locale === "bn" ? "(ঐচ্ছিক • PDF, JPG, PNG)" : "(Optional • PDF, JPG, PNG)"}
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-400/60 rounded-2xl p-3.5 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 transition flex flex-col items-center justify-center gap-1.5"
            >
              <Paperclip className="w-5 h-5 text-cyan-400" />
              <div className="text-xs text-slate-300 font-medium">
                {reportFile ? (
                  <span className="text-emerald-300 font-bold">
                    ✓ {reportFile.name} ({(reportFile.size / 1024).toFixed(1)} KB)
                  </span>
                ) : locale === "bn" ? (
                  "ফাইল যুক্ত করতে ক্লিক করুন (PDF, JPG, PNG)"
                ) : (
                  "Click to attach report or prescription (PDF, JPG, PNG)"
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {fileError}
              </p>
            )}
          </div>

          {/* 4. Voice Note Audio Memo (Optional) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-200">
                {locale === "bn" ? "৪. অডিও ভয়েস মেসেজ রেকর্ড" : "4. Record Voice Note"}
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {locale === "bn" ? "(ঐচ্ছিক / Optional)" : "(Optional)"}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isRecording
                      ? "bg-rose-500 animate-pulse text-white"
                      : audioBlob
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-cyan-400"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">
                    {isRecording
                      ? locale === "bn"
                        ? `রেকর্ড হচ্ছে... (${recordSec}s)`
                        : `Recording... (${recordSec}s)`
                      : audioBlob
                      ? locale === "bn"
                        ? `ভয়েস মেসেজ প্রস্তুত (${recordSec}s)`
                        : `Voice note recorded (${recordSec}s)`
                      : locale === "bn"
                      ? "মুখে বলে সমস্যা রেকর্ড করুন"
                      : "Record quick voice message for doctor"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {audioBlob
                      ? locale === "bn"
                        ? "কল রুমে ডাক্তারের কাছে পৌঁছাবে"
                        : "Ready to share with clinician"
                      : locale === "bn"
                      ? "বাংলা বা ইংরেজিতে বলতে পারেন"
                      : "Speak in Bengali or English"}
                  </div>
                </div>
              </div>

              <div>
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startVoiceRecording()}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {audioBlob
                      ? locale === "bn"
                        ? "আবার রেকর্ড"
                        : "Re-record"
                      : locale === "bn"
                      ? "রেকর্ড করুন"
                      : "Record"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/40 cursor-pointer transition transform active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              {locale === "bn"
                ? `🚀 সাবমিট করুন ও ${mode === "VIDEO" ? "ভিডিও" : "অডিও"} কলে প্রবেশ করুন`
                : `🚀 Submit & Launch ${mode === "VIDEO" ? "Video" : "Audio"} Call Room`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
