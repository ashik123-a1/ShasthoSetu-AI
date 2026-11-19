import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiGet, apiPost } from "./apiClient";
import type { AppRole } from "./roleNavigation";

export interface DoctorProfileSummary {
  id: string;
  verification_status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  display_name: string;
  display_name_bn?: string | null;
  is_active: number;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  full_name: string;
  primary_role: AppRole;
  preferred_locale: "bn" | "en";
  account_status: string;
  is_synthetic?: number;
  doctor_profile?: DoctorProfileSummary | null;
}

export interface RegisterInput {
  full_name: string;
  email?: string;
  phone?: string;
  password: string;
  district?: string;
  preferred_locale?: string;
}

export interface DoctorApplyInput {
  full_name: string;
  display_name_bn?: string;
  email: string;
  phone?: string;
  password: string;
  degrees: string;
  specialty: string;
  bmdc_demo_reg: string;
  practice_location?: string;
  district?: string;
  consultation_fee_bdt?: number;
  bio?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  authenticated: boolean;
  loading: boolean;
  refreshMe: () => Promise<AuthUser | null>;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterInput) => Promise<AuthUser>;
  doctorApply: (payload: DoctorApplyInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function roleHomePath(user: AuthUser | null): string {
  if (!user) return "/login";
  switch (user.primary_role) {
    case "PATIENT":
      return "/patient/dashboard";
    case "DOCTOR":
      if (user.doctor_profile && user.doctor_profile.verification_status !== "APPROVED") {
        return "/doctor/onboarding-status";
      }
      return "/doctor/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "SUPPORT":
      return "/support/dashboard";
    default:
      return "/";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const data = await apiGet<{ authenticated: boolean; user: AuthUser | null }>("/v1/auth/me");
      if (data.authenticated && data.user) {
        setUser(data.user);
        return data.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (identifier: string, password: string): Promise<AuthUser> => {
    const res = await apiPost<{ authenticated: boolean; user: AuthUser }>("/v1/auth/login", {
      identifier,
      password,
    });
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (payload: RegisterInput): Promise<AuthUser> => {
    const res = await apiPost<{ authenticated: boolean; user: AuthUser }>("/v1/auth/register", payload);
    setUser(res.user);
    return res.user;
  }, []);

  const doctorApply = useCallback(async (payload: DoctorApplyInput): Promise<AuthUser> => {
    const res = await apiPost<{ authenticated: boolean; user: AuthUser }>("/v1/auth/doctor-apply", payload);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/v1/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: Boolean(user),
        loading,
        refreshMe,
        login,
        register,
        doctorApply,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
