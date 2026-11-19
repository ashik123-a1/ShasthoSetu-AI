import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Hospital, Search, Stethoscope, X } from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { useI18n } from "../../lib/i18n";

interface SearchResultPayload {
  doctors: Array<{ id: string; display_name: string; display_name_bn?: string; specialty: string; district: string }>;
  diagnostic_tests: Array<{ id: string; code: string; name_bn: string; name_en: string; fee_minor_poisha: number }>;
  facilities: Array<{ id: string; name: string; facility_type: string; district: string }>;
  healthcare_plans: Array<{ id: string; name_bn: string; name_en: string; monthly_fee_minor_poisha: number }>;
}

export function CommandSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultPayload | null>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiGet<SearchResultPayload>(`/v1/public/search?q=${encodeURIComponent(query.trim())}`);
        if (active) setResults(res);
      } catch {
        if (active) setResults(null);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 backdrop-blur-sm p-4 pt-20"
      role="dialog"
      aria-modal="true"
      aria-label={locale === "bn" ? "সার্চ মোডাল" : "Global Search"}
      data-testid="command-search-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <Search className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              locale === "bn"
                ? "ডাক্তার, বিশেষজ্ঞ, ডায়াগনস্টিক টেস্ট বা হাসপাতাল খুঁজুন..."
                : "Search doctors, specialties, diagnostic labs, or facilities..."
            }
            className="w-full min-h-11 bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none text-base"
            data-testid="command-search-input"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={locale === "bn" ? "সার্চ বন্ধ করুন" : "Close search"}
            className="min-h-11 min-w-11 rounded-xl flex items-center justify-center hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {loading && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {locale === "bn" ? "খোঁজা হচ্ছে..." : "Searching platform catalog..."}
            </p>
          )}

          {!loading && results && (
            <>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  {locale === "bn" ? "অনুমোদিত ডেমো চিকিৎসক" : "Approved Demo Doctors"}
                </h3>
                <div className="space-y-1.5">
                  {results.doctors.length === 0 && (
                    <p className="text-xs text-[var(--color-text-muted)]">—</p>
                  )}
                  {results.doctors.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => go(`/doctors/${doc.id}`)}
                      className="w-full min-h-11 px-3 py-2 rounded-xl flex items-center justify-between text-left hover:bg-[var(--color-primary-soft)] transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <Stethoscope className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="font-medium text-sm text-[var(--color-text)]">
                          {locale === "bn" && doc.display_name_bn ? doc.display_name_bn : doc.display_name}
                        </span>
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {doc.specialty} • {doc.district}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  {locale === "bn" ? "ডায়াগনস্টিক টেস্ট ও প্যাকেজ" : "Diagnostic Tests & Health Plans"}
                </h3>
                <div className="space-y-1.5">
                  {results.diagnostic_tests.map((test) => (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => go("/services")}
                      className="w-full min-h-11 px-3 py-2 rounded-xl flex items-center justify-between text-left hover:bg-[var(--color-secondary-soft)] transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <FlaskConical className="w-4 h-4 text-[var(--color-secondary)]" />
                        <span className="text-sm text-[var(--color-text)]">
                          {locale === "bn" ? test.name_bn : test.name_en} ({test.code})
                        </span>
                      </span>
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">
                        ৳{Math.round(test.fee_minor_poisha / 100)} (Demo)
                      </span>
                    </button>
                  ))}
                  {results.facilities.map((fac) => (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => go("/services")}
                      className="w-full min-h-11 px-3 py-2 rounded-xl flex items-center justify-between text-left hover:bg-[var(--color-surface-alt)] transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <Hospital className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="text-sm text-[var(--color-text)]">{fac.name}</span>
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">{fac.district}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
