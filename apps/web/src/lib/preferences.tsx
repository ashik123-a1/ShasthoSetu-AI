import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

interface PreferencesContextValue {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
  motionPaused: boolean;
  setMotionPaused: (paused: boolean) => void;
  toggleMotionPaused: () => void;
  preloaderOpen: boolean;
  preloaderReplayNonce: number;
  completePreloader: () => void;
  replayPreloader: () => void;
}

const THEME_KEY = "ss-theme";
const MOTION_KEY = "ss-pause-motion";

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "dark";
}

function readInitialMotionPaused(): boolean {
  if (typeof window === "undefined") return false;
  // One-time auto-reset to guarantee animations ON by default for everyone
  if (window.localStorage.getItem("ss-motion-default-v4") !== "1") {
    window.localStorage.setItem("ss-motion-default-v4", "1");
    window.localStorage.removeItem(MOTION_KEY);
    return false;
  }
  const saved = window.localStorage.getItem(MOTION_KEY);
  // Default is always false (animations ON for everyone)
  return saved === "true";
}

const PRELOADER_SEEN_KEY = "ss-preloader-seen-v1";

function readInitialPreloaderOpen(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(PRELOADER_SEEN_KEY) !== "1";
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const [motionPaused, setMotionPausedState] = useState<boolean>(readInitialMotionPaused);
  const [preloaderOpen, setPreloaderOpen] = useState<boolean>(readInitialPreloaderOpen);
  const [preloaderReplayNonce, setPreloaderReplayNonce] = useState<number>(0);

  const completePreloader = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PRELOADER_SEEN_KEY, "1");
    }
    setPreloaderOpen(false);
  };

  const replayPreloader = () => {
    setPreloaderReplayNonce((n) => n + 1);
    setPreloaderOpen(true);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", motionPaused);
    window.localStorage.setItem(MOTION_KEY, String(motionPaused));
  }, [motionPaused]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === "light" ? "dark" : "light")),
      motionPaused,
      setMotionPaused: setMotionPausedState,
      toggleMotionPaused: () => setMotionPausedState((m) => !m),
      preloaderOpen,
      preloaderReplayNonce,
      completePreloader,
      replayPreloader,
    }),
    [theme, motionPaused, preloaderOpen, preloaderReplayNonce]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

const defaultPreferences: PreferencesContextValue = {
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
  motionPaused: false,
  setMotionPaused: () => {},
  toggleMotionPaused: () => {},
  preloaderOpen: false,
  preloaderReplayNonce: 0,
  completePreloader: () => {},
  replayPreloader: () => {},
};

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) return defaultPreferences;
  return ctx;
}
