import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CameraOff, CheckCircle2, Mic, MicOff, ShieldAlert, Video } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export function LocalDevicePreviewCard({ darkCard = true }: { darkCard?: boolean }) {
  const { locale } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camActive, setCamActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [deviceNote, setDeviceNote] = useState("");

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, []);

  const toggleCameraPreview = async () => {
    if (camActive && streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamActive(false);
      setDeviceNote(locale === "bn" ? "স্থানীয় ডিভাইস প্রিভিউ বন্ধ করা হয়েছে।" : "Local camera preview stopped.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setDeviceNote(
        locale === "bn"
          ? "এই ব্রাউজারে ক্যামেরা API নেই — কেবল ডেমো প্রিভিউ কার্ড প্রদর্শিত হচ্ছে।"
          : "Camera API unavailable in this environment; showing simulated device card."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamActive(true);
      setDeviceNote(
        locale === "bn"
          ? "স্থানীয় ডিভাইস প্রিভিউ সক্রিয় (কোনো ডেটা সার্ভারে পাঠানো হচ্ছে না)।"
          : "Local device preview running strictly on your browser (no video transmitted)."
      );
    } catch {
      setDeviceNote(
        locale === "bn"
          ? "ক্যামেরা/মাইক্রোফোন অনুমতি পাওয়া যায়নি — বিকল্প ডেমো প্রিভিউ দেখানো হচ্ছে।"
          : "Camera/mic permission unavailable or denied — displaying safe simulated preview."
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 rounded-3xl border border-sky-400/25 bg-[#040a18]/90 text-white p-5 space-y-4">
        <div className="relative aspect-video rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${camActive ? "block" : "hidden"}`} />
          {!camActive && (
            <div className="text-center p-6 space-y-2">
              <Video className="w-12 h-12 mx-auto text-emerald-400" />
              <p className="font-semibold text-base">LOCAL DEVICE PREVIEW / DEMO</p>
              <p className="text-xs text-slate-400 max-w-sm">
                {locale === "bn"
                  ? "ডিভাইস পরীক্ষা করতে নিচের 'ক্যামেরা প্রিভিউ' বোতামে ক্লিক করুন।"
                  : "Click Start Local Camera Test below to verify camera and microphone readiness locally."}
              </p>
            </div>
          )}
          <span className="absolute top-3 left-3 text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/60 border border-white/20 text-emerald-300">
            SIMULATED / NON-CLINICAL ROOM
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void toggleCameraPreview()}
            className="min-h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            {camActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {camActive ? (locale === "bn" ? "প্রিভিউ বন্ধ করুন" : "Stop Local Preview") : (locale === "bn" ? "ক্যামেরা প্রিভিউ শুরু করুন" : "Start Local Camera Test")}
          </button>
          <button
            type="button"
            onClick={() => setMicMuted((m) => !m)}
            className="min-h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            {micMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            {micMuted ? "Mic Muted" : "Mic Ready"}
          </button>
          <Link
            to="/find-care"
            className="min-h-11 px-4 rounded-xl bg-sky-400/20 border border-sky-400/40 text-sky-200 text-xs font-semibold inline-flex items-center"
          >
            {locale === "bn" ? "ডাক্তার বুক করুন" : "Book Doctor Slot →"}
          </Link>
        </div>
        {deviceNote && <p className="text-xs text-emerald-200">{deviceNote}</p>}
      </div>

      <div
        className={`lg:col-span-5 rounded-3xl p-6 space-y-4 ${
          darkCard
            ? "ss-sapphire-card text-white"
            : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
        }`}
      >
        <h3 className="text-xl font-bold">
          {locale === "bn" ? "পরামর্শ ও ফলো-আপ কর্মপ্রবাহ" : "Consultation & Follow-Up Flow"}
        </h3>
        <ul className={`space-y-3 text-sm ${darkCard ? "text-slate-300" : "text-[var(--color-text-muted)]"}`}>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Select an Admin-approved doctor and reserve an atomic Asia/Dhaka slot (BEGIN IMMEDIATE lock).</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Complete simulated bKash/Nagad/Card checkout to receive a watermarked demo receipt.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Doctor reviews consented PHR & AI drafts, saves a SIGNED note, and issues a demo e-Prescription.</span>
          </li>
        </ul>
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/35 text-xs flex items-start gap-2 text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>Emergency symptoms (chest pain, convulsions, severe shortness of breath) require immediate physical emergency care, not online scheduling.</span>
        </div>
      </div>
    </div>
  );
}
