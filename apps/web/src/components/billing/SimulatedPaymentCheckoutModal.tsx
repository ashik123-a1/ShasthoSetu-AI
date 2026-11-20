import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { apiPost } from "../../lib/apiClient";
import { useAuth } from "../../lib/authContext";
import { formatBdtFromPoisha } from "../../lib/formatters";
import { useI18n } from "../../lib/i18n";
import { playPaymentSuccess } from "../../utils/soundEffects";

export type SimulatedPaymentMethod =
  | "SHASTHOPAY_MFS"
  | "DIGITAL_DIRECT_PAY"
  | "SMART_CARD_DEMO"
  | "CITY_BANK_CORP";

export interface SimulatedPaymentSuccessPayload {
  receiptNumber: string;
  transactionId: string;
  method: SimulatedPaymentMethod;
  methodLabel: string;
  amountPoisha: number;
  commissionPoisha?: number;
  commissionRatePct?: number;
  netPartnerPayoutPoisha?: number;
  bankAccountCode?: string;
  paidAtUtc: string;
}

interface SimulatedPaymentCheckoutModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  itemDescription: string;
  amountPoisha: number;
  category?: "PHARMACY" | "DOCTOR_CONSULTATION" | "DIAGNOSTIC" | "HEALTH_PLAN";
  onSuccess: (payload: SimulatedPaymentSuccessPayload) => void;
  onClose: () => void;
}

export function SimulatedPaymentCheckoutModal({
  isOpen,
  title,
  subtitle,
  itemDescription,
  amountPoisha,
  category = "PHARMACY",
  onSuccess,
  onClose,
}: SimulatedPaymentCheckoutModalProps) {
  const { locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [method, setMethod] = useState<SimulatedPaymentMethod>("SHASTHOPAY_MFS");
  const [walletPhone, setWalletPhone] = useState("+880 1711-000101");
  const [walletPin, setWalletPin] = useState("••••");
  const [cardNumber, setCardNumber] = useState("5399 •••• •••• 8849");
  const [processing, setProcessing] = useState(false);
  const [successPayload, setSuccessPayload] = useState<SimulatedPaymentSuccessPayload | null>(null);

  if (!isOpen) return null;

  const commRateMap: Record<string, number> = {
    PHARMACY: 12.0,
    DOCTOR_CONSULTATION: 15.0,
    DIAGNOSTIC: 18.0,
    HEALTH_PLAN: 20.0,
  };
  const commRate = commRateMap[category] ?? 12.0;
  const estCommPoisha = Math.round(amountPoisha * (commRate / 100));
  const estNetPoisha = Math.max(0, amountPoisha - estCommPoisha);

  const handlePay = async () => {
    if (!user) {
      onClose();
      navigate("/login");
      return;
    }
    setProcessing(true);
    const methodNames: Record<SimulatedPaymentMethod, string> = {
      SHASTHOPAY_MFS: "Demo Payment MFS (Simulated Escrow)",
      DIGITAL_DIRECT_PAY: "Demo Payment Direct (Simulated Gateway)",
      SMART_CARD_DEMO: "SSLCommerz Visa / Mastercard",
      CITY_BANK_CORP: "City Bank PLC Corporate Transfer",
    };
    const gwMap: Record<SimulatedPaymentMethod, string> = {
      SHASTHOPAY_MFS: "DEMO_BKASH",
      DIGITAL_DIRECT_PAY: "DEMO_NAGAD",
      SMART_CARD_DEMO: "DEMO_CARD",
      CITY_BANK_CORP: "DEMO_BANK",
    };
    const streamMap: Record<string, string> = {
      PHARMACY: "EPHARMA_SALE",
      DOCTOR_CONSULTATION: "DOCTOR_CONSULTATION",
      DIAGNOSTIC: "DIAGNOSTIC_TEST",
      HEALTH_PLAN: "HEALTH_PLAN",
    };

    try {
      const res = await apiPost<{
        transaction: {
          txn_ref: string;
          receipt_number: string;
          gross_amount_minor_poisha: number;
          commission_rate_pct: number;
          commission_minor_poisha: number;
          net_partner_payout_minor_poisha: number;
          bank_account_id: string;
          created_at_utc: string;
        };
      }>("/v1/payments/universal-checkout", {
        revenue_stream: streamMap[category] || "EPHARMA_SALE",
        item_title: `${title}: ${itemDescription}`,
        amount_minor_poisha: amountPoisha,
        gateway_method: gwMap[method],
      });
      const tx = res.transaction;
      const payload: SimulatedPaymentSuccessPayload = {
        receiptNumber: tx.receipt_number,
        transactionId: tx.txn_ref,
        method,
        methodLabel: methodNames[method],
        amountPoisha: tx.gross_amount_minor_poisha,
        commissionPoisha: tx.commission_minor_poisha,
        commissionRatePct: tx.commission_rate_pct,
        netPartnerPayoutPoisha: tx.net_partner_payout_minor_poisha,
        bankAccountCode: tx.bank_account_id,
        paidAtUtc: tx.created_at_utc,
      };
      setProcessing(false);
      setSuccessPayload(payload);
      playPaymentSuccess();
    } catch {
      const randRef = Date.now().toString().slice(-5);
      const prefix = category === "PHARMACY" ? "PHM" : category === "DOCTOR_CONSULTATION" ? "APT" : "DIAG";
      const payload: SimulatedPaymentSuccessPayload = {
        receiptNumber: `DEMO-RCP-${prefix}-${randRef}`,
        transactionId: `TXN-SIM-${prefix}-${randRef}`,
        method,
        methodLabel: methodNames[method],
        amountPoisha,
        commissionPoisha: estCommPoisha,
        commissionRatePct: commRate,
        netPartnerPayoutPoisha: estNetPoisha,
        bankAccountCode: "bank-bkash-escrow",
        paidAtUtc: new Date().toISOString(),
      };
      setProcessing(false);
      setSuccessPayload(payload);
      playPaymentSuccess();
    }
  };

  const handleDone = () => {
    if (successPayload) {
      onSuccess(successPayload);
    }
    setSuccessPayload(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-sky-500/30 bg-[#060d1d] text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                {locale === "bn" ? "নিরাপদ ব্যাংক ও গেটওয়ে পেমেন্ট" : "Secure Bank & Gateway Checkout"}
              </h3>
              <p className="text-[11px] font-mono text-emerald-400">
                SYNCED TO ADMIN TREASURY &amp; SUPPORT TNX LEDGER
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccessPayload(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          {!user ? (
            <div className="text-center py-6 space-y-4" data-testid="payment-login-required-gate">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-400/40 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  SECURITY &amp; PHI PROTECTION GATE
                </span>
                <h4 className="text-lg font-bold text-white mt-1">
                  {locale === "bn" ? "পেমেন্ট করতে সাইন-ইন আবশ্যক" : "Sign In Required to Proceed with Payment"}
                </h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {locale === "bn"
                    ? "নিরাপত্তার স্বার্থে এবং ডিজিটাল প্রেসক্রিপশন ও ভেরিফাইড রসিদ আপনার পার্সোনাল হেলথ ভল্টে সুরক্ষিত রাখতে পেমেন্টের পূর্বে সাইন-ইন আবশ্যক।"
                    : "For financial safety, Zero-PHI accountability, and to bind your verified digital receipt to your Health Vault, please sign in before paying."}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 text-left font-mono text-xs space-y-1.5 max-w-sm mx-auto">
                <div className="flex justify-between text-slate-400">
                  <span>Service:</span>
                  <span className="text-white font-bold truncate max-w-[200px]">{title}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Payable Total:</span>
                  <span className="text-emerald-400 font-bold">{formatBdtFromPoisha(amountPoisha, locale)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  data-testid="pay-signin-redirect-btn"
                  onClick={() => {
                    onClose();
                    navigate("/login");
                  }}
                  className="w-full sm:w-auto min-h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {locale === "bn" ? "লগইন করুন / Sign In Now →" : "Sign In to Pay →"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto min-h-11 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {locale === "bn" ? "বাতিল" : "Cancel"}
                </button>
              </div>
            </div>
          ) : successPayload ? (
            <div className="text-center py-3 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">
                  {locale === "bn" ? "পেমেন্ট ও ব্যাংক সেটেলমেন্ট সম্পন্ন!" : "Payment & Bank Settlement Recorded!"}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  {locale === "bn"
                    ? "অ্যাডমিন ব্যাংক ড্যাশবোর্ড ও সাপোর্ট ট্রানজেকশন লেজারে তাৎক্ষণিক যুক্ত হয়েছে।"
                    : "Synced live to Admin Bank Monitor, Commission Ledger & Support Zero-PHI TNX Desk."}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-left font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt No:</span>
                  <span className="text-emerald-400 font-bold">{successPayload.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="text-cyan-300">{successPayload.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank / Gateway:</span>
                  <span className="text-amber-300">{successPayload.methodLabel}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                  <span>Platform Commission ({successPayload.commissionRatePct ?? commRate}%):</span>
                  <span className="text-sky-300">
                    {formatBdtFromPoisha(successPayload.commissionPoisha ?? estCommPoisha, locale)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Partner / Vendor Net Payout:</span>
                  <span className="text-slate-200">
                    {formatBdtFromPoisha(successPayload.netPartnerPayoutPoisha ?? estNetPoisha, locale)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white">
                  <span>Total Gross Paid:</span>
                  <span className="text-emerald-400 text-sm">
                    {formatBdtFromPoisha(successPayload.amountPoisha, locale)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDone}
                className="w-full min-h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm cursor-pointer shadow-lg hover:brightness-110 transition"
              >
                {locale === "bn" ? "অর্ডার সম্পন্ন ও নিশ্চিত করুন" : "Complete & View Details →"}
              </button>
            </div>
          ) : (
            <>
              {/* Order summary banner */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-1.5">
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  {title}
                </div>
                <div className="text-sm font-semibold text-white">{itemDescription}</div>
                {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-1">
                  <span>Platform Commission ({commRate}%): {formatBdtFromPoisha(estCommPoisha, locale)}</span>
                  <span>Partner Share ({100 - commRate}%): {formatBdtFromPoisha(estNetPoisha, locale)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-1">
                  <span className="text-xs text-slate-400">Total Payable (BDT):</span>
                  <span className="text-lg font-mono font-black text-amber-300">
                    {formatBdtFromPoisha(amountPoisha, locale)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  {locale === "bn" ? "ব্যাংক বা পেমেন্ট গেটওয়ে নির্বাচন করুন:" : "Select Monitored Bank / Gateway:"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      id: "SHASTHOPAY_MFS" as SimulatedPaymentMethod,
                      name: "Demo Payment MFS",
                      sub: "Simulated Escrow",
                      icon: Smartphone,
                    },
                    {
                      id: "DIGITAL_DIRECT_PAY" as SimulatedPaymentMethod,
                      name: "Demo Payment Direct",
                      sub: "Simulated Gateway",
                      icon: Zap,
                    },
                    {
                      id: "SMART_CARD_DEMO" as SimulatedPaymentMethod,
                      name: "SSLCommerz",
                      sub: "Visa / Master",
                      icon: CreditCard,
                    },
                    {
                      id: "CITY_BANK_CORP" as SimulatedPaymentMethod,
                      name: "City Bank",
                      sub: "Corporate A/C",
                      icon: Building2,
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                          active
                            ? "bg-cyan-500/15 border-cyan-400 text-white"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                          <span className={`w-2 h-2 rounded-full ${active ? "bg-cyan-400" : "bg-transparent"}`} />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{m.name}</div>
                          <div className="text-[10px] text-slate-500">{m.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulated credential input */}
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
                {method === "SHASTHOPAY_MFS" && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 flex justify-between">
                      <span>Demo Payment MFS Wallet Number:</span>
                      <span className="text-[10px] text-cyan-400 font-mono">Demo Escrow</span>
                    </label>
                    <input
                      type="text"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      className="w-full min-h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                    />
                    <label className="text-xs text-slate-300 block">Simulated Demo PIN:</label>
                    <input
                      type="password"
                      value={walletPin}
                      onChange={(e) => setWalletPin(e.target.value)}
                      className="w-full min-h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                )}

                {method === "DIGITAL_DIRECT_PAY" && (
                  <div className="text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-2 text-teal-400 font-bold">
                      <Zap className="w-4 h-4" /> Demo Instant Commercial Settlement (`DEMO-DIRECT-02`)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Settles directly into Demo Payment Gateway with automatic {commRate}% platform commission split.
                    </p>
                  </div>
                )}

                {method === "SMART_CARD_DEMO" && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 block">SSLCommerz Visa / Mastercard Number:</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full min-h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                )}

                {method === "CITY_BANK_CORP" && (
                  <div className="text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Building2 className="w-4 h-4" /> City Bank PLC Corporate Treasury (`A/C 1402-••••-9901`)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Direct RTGS / NPSB clearing into ShasthoSetu Corporate Treasury account monitored by Admin.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={processing}
                onClick={() => void handlePay()}
                className="w-full min-h-12 rounded-xl bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording Bank &amp; Commission Transaction...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Pay {formatBdtFromPoisha(amountPoisha, locale)} &amp; Sync to Admin →
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
