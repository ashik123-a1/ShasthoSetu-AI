import { useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { formatBdtFromPoisha } from "../../lib/formatters";
import { useI18n } from "../../lib/i18n";

export type SimulatedPaymentMethod =
  | "SHASTHOPAY_MFS"
  | "DIGITAL_DIRECT_PAY"
  | "SMART_CARD_DEMO";

export interface SimulatedPaymentSuccessPayload {
  receiptNumber: string;
  transactionId: string;
  method: SimulatedPaymentMethod;
  methodLabel: string;
  amountPoisha: number;
  paidAtUtc: string;
}

interface SimulatedPaymentCheckoutModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  itemDescription: string;
  amountPoisha: number;
  category?: "PHARMACY" | "DOCTOR_CONSULTATION" | "DIAGNOSTIC";
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

  const [method, setMethod] = useState<SimulatedPaymentMethod>("SHASTHOPAY_MFS");
  const [walletPhone, setWalletPhone] = useState("+880 1711-000101");
  const [walletPin, setWalletPin] = useState("••••");
  const [cardNumber, setCardNumber] = useState("5399 •••• •••• 8849");
  const [processing, setProcessing] = useState(false);
  const [successPayload, setSuccessPayload] = useState<SimulatedPaymentSuccessPayload | null>(null);

  if (!isOpen) return null;

  const handlePay = () => {
    setProcessing(true);
    const methodNames: Record<SimulatedPaymentMethod, string> = {
      SHASTHOPAY_MFS: "ShasthoPay MFS (Simulated)",
      DIGITAL_DIRECT_PAY: "Digital Direct Pay (Simulated)",
      SMART_CARD_DEMO: "Smart Health Card / Debit Demo",
    };

    window.setTimeout(() => {
      const randRef = Date.now().toString().slice(-5);
      const prefix = category === "PHARMACY" ? "PHM" : category === "DOCTOR_CONSULTATION" ? "APT" : "DIAG";
      const payload: SimulatedPaymentSuccessPayload = {
        receiptNumber: `DEMO-RCP-${prefix}-${randRef}`,
        transactionId: `TXN-SIM-${prefix}-${randRef}-${Math.floor(Math.random() * 899 + 100)}`,
        method,
        methodLabel: methodNames[method],
        amountPoisha,
        paidAtUtc: new Date().toISOString(),
      };
      setProcessing(false);
      setSuccessPayload(payload);
    }, 1200);
  };

  const handleDone = () => {
    if (successPayload) {
      onSuccess(successPayload);
    }
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
                {locale === "bn" ? "নিরাপদ সিমুলেটেড পেমেন্ট" : "Simulated Secure Payment"}
              </h3>
              <p className="text-[11px] font-mono text-emerald-400">
                100% SIMULATED • NO REAL MONEY CHARGED
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5">
          {successPayload ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">
                  {locale === "bn" ? "পেমেন্ট সফল হয়েছে!" : "Simulated Payment Successful!"}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  {locale === "bn"
                    ? "আপনার সিমুলেটেড অর্ডার/বুকিং নিশ্চিত করা হয়েছে।"
                    : "Your simulated checkout has been successfully processed."}
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
                  <span className="text-slate-400">Method:</span>
                  <span className="text-amber-300">{successPayload.methodLabel}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white">
                  <span>Amount Paid:</span>
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
                <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-2">
                  <span className="text-xs text-slate-400">Total Payable:</span>
                  <span className="text-lg font-mono font-black text-amber-300">
                    {formatBdtFromPoisha(amountPoisha, locale)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  {locale === "bn" ? "পেমেন্ট মাধ্যম নির্বাচন করুন:" : "Select Simulated Payment Method:"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: "SHASTHOPAY_MFS" as SimulatedPaymentMethod,
                      name: "ShasthoPay MFS",
                      sub: "Simulated MFS",
                      icon: Smartphone,
                    },
                    {
                      id: "DIGITAL_DIRECT_PAY" as SimulatedPaymentMethod,
                      name: "Direct Pay",
                      sub: "Instant Demo",
                      icon: Zap,
                    },
                    {
                      id: "SMART_CARD_DEMO" as SimulatedPaymentMethod,
                      name: "Health Card",
                      sub: "Debit Demo",
                      icon: CreditCard,
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
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
                      <span>Simulated MFS Mobile Number:</span>
                      <span className="text-[10px] text-cyan-400 font-mono">Demo Prefilled</span>
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
                      <Zap className="w-4 h-4" /> 1-Click Simulated Digital Direct Pay
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Instantly charges demo wallet balance tied to your Smart Health ID Card (`SS-PT-884920`).
                    </p>
                  </div>
                )}

                {method === "SMART_CARD_DEMO" && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 block">Simulated Card Number:</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full min-h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={processing}
                onClick={handlePay}
                className="w-full min-h-12 rounded-xl bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Simulated Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Pay {formatBdtFromPoisha(amountPoisha, locale)} (Simulated) →
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
