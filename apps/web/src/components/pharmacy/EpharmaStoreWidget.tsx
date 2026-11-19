import { useEffect, useState } from "react";
import { CheckCircle2, Minus, Pill, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { apiGet } from "../../lib/apiClient";
import { formatBdtFromPoisha } from "../../lib/formatters";
import { useI18n } from "../../lib/i18n";
import { Skeleton } from "../ui";

export interface EpharmaMedicineItem {
  id: string;
  sku: string;
  name_en: string;
  name_bn: string;
  generic_name: string;
  brand: string;
  category: string;
  pack_size: string;
  mrp_minor_poisha: number;
  discount_pct: number;
  price_minor_poisha: number;
  rx_required: boolean;
  in_stock: boolean;
  best_seller: boolean;
}

export function EpharmaStoreWidget({
  medicines: propMedicines,
  autoFetch = false,
}: {
  medicines?: EpharmaMedicineItem[];
  autoFetch?: boolean;
}) {
  const { locale } = useI18n();
  const [fetchedMedicines, setFetchedMedicines] = useState<EpharmaMedicineItem[]>([]);
  const [loading, setLoading] = useState(Boolean(autoFetch && !propMedicines));
  const [medCategory, setMedCategory] = useState<string>("ALL");
  const [medSearch, setMedSearch] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderNotice, setOrderNotice] = useState<string>("");

  useEffect(() => {
    if (!autoFetch || propMedicines) return;
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const res = await apiGet<{ medicines?: EpharmaMedicineItem[] }>("/v1/public/services");
        if (active) setFetchedMedicines(res.medicines || []);
      } catch {
        if (active) setFetchedMedicines([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [autoFetch, propMedicines]);

  const allMeds = propMedicines ?? fetchedMedicines;
  const medCats = ["ALL", ...Array.from(new Set(allMeds.map((m) => m.category)))];
  const filteredMeds = allMeds.filter((m) => {
    const catOk = medCategory === "ALL" || m.category === medCategory;
    const q = medSearch.trim().toLowerCase();
    const qOk =
      !q ||
      m.name_en.toLowerCase().includes(q) ||
      m.name_bn.toLowerCase().includes(q) ||
      m.generic_name.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q);
    return catOk && qOk;
  });

  const cartEntries = Object.entries(cart)
    .map(([id, qty]) => {
      const med = allMeds.find((m) => m.id === id);
      return med && qty > 0 ? { med, qty } : null;
    })
    .filter((x): x is { med: EpharmaMedicineItem; qty: number } => x !== null);

  const cartSubtotalPoisha = cartEntries.reduce((sum, item) => sum + item.med.price_minor_poisha * item.qty, 0);
  const cartMrpPoisha = cartEntries.reduce((sum, item) => sum + item.med.mrp_minor_poisha * item.qty, 0);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div id="section-epharma" className="bento-card rounded-3xl p-6 space-y-5 border-cyan-500/30 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">
            E-PHARMA ONLINE PHARMACY STORE ({allMeds.length} ITEMS • 8 CATEGORIES)
          </span>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5">
            <Pill className="w-5 h-5 text-amber-300" />
            {locale === "bn" ? "শাস্ত্রসেতু ই-ফার্মা মেডিসিন শপ ও কার্ট" : "ShasthoSetu ePharma Store & Demo Cart"}
          </h3>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 min-h-11 w-full md:w-72">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="search"
            value={medSearch}
            onChange={(e) => setMedSearch(e.target.value)}
            placeholder="Search Napa, Seclo, Glucometer..."
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {medCats.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setMedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition ${
              medCategory === cat
                ? "bg-amber-400 text-slate-950 border-amber-300 font-bold"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-400/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {orderNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{orderNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredMeds.map((med) => {
            const qty = cart[med.id] || 0;
            return (
              <div
                key={med.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400/40 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      {med.category}
                    </span>
                    <div className="flex items-center gap-1">
                      {med.rx_required && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                          Rx Req
                        </span>
                      )}
                      {med.discount_pct > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          -{med.discount_pct}%
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-white mt-2">
                    {locale === "bn" ? med.name_bn : med.name_en}
                  </h4>
                  <p className="text-[11px] text-cyan-300">{med.generic_name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {med.brand} • {med.pack_size}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-extrabold text-sm text-amber-300">
                      {formatBdtFromPoisha(med.price_minor_poisha, locale)}
                    </div>
                    {med.mrp_minor_poisha > med.price_minor_poisha && (
                      <div className="text-[10px] font-mono text-slate-500 line-through">
                        {formatBdtFromPoisha(med.mrp_minor_poisha, locale)}
                      </div>
                    )}
                  </div>

                  {qty > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => ({ ...prev, [med.id]: Math.max(0, (prev[med.id] || 0) - 1) }))
                        }
                        aria-label="Decrease quantity"
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-xs w-5 text-center">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setCart((prev) => ({ ...prev, [med.id]: (prev[med.id] || 0) + 1 }))}
                        aria-label="Increase quantity"
                        className="w-8 h-8 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderNotice("");
                        setCart((prev) => ({ ...prev, [med.id]: 1 }));
                      }}
                      className="min-h-9 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Drawer */}
        <div className="lg:col-span-4 rounded-2xl bg-[#070f22] border border-cyan-500/35 p-4 space-y-4 sticky top-24">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-300" />
              Demo Pharmacy Cart ({cartEntries.reduce((a, b) => a + b.qty, 0)})
            </span>
            {cartEntries.length > 0 && (
              <button
                type="button"
                onClick={() => setCart({})}
                className="text-[11px] text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {cartEntries.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Add medicines or healthcare devices from the catalog to test cart discounts &amp; demo order placement.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {cartEntries.map(({ med, qty }) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{med.name_en}</div>
                      <div className="text-[10px] text-slate-400">
                        {qty} × {formatBdtFromPoisha(med.price_minor_poisha, locale)}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-amber-300 shrink-0">
                      {formatBdtFromPoisha(med.price_minor_poisha * qty, locale)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>MRP Savings</span>
                  <span className="text-emerald-400 font-mono">
                    -{formatBdtFromPoisha(Math.max(0, cartMrpPoisha - cartSubtotalPoisha), locale)}
                  </span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-white">
                  <span>Demo Payable Total</span>
                  <span className="text-amber-300 font-mono">{formatBdtFromPoisha(cartSubtotalPoisha, locale)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const totalCount = cartEntries.reduce((a, b) => a + b.qty, 0);
                  setOrderNotice(
                    `SIMULATED DEMO ORDER PLACED (#PHM-${Date.now().toString().slice(-5)}): ${totalCount} item(s) totaling ${formatBdtFromPoisha(cartSubtotalPoisha, locale)}. Rx-required items require pharmacist verification before dispatch.`
                  );
                  setCart({});
                }}
                className="w-full min-h-11 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                Place Simulated Pharmacy Order →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
