import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, HeartPulse, Hospital } from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { formatBdtFromPoisha } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { Skeleton } from "../components/ui";

interface ServicesResponse {
  diagnostic_tests: Array<{ id: string; code: string; name_bn: string; name_en: string; category: string; sample_type: string; fee_minor_poisha: number; turnaround_hours: number }>;
  healthcare_plans: Array<{ id: string; code: string; name_bn: string; name_en: string; description_bn: string; description_en: string; monthly_fee_minor_poisha: number; max_family_members: number }>;
  facilities: Array<{ id: string; name: string; facility_type: string; district: string; address: string; phone?: string; source_name: string }>;
}

export function PublicServicesPage() {
  const { locale } = useI18n();
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<ServicesResponse>("/v1/public/services");
        if (active) setData(res);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24 overflow-x-clip">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-services-lab.jpg" mode="adaptive" />
      <PublicFloatingHeader />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {locale === "bn" ? "স্বাস্থ্য সেবা, ল্যাব টেস্ট ও ক্লিনিক ডিরেক্টরি" : "Health Services, Diagnostics & Family Plans"}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {locale === "bn"
                ? "সমস্ত ল্যাব বুকিং ও প্যাকেজ ডেমো/সিমুলেটেড অর্ডার হিসেবে রোগী পোর্টালে সংরক্ষিত হয়।"
                : "All diagnostic sample requests and healthcare plans operate transparently in simulated demo mode."}
            </p>
          </div>
          <Link to="/patient/diagnostics" className="min-h-11 px-5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm inline-flex items-center">
            {locale === "bn" ? "রোগী পোর্টালে অর্ডার করুন" : "Order in Patient Portal"}
          </Link>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[var(--color-secondary)]" />
                {locale === "bn" ? "ডায়াগনস্টিক ও হোম স্যাম্পল টেস্ট (ডেমো)" : "Diagnostic Lab Catalog (Demo)"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(data?.diagnostic_tests || []).map((test) => (
                  <div key={test.id} className="ss-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
                    <span className="text-xs font-mono text-[var(--color-secondary)]">{test.code} • {test.turnaround_hours}h</span>
                    <h3 className="font-bold text-base">{locale === "bn" ? test.name_bn : test.name_en}</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">{test.category} • {test.sample_type}</p>
                    <div className="pt-2 border-t border-[var(--color-border)] font-mono font-bold text-base">
                      {formatBdtFromPoisha(test.fee_minor_poisha, locale)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-500" />
                {locale === "bn" ? "পারিবারিক স্বাস্থ্যসেবা প্যাকেজ" : "Family Healthcare Plans"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data?.healthcare_plans || []).map((plan) => (
                  <div key={plan.id} className="ss-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{locale === "bn" ? plan.name_bn : plan.name_en}</h3>
                      <span className="font-mono font-bold text-lg text-[var(--color-primary)]">
                        {formatBdtFromPoisha(plan.monthly_fee_minor_poisha, locale)}/mo
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {locale === "bn" ? plan.description_bn : plan.description_en}
                    </p>
                    <p className="text-xs font-mono text-[var(--color-text-muted)]">Up to {plan.max_family_members} dependents • SIMULATED</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Hospital className="w-5 h-5 text-sky-500" />
                {locale === "bn" ? "ক্লিনিক, হাসপাতাল ও ফার্মেসি" : "Facility & Pharmacy Directory"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data?.facilities || []).map((fac) => (
                  <div key={fac.id} className="ss-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base">{fac.name}</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">{fac.address}, {fac.district}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{fac.source_name}</p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      {fac.facility_type}
                    </span>
                  </div>
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
