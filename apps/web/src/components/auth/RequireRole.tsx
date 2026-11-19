import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/authContext";
import type { AppRole } from "../../lib/roleNavigation";
import { Skeleton } from "../ui";

interface RequireRoleProps {
  allowedRoles: AppRole[];
  allowPendingDoctor?: boolean;
  children: React.ReactNode;
}

export function RequireRole({ allowedRoles, allowPendingDoctor = false, children }: RequireRoleProps) {
  const { user, authenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-canvas)]">
        <div className="w-full max-w-md space-y-3" data-testid="auth-loading-state">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    const nextUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${nextUrl}`} replace />;
  }

  if (!allowedRoles.includes(user.primary_role)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, role: user.primary_role }} />;
  }

  if (
    user.primary_role === "DOCTOR" &&
    !allowPendingDoctor &&
    user.doctor_profile &&
    user.doctor_profile.verification_status !== "APPROVED"
  ) {
    return <Navigate to="/doctor/onboarding-status" replace />;
  }

  return <>{children}</>;
}
