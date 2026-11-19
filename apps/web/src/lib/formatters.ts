import type { Locale } from "./i18n";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBanglaDigits(input: string): string {
  return input.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/**
 * Formats integer Poisha (100 Poisha = 1 BDT) without IEEE-754 floating-point drift.
 */
export function formatBdtFromPoisha(amountMinorPoisha: number, locale: Locale): string {
  const sign = amountMinorPoisha < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amountMinorPoisha));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;

  const groupedWhole = new Intl.NumberFormat(locale === "bn" ? "en-IN" : "en-IN").format(whole);
  const base = frac === 0 ? `${groupedWhole}.00` : `${groupedWhole}.${String(frac).padStart(2, "0")}`;
  const localized = locale === "bn" ? toBanglaDigits(base) : base;
  return `${sign}৳ ${localized}`;
}

export function formatDhakaDateTime(isoUtc: string, locale: Locale): string {
  const dt = new Date(isoUtc);
  if (Number.isNaN(dt.getTime())) return isoUtc;
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(dt);
}
