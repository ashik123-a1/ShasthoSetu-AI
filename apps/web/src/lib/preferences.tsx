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
  return saved === "dark" || saved === "light" ? saved : "dark";
}

function readInitialMotionPaused(): boolean {
  if (typeof window === "undefined") return false;
  const saved = window.localStorage.getItem(MOTION_KEY);
  // Default is always false (animations ON for everyone)
  return saved === "true";
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const [motionPaused, setMotionPausedState] = useState<boolean>(readInitialMotionPaused);
  const [preloaderOpen, setPreloaderOpen] = useState<boolean>(true);
  const [preloaderReplayNonce, setPreloaderReplayNonce] = useState<number>(0);

  const completePreloader = () => {
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

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
