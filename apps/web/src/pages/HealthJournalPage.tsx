import { useEffect, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Film,
  FlaskConical,
  Globe,
  Newspaper,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { Skeleton } from "../components/ui";

interface JournalItem {
  id: string;
  item_type: "NEWS" | "VIDEO" | "RESEARCH" | "BLOG";
  language: "bn" | "en" | "bilingual";
  category: string;
  title: string;
  title_bn: string;
  summary: string;
  summary_bn: string;
  source_name: string;
  source_url: string;
  video_id: string | null;
  video_embed_url: string | null;
  thumbnail_url: string | null;
  published_at_utc: string;
  editorial_status: string;
  citation_meta?: { pmid?: string; journal?: string; authors?: string[]; pubdate?: string; reading_min?: number };
}

interface FeedResponse {
  items: JournalItem[];
  counts_by_type: Record<string, number>;
  counts_by_language: Record<string, number>;
  last_sync?: { status: string; completed_at_utc: string; items_added: number };
  editorial_notice: { en: string; bn: string };
}

export function HealthJournalPage() {
  const { locale } = useI18n();
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [itemType, setItemType] = useState<"ALL" | "NEWS" | "VIDEO" | "RESEARCH" | "BLOG">("ALL");
  const [langFilter, setLangFilter] = useState<"ALL" | "bn" | "en">("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [searchQ, setSearchQ] = useState("");
  const [activeVideo, setActiveVideo] = useState<JournalItem | null>(null);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (itemType !== "ALL") qs.set("item_type", itemType);
      if (langFilter !== "ALL") qs.set("language", langFilter);
      if (category !== "ALL") qs.set("category", category);
      if (searchQ.trim()) qs.set("q", searchQ.trim());
      qs.set("limit", "60");
      const res = await apiGet<FeedResponse>(`/v1/journal/feed?${qs.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType, langFilter, category]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await apiPost("/v1/journal/sync", {});
      await loadFeed();
    } finally {
      setSyncing(false);
    }
  };

  const videos = (data?.items || []).filter((i) => i.item_type === "VIDEO");
  const articles = (data?.items || []).filter((i) => i.item_type !== "VIDEO");

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="health-journal-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-health-journal.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        {/* Top Banner + Controls */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#38bdf8]">
                <Newspaper className="w-4 h-4" /> HEALTH JOURNAL • স্বাস্থ্যবার্তা (WHO • MEDLINEPLUS • PUBMED • BN/EN VIDEOS)
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {locale === "bn"
                  ? "স্বাস্থ্যবার্তা: লাইভ মেডিকেল নিউজ, গবেষণা ও ভিডিও থিয়েটার"
                  : "Health Journal: Verified News, PubMed & Bilingual Health Videos"}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? data?.editorial_notice?.bn ||
                    "WHO নিউজরুম, MedlinePlus, PubMed রিসার্চ ও WHO/DGHS/UNICEF বাংলাদেশের অফিসিয়াল বাংলা ও ইংরেজি ভিডিও SQLite-এ সংরক্ষিত।"
                  : data?.editorial_notice?.en ||
                    "SQLite-cached feeds from WHO Newsroom RSS, MedlinePlus RSS, PubMed E-utilities API, and verified Bangla & English official public-health video channels."}
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={syncing}
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing
                  ? locale === "bn"
                    ? "ফিড সিঙ্ক হচ্ছে..."
                    : "Syncing Live Feeds..."
                  : locale === "bn"
                  ? "লাইভ অফিসিয়াল ফিড রিফ্রেশ"
                  : "Refresh Official Feeds"}
              </button>
              {data?.last_sync && (
                <span className="text-[10px] font-mono text-slate-400">
                  Cache {data.last_sync.status} • {data.last_sync.completed_at_utc.slice(0, 16).replace("T", " ")} UTC
                </span>
              )}
            </div>
          </div>

          {/* Filter Strip: Type, Language, Category, Search */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["ALL", locale === "bn" ? "সব কন্টেন্ট" : "All Content"],
                    ["VIDEO", locale === "bn" ? "বাংলা ও ইংরেজি ভিডিও" : "BN & EN Videos"],
                    ["NEWS", locale === "bn" ? "WHO ও MedlinePlus নিউজ" : "Official News"],
                    ["RESEARCH", locale === "bn" ? "PubMed গবেষণা" : "PubMed Research"],
                    ["BLOG", locale === "bn" ? "শিক্ষামূলক ব্লগ" : "Health Blogs"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setItemType(k)}
                    className={`min-h-10 px-3.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                      itemType === k
                        ? "bg-white text-slate-950 font-bold"
                        : "bg-white/10 text-slate-200 hover:bg-white/15 border border-white/15"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Language Pill Switch (ALL | বাংলা | English) */}
              <div className="inline-flex rounded-full bg-[#040a18]/85 border border-sky-400/30 p-1">
                {(
                  [
                    ["ALL", "All Languages"],
                    ["bn", "বাংলা (Bangla)"],
                    ["en", "English"],
                  ] as const
                ).map(([code, lbl]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLangFilter(code)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition inline-flex items-center gap-1 ${
                      langFilter === code ? "bg-sky-400 text-slate-950" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Globe className="w-3 h-3" /> {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["ALL", "All Topics"],
                  ["medical-news", "Medical News"],
                  ["research", "Research"],
                  ["bangladesh-health", "Bangladesh Health"],
                  ["womens-health", "Women's & PCOS"],
                  ["child-care", "Child Care"],
                  ["blood-donation", "Blood Donation"],
                ].map(([cat, lbl]) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[11px] font-mono cursor-pointer border transition ${
                      category === cat
                        ? "bg-[#2dd4bf]/20 border-[#2dd4bf] text-[#2dd4bf] font-bold"
                        : "bg-black/30 border-white/10 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void loadFeed();
                }}
                className="flex items-center gap-2 rounded-full bg-[#040a18]/80 border border-white/15 px-3.5 min-h-10 min-w-[260px]"
              >
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search articles, PubMed, video title..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
                />
              </form>
            </div>
          </div>
        </section>

        {/* Inline Video Theater Player when a Bangla/English video is selected */}
        {activeVideo && activeVideo.video_embed_url && (
          <section className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4 border-sky-400/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#2dd4bf]">
                  {activeVideo.source_name} • {activeVideo.language === "bn" ? "বাংলা ভিডিও" : activeVideo.language.toUpperCase()}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">{activeVideo.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video player"
                className="min-h-10 min-w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/15">
              <iframe
                src={activeVideo.video_embed_url}
                title={activeVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            {/* BILINGUAL VIDEO SECTION (Bangla + English Verified Official Channels) */}
            {videos.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Film className="w-5 h-5 text-[#38bdf8]" />
                    {locale === "bn"
                      ? "অফিসিয়াল স্বাস্থ্য ভিডিও (বাংলা ও ইংরেজি)"
                      : "Official Health Video Briefings (Bangla & English)"}
                  </h2>
                  <span className="text-xs font-mono text-slate-300">
                    WHO Bangladesh • MIS DGHS • UNICEF BD • WHO Global
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {videos.slice(0, 12).map((vid) => (
                    <article
                      key={vid.id}
                      className="ss-sapphire-card rounded-2xl overflow-hidden flex flex-col justify-between hover:border-sky-400/60 transition"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveVideo(vid)}
                        className="relative aspect-video bg-slate-900 group cursor-pointer w-full text-left"
                      >
                        {vid.thumbnail_url && (
                          <img
                            src={vid.thumbnail_url}
                            alt={vid.title}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white/90 group-hover:text-sky-300 group-hover:scale-110 transition" />
                        </div>
                        <span className="absolute top-2 right-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/75 text-sky-300 border border-sky-400/35">
                          {vid.language === "bn" ? "বাংলা" : vid.language === "bilingual" ? "BN/EN" : "EN"}
                        </span>
                      </button>

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-mono text-[#2dd4bf]">{vid.source_name}</div>
                          <h3 className="text-sm font-bold text-white line-clamp-2">{vid.title}</h3>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setActiveVideo(vid)}
                            className="font-semibold text-sky-300 hover:underline cursor-pointer"
                          >
                            Watch Inline
                          </button>
                          <a
                            href={vid.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-white inline-flex items-center gap-1"
                          >
                            YouTube <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ARTICLES, PUBMED RESEARCH & CURATED HEALTH BLOGS */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2dd4bf]" />
                {locale === "bn"
                  ? "মেডিকেল নিউজ, PubMed গবেষণা ও শিক্ষামূলক গাইড"
                  : "Latest Medical News, PubMed Abstracts & Health Blogs"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((art) => (
                  <article
                    key={art.id}
                    className="ss-sapphire-card rounded-3xl p-5 flex flex-col justify-between gap-4 hover:border-sky-400/50 transition"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold ${
                            art.item_type === "RESEARCH"
                              ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/35"
                              : art.item_type === "BLOG"
                              ? "bg-teal-500/20 text-teal-200 border border-teal-400/35"
                              : "bg-sky-500/20 text-sky-200 border border-sky-400/35"
                          }`}
                        >
                          {art.item_type === "RESEARCH" && <FlaskConical className="w-3 h-3 inline mr-1" />}
                          {art.item_type}
                        </span>
                        <span className="text-slate-400">{art.source_name}</span>
                      </div>

                      <h3 className="text-base font-bold text-white leading-snug">
                        {locale === "bn" && art.title_bn ? art.title_bn : art.title}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                        {locale === "bn" && art.summary_bn ? art.summary_bn : art.summary}
                      </p>
                      {art.citation_meta?.pmid && (
                        <div className="text-[10px] font-mono text-indigo-300">
                          PMID: {art.citation_meta.pmid} • {art.citation_meta.journal}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300">
                        <ShieldCheck className="w-3.5 h-3.5" /> {art.editorial_status}
                      </span>
                      <a
                        href={art.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-sky-300 hover:underline inline-flex items-center gap-1"
                      >
                        Read Source <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
