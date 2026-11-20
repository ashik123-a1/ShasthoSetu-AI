import { useState } from "react";
import { Check, Copy, Github, Mail, Phone, Sparkles, Users } from "lucide-react";
import { OFFICIAL_TEAM_MEMBERS, TEAM_INFO } from "../../data/teamData";
import { useI18n } from "../../lib/i18n";
import { TeamRosterModal } from "./TeamRosterModal";

export function HomepageTeamSection() {
  const { locale } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <section id="team" className="relative overflow-hidden py-16 px-4 sm:px-6 border-b border-sky-400/20">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>CORE ARCHITECTS &amp; PROJECT TEAM</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {locale === "bn" ? "স্বাস্থ্যসেতু এআই — প্রধান প্রকৌশলী ও টিম ডিরেক্টরি" : "Official Project Team & Engineering Leadership"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {locale === "bn"
                ? "বাংলাদেশের ১৭ কোটি মানুষের ডিজিটাল স্বাস্থ্যসেবা নিশ্চিত করতে ডেডিকেটেড ইঞ্জিনিয়ারিং টিম।"
                : "Multidisciplinary engineering team building AI-grounded telemedicine, Whisper speech pipelines, and verifiable Safe-OCR."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={TEAM_INFO.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 px-5 rounded-full border border-slate-600/80 bg-slate-900/80 hover:bg-slate-800 hover:border-cyan-400/60 text-slate-100 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg transition"
            >
              <Github className="w-4 h-4 text-cyan-400" />
              <span>GitHub Repository</span>
            </a>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="min-h-11 px-5 rounded-full border border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg transition"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{locale === "bn" ? "পূর্ণাঙ্গ টিম রোস্টার দেখুন" : "View Full Team Roster"}</span>
            </button>
          </div>
        </div>

        {/* 5 Official Team Member Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {OFFICIAL_TEAM_MEMBERS.map((m) => (
            <div
              key={m.id}
              className={`ss-sapphire-card rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-1 group ${
                m.isLeader ? "ring-2 ring-cyan-400/60 shadow-[0_0_20px_rgba(56,189,248,0.25)]" : ""
              }`}
            >
              <div className="space-y-3">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-cyan-400/40 bg-slate-900">
                  <img
                    src={m.image}
                    alt={m.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
                  />
                  {m.isLeader && (
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[10px] font-mono shadow-md">
                      TEAM LEAD
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                    {m.memberNo}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-white truncate">
                    {locale === "bn" ? m.nameBn : m.name}
                  </h3>
                  <p className="text-xs font-semibold text-cyan-300 mt-0.5">
                    {locale === "bn" ? m.roleBn : m.role}
                  </p>
                </div>

                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {locale === "bn" ? m.bioBn : m.bio}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(m.phone, m.id)}
                  className="w-full min-h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{m.phone}</span>
                  </span>
                  {copiedId === m.id ? (
                    <span className="text-[10px] text-emerald-400 font-sans font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>

                <a
                  href={`mailto:${m.email}`}
                  className="w-full min-h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition truncate"
                >
                  <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">{m.email}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TeamRosterModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
