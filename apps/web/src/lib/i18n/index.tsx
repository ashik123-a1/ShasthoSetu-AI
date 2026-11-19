import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import bnCatalog from "./bn.json";
import enCatalog from "./en.json";

export type Locale = "bn" | "en";
export type TranslationCatalog = typeof bnCatalog;

const CATALOGS: Record<Locale, TranslationCatalog> = {
  bn: bnCatalog,
  en: enCatalog,
};

const STORAGE_KEY = "ss-locale";

function lookupKey(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let curr: unknown = obj;
  for (const part of parts) {
    if (curr && typeof curr === "object" && part in curr) {
      curr = (curr as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof curr === "string" ? curr : path;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "bn";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "bn" ? stored : "bn";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = (next: Locale) => setLocaleState(next);
  const toggleLocale = () => setLocaleState((prev) => (prev === "bn" ? "en" : "bn"));

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, params?: Record<string, string | number>) => {
      let raw = lookupKey(CATALOGS[locale] as unknown as Record<string, unknown>, key);
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          raw = raw.replaceAll(`{${k}}`, String(v));
        }
      }
      return raw;
    };
    return { locale, setLocale, toggleLocale, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export { bnCatalog, enCatalog };
