import { useEffect, useId, useState } from "react";
import { BookOpenCheck, ExternalLink, ShieldCheck, X } from "lucide-react";
import { apiGet } from "../../lib/apiClient";

export interface CitationRef {
  citation_num: number;
  source_id: string;
  chunk_id?: string | null;
  source_title: string;
  source_title_bn?: string;
  publisher: string;
  source_origin_type?: string;
  attribution_note?: string;
  is_external_url?: boolean;
  internal_ref_uri?: string;
  page_or_section_ref: string;
  source_url: string;
  snippet_text: string;
  score: number;
}

interface SourceDetailResponse {
  source: {
    id: string;
    title: string;
    title_bn: string;
    publisher: string;
    source_url: string;
    category: string;
    audience_scope: string;
    language: string;
    publication_date?: string | null;
    retrieval_date: string;
    license_basis: string;
    review_status: string;
  };
  version?: {
    version_number: number;
    content_sha256: string;
    clean_text: string;
  } | null;
  chunks: Array<{
    id: string;
    chunk_index: number;
    section_heading: string;
    page_or_section_ref: string;
    chunk_text: string;
  }>;
}

export function CitationDrawer({
  citation,
  onClose,
}: {
  citation: CitationRef | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const [dialogEl, setDialogEl] = useState<HTMLDialogElement | null>(null);
  const [detail, setDetail] = useState<SourceDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogEl) return;
    if (citation) {
      if (!dialogEl.open && typeof dialogEl.showModal === "function") {
        dialogEl.showModal();
      }
    } else if (dialogEl.open) {
      dialogEl.close();
    }
  }, [citation, dialogEl]);

  // Native <dialog> close + progressive-enhancement light-dismiss fallback when closedby="any" is absent
  useEffect(() => {
    if (!dialogEl) return;
    const handleClose = () => {
      dialogEl.returnValue = "";
      onClose();
    };
    dialogEl.addEventListener("close", handleClose);

    const hasClosedBy = "closedBy" in HTMLDialogElement.prototype;
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialogEl.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialogEl.close("backdrop");
      }
      pressedOutside = false;
    };
    if (!hasClosedBy) {
      dialogEl.addEventListener("pointerdown", onPointerDown);
      dialogEl.addEventListener("pointerup", onPointerUp);
    }

    return () => {
      dialogEl.removeEventListener("close", handleClose);
      if (!hasClosedBy) {
        dialogEl.removeEventListener("pointerdown", onPointerDown);
        dialogEl.removeEventListener("pointerup", onPointerUp);
      }
    };
  }, [dialogEl, onClose]);

  useEffect(() => {
    if (!citation) {
      setDetail(null);
      setLoadErr(null);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadErr(null);
    void (async () => {
      try {
        const res = await apiGet<SourceDetailResponse>(`/v1/ai/sources/${encodeURIComponent(citation.source_id)}`);
        if (active) setDetail(res);
      } catch (err) {
        if (active) setLoadErr(err instanceof Error ? err.message : "Could not load approved source details.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [citation]);

  return (
    <dialog
      ref={setDialogEl}
      aria-labelledby={titleId}
      data-testid="citation-source-dialog"
      {...({ closedby: "any" } as Record<string, unknown>)}
      className="m-auto w-[min(94vw,720px)] max-h-[86vh] rounded-3xl border border-sky-400/35 bg-[#071126] text-slate-100 p-0 shadow-2xl overflow-hidden"
    >
      {citation && (
        <div className="flex flex-col max-h-[86vh]">
          <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3 bg-[#091734]">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED SOURCE [{citation.citation_num}]
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-200">
                  {citation.source_origin_type === "FIRST_PARTY_PLATFORM_DOC" ||
                  detail?.source?.source_url?.includes("shasthosetu.local")
                    ? "ShasthoSetu Platform Doc"
                    : "ShasthoSetu Synthesized Summary (Ref. Official Guidance)"}
                </span>
                {detail?.source && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-200">
                    {detail.source.category} • {detail.source.audience_scope}
                  </span>
                )}
              </div>
              <h2 id={titleId} className="text-lg font-bold text-white">
                {citation.source_title}
              </h2>
              <p className="text-xs text-slate-300">
                {citation.publisher} • {citation.page_or_section_ref}
              </p>
            </div>
            <form method="dialog">
              <button
                type="submit"
                value="close"
                aria-label="Close source preview"
                className="min-h-11 min-w-11 rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 text-slate-200 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="p-5 overflow-y-auto overscroll-contain space-y-4 text-xs">
            <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 space-y-1.5">
              <div className="font-mono text-[10px] uppercase text-sky-300">Retrieved Passage Snippet</div>
              <p className="text-slate-100 leading-relaxed whitespace-pre-wrap">{citation.snippet_text}</p>
            </div>

            {loading && <div className="text-slate-400 font-mono">Loading full approved source record...</div>}
            {loadErr && <div className="text-rose-300 font-mono">{loadErr}</div>}

            {detail?.source && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <BookOpenCheck className="w-4 h-4 text-[#2dd4bf]" /> Source Provenance & Metadata
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 font-mono text-[11px]">
                  <div>Review Status: <span className="text-emerald-300">{detail.source.review_status}</span></div>
                  <div>Version: v{detail.version?.version_number ?? 1}</div>
                  <div>Published: {detail.source.publication_date || "N/A"}</div>
                  <div>Retrieved: {detail.source.retrieval_date}</div>
                  <div className="sm:col-span-2">License: {detail.source.license_basis}</div>
                  {detail.version?.content_sha256 && (
                    <div className="sm:col-span-2 truncate">SHA-256: {detail.version.content_sha256}</div>
                  )}
                </div>
                {detail.source.source_url &&
                  detail.source.source_url.startsWith("https://") &&
                  !detail.source.source_url.includes("shasthosetu.local") ? (
                  <a
                    href={detail.source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-300 hover:underline font-semibold pt-1"
                  >
                    Open Upstream Guidance Reference <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : detail.source.source_url ? (
                  <div className="font-mono text-[11px] text-slate-400 pt-1">
                    Internal Platform Reference ID: {detail.source.source_url}
                  </div>
                ) : null}
              </div>
            )}

            {detail?.chunks && detail.chunks.length > 0 && (
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase text-slate-400">
                  Indexed Document Sections ({detail.chunks.length})
                </div>
                {detail.chunks.map((ch) => (
                  <div
                    key={ch.id}
                    className={`rounded-xl border p-3 space-y-1 ${
                      ch.id === citation.chunk_id
                        ? "border-teal-400/60 bg-teal-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="font-mono text-[11px] font-bold text-teal-300">
                      {ch.page_or_section_ref}
                    </div>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{ch.chunk_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
