import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

interface PreferencesContextValue {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
  motionPaused: boolean;
  setMotionPaused: (paused: boolean) => void;
  toggleMotionPaused: () => void;
}

const THEME_KEY = "ss-theme";
const MOTION_KEY = "ss-pause-motion";

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === "dark" || saved === "light" ? saved : "light";
}

function readInitialMotionPaused(): boolean {
  if (typeof window === "undefined") return false;
  const saved = window.localStorage.getItem(MOTION_KEY);
  if (saved === "true") return true;
  if (saved === "false") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const [motionPaused, setMotionPausedState] = useState<boolean>(readInitialMotionPaused);

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
    }),
    [theme, motionPaused]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
