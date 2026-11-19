import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CameraOff, CheckCircle2, Mic, MicOff, ShieldAlert, Video } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";

export function PublicConsultationsPage() {
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
      setDeviceNote(locale === "bn" ? "স্থানীয় ডিভাইস প্রিভিউ সক্রিয় (কোনো ডেটা সার্ভারে পাঠানো হচ্ছে না)।" : "Local device preview running strictly on your browser (no video transmitted).");
    } catch {
      setDeviceNote(
        locale === "bn"
          ? "ক্যামেরা/মাইক্রোফোন অনুমতি পাওয়া যায়নি — বিকল্প ডেমো প্রিভিউ দেখানো হচ্ছে।"
          : "Camera/mic permission unavailable or denied — displaying safe simulated preview."
      );
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24 overflow-x-clip">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-doctors-consult.jpg" mode="adaptive" />
      <PublicFloatingHeader />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 mb-2">
              LOCAL DEVICE PREVIEW / DEMO CONSULTATION ROOM
            </span>
            <h1 className="text-3xl font-bold">
              {locale === "bn" ? "টেলিমেডিসিন পরামর্শ ও ডিভাইস পরীক্ষা" : "Consultations & Local Device Preview"}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {locale === "bn"
                ? "বাস্তব অ্যাপয়েন্টমেন্টের পূর্বে আপনার ক্যামেরা ও মাইক্রোফোন পরীক্ষা করুন। কোনো রিয়েল-টাইম কল ডেটা রেকর্ড বা স্ট্রিম করা হয় না।"
                : "Test local audio/video readiness safely. Remote live clinical video requires a scheduled external telehealth relay (not mocked as live)."}
            </p>
          </div>
          <Link to="/doctors" className="min-h-11 px-5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm inline-flex items-center">
            {locale === "bn" ? "ডাক্তার বুক করুন" : "Book a Doctor Slot"}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-3xl border border-[var(--color-border)] bg-slate-950 text-white p-5 space-y-4">
            <div className="relative aspect-video rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${camActive ? "block" : "hidden"}`} />
              {!camActive && (
                <div className="text-center p-6 space-y-2">
                  <Video className="w-12 h-12 mx-auto text-emerald-400" />
                  <p className="font-semibold text-base">LOCAL DEVICE PREVIEW / DEMO</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {locale === "bn"
                      ? "ডিভাইস পরীক্ষা করতে নিচের 'ক্যামেরা প্রিভিউ' বোতামে ক্লিক করুন।"
                      : "Click Start Local Preview below to verify camera and microphone readiness locally."}
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
            </div>
            {deviceNote && <p className="text-xs text-emerald-200">{deviceNote}</p>}
          </div>

          <div className="lg:col-span-5 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
            <h2 className="text-xl font-bold">
              {locale === "bn" ? "পরামর্শের ধাপসমূহ" : "How ShasthoSetu Consultations Work"}
            </h2>
            <ul className="space-y-3 text-sm text-[var(--color-text-muted)]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Select an Admin-approved doctor and reserve an atomic Asia/Dhaka time slot.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Complete simulated bKash/Nagad/Card checkout to receive a watermarked demo receipt.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Doctor reviews consented PHR documents, saves a SIGNED note, and issues a signed demo e-Prescription.</span>
              </li>
            </ul>
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Emergency symptoms (chest pain, convulsions, severe shortness of breath) require immediate physical emergency hospital care, not online scheduling.</span>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
