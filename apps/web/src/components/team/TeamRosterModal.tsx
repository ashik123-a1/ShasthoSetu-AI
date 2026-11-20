import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Github, Globe, Mail, Phone, ShieldCheck, Users, X } from "lucide-react";
import { OFFICIAL_TEAM_MEMBERS, TEAM_INFO } from "../../data/teamData";
import { useI18n } from "../../lib/i18n";

export function TeamRosterModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2200);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#09152e] via-[#050d1e] to-[#030712] shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0a1835]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest text-[#38bdf8] uppercase font-bold">
                  OFFICIAL PROJECT TEAM ROSTER
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-400/30">
                  {OFFICIAL_TEAM_MEMBERS.length} Engineers
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                {locale === "bn" ? "স্বাস্থ্যসেতু এআই — প্রকল্প টিম ডিরেক্টরি" : "ShasthoSetu AI — Engineering Leadership & Directory"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OFFICIAL_TEAM_MEMBERS.map((member) => (
              <div
                key={member.id}
                className={`relative rounded-2xl border transition-all duration-300 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 overflow-hidden group ${
                  member.isLeader
                    ? "border-cyan-400/60 bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-slate-950/90 shadow-[0_0_25px_rgba(56,189,248,0.18)]"
                    : "border-slate-800 hover:border-cyan-500/40 bg-slate-950/80 hover:bg-slate-900/60"
                }`}
              >
                {/* Decorative background glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-cyan-400/10 blur-3xl group-hover:bg-cyan-400/20 transition"
                />

                <div className="relative z-10 flex items-start gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover object-top border-2 border-cyan-400/60 shadow-lg group-hover:scale-105 transition"
                    />
                    {member.isLeader && (
                      <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] font-mono tracking-wider shadow">
                        LEAD
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                        {member.memberNo}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                        Dhaka, BD
                      </span>
                    </div>

                    <h3 className="font-black text-lg text-white truncate">
                      {locale === "bn" ? member.nameBn : member.name}
                    </h3>

                    <p className="text-xs font-semibold text-cyan-300 leading-snug">
                      {locale === "bn" ? member.roleBn : member.role}
                    </p>

                    <div className="pt-1.5 flex flex-wrap gap-1">
                      {member.skills.slice(0, 3).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-[11.5px] text-slate-300 leading-snug line-clamp-3 border-t border-white/10 pt-2">
                  {locale === "bn" ? member.bioBn : member.bio}
                </p>

                {/* Contact and copy action bar */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(member.phone, member.id)}
                    className="min-h-9 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {copiedId === member.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{member.phone}</span>
                        <Copy className="w-3 h-3 text-slate-400 ml-0.5" />
                      </>
                    )}
                  </button>

                  <a
                    href={`mailto:${member.email}`}
                    className="min-h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Mail className="w-3.5 h-3.5 text-teal-400" />
                    <span className="truncate max-w-[140px] sm:max-w-none">{member.email}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#050d1e] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Core Engineering Directory • Zero 3rd-Party Dependencies</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={TEAM_INFO.liveWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-9 px-3.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>shasthosetu.fit</span>
              <ExternalLink className="w-3 h-3 text-cyan-300" />
            </a>

            <a
              href={TEAM_INFO.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-9 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold inline-flex items-center gap-2 cursor-pointer transition"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
