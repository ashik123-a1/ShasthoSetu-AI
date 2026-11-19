import { useState } from "react";
import { Droplet, Copy, Check, MapPin } from "lucide-react";
import { useI18n } from "../../lib/i18n";

interface BloodUrgencyShareProps {
  bloodGroup?: string;
  hospital?: string;
  division?: string;
  maskedPhone?: string;
  urgencyLevel?: "CRITICAL" | "URGENT" | "STANDARD";
}

export function BloodUrgencyShareCard({
  bloodGroup = "O+",
  hospital = "Dhaka Medical College Hospital",
  division = "Dhaka",
  maskedPhone = "+880 17•• •••12",
  urgencyLevel = "CRITICAL",
}: BloodUrgencyShareProps) {
  const { locale } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `[জরুরি রক্তের আবেদন / Emergency Blood Request]\nরক্তের গ্রুপ: ${bloodGroup}\nহাসপাতাল: ${hospital} (${division})\nযোগাযোগ: ${maskedPhone}\nস্বাস্থ্যসেতু ব্লাড কানেক্টের মাধ্যমে সংগৃহীত।`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="ai-tool-blood-urgency-share"
      className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-rose-950/40 border border-rose-500/40 shadow-lg text-slate-100 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-300">
            <Droplet className="w-4 h-4 fill-rose-500" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">
              {locale === "bn" ? "জরুরি রক্তদাতা শেয়ার কার্ড" : "Emergency Blood Share Card"}
            </h4>
            <p className="text-[10px] text-rose-300/80 font-mono">
              {locale === "bn" ? "v0-ডিজাইন এআই উইজেট" : "v0.dev-Assisted Component"}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-900/60 border border-rose-500 text-rose-200 animate-pulse">
          {urgencyLevel}
        </span>
      </div>

      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">{locale === "bn" ? "প্রয়োজনীয় গ্রুপ" : "Blood Group"}:</span>
          <span className="text-base font-black text-rose-400 font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800">
            {bloodGroup}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">{hospital}, {division}</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span>{locale === "bn" ? "নিরাপদ যোগাযোগ" : "Masked Phone"}:</span>
          <span className="text-cyan-300">{maskedPhone}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied
            ? locale === "bn"
              ? "কপি সম্পন্ন"
              : "Copied Link"
            : locale === "bn"
              ? "জরুরি কার্ড কপি করুন"
              : "Copy Request"}
        </button>
      </div>
    </div>
  );
}
