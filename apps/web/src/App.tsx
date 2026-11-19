import React, { useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell, GlobalCursorGlow, ToastProvider, useToast, type PillTabItem } from "./components/ui";
import { HomeSectionRail } from "./components/layout/HomeSectionRail";
import { AuthProvider } from "./lib/authContext";
import { I18nProvider, useI18n } from "./lib/i18n";
import { PreferencesProvider, usePreferences } from "./lib/preferences";
import type { AppRole } from "./lib/roleNavigation";
import { RequireRole } from "./components/auth/RequireRole";
import { PublicHomePage } from "./pages/PublicHomePage";
import { BloodConnectPage } from "./pages/BloodConnectPage";
import { FindCarePage } from "./pages/FindCarePage";
import { PublicDoctorsPage } from "./pages/PublicDoctorsPage";
import { PublicConsultationsPage } from "./pages/PublicConsultationsPage";
import { PublicServicesPage } from "./pages/PublicServicesPage";
import { PublicResearchPage } from "./pages/PublicResearchPage";
import { ResearchModelDetailPage } from "./pages/ResearchModelDetailPage";
import { HealthJournalPage } from "./pages/HealthJournalPage";
import { PublicAboutPage } from "./pages/PublicAboutPage";
import { PublicCareMapPage } from "./pages/PublicCareMapPage";
import { PcosFeaturePage } from "./pages/PcosFeaturePage";
import { ViralRashFeaturePage } from "./pages/ViralRashFeaturePage";
import { PrescriptionOcrFeaturePage } from "./pages/PrescriptionOcrFeaturePage";
import { BanglaVoiceFeaturePage } from "./pages/BanglaVoiceFeaturePage";
import { PediatricRashFeaturePage } from "./pages/PediatricRashFeaturePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DoctorApplyPage } from "./pages/DoctorApplyPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { PatientPortalPage } from "./pages/PatientPortalPage";
import { DoctorPortalPage } from "./pages/DoctorPortalPage";
import { AdminPortalPage } from "./pages/AdminPortalPage";
import { SupportPortalPage } from "./pages/SupportPortalPage";
import { DevDesignSystemPage } from "./pages/DevDesignSystemPage";

function DevGalleryShellWrapper() {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [activeRole, setActiveRole] = useState<AppRole>("PATIENT");
  const [activeTabId, setActiveTabId] = useState("overview");
  const [offlineSimulated, setOfflineSimulated] = useState(false);

  const navTabs = useMemo<PillTabItem[]>(
    () => [
      { id: "overview", label: t("tabs.overview") },
      { id: "tables", label: t("tabs.tables") },
      { id: "badges", label: t("tabs.badges") },
      { id: "states", label: t("tabs.states") },
    ],
    [t]
  );

  return (
    <AppShell
      activeRole={activeRole}
      onChangeRole={setActiveRole}
      navTabs={navTabs}
      activeTabId={activeTabId}
      onSelectTab={setActiveTabId}
      offlineSimulated={offlineSimulated}
      onTriggerSampleToast={() =>
        pushToast({
          title: t("modal.sampleToastTitle"),
          description: t("modal.sampleToastDesc"),
          tone: "success",
        })
      }
    >
      <DevDesignSystemPage
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        activeTabId={activeTabId}
        offlineSimulated={offlineSimulated}
        onToggleOffline={() => setOfflineSimulated((v) => !v)}
      />
    </AppShell>
  );
}

function AppRoutes() {
  const { motionPaused } = usePreferences();

  return (
    <MotionConfig reducedMotion={motionPaused ? "always" : "user"}>
      <HomeSectionRail />
      <GlobalCursorGlow />
      <Routes>
        {/* Public Routes (Home & /features/* untouched) */}
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/blood-connect" element={<BloodConnectPage />} />
        <Route path="/find-care" element={<FindCarePage />} />
        <Route path="/doctors" element={<PublicDoctorsPage />} />
        <Route path="/doctors/:doctorId" element={<PublicDoctorsPage />} />
        <Route path="/care-map" element={<PublicCareMapPage />} />
        <Route path="/features/pcos" element={<PcosFeaturePage />} />
        <Route path="/features/viral-rash" element={<ViralRashFeaturePage />} />
        <Route path="/features/prescription-ocr" element={<PrescriptionOcrFeaturePage />} />
        <Route path="/features/bangla-voice" element={<BanglaVoiceFeaturePage />} />
        <Route path="/features/pediatric-rash" element={<PediatricRashFeaturePage />} />
        <Route path="/consultations" element={<PublicConsultationsPage />} />
        <Route path="/services" element={<PublicServicesPage />} />
        <Route path="/research" element={<PublicResearchPage />} />
        <Route path="/research/:modelSlug" element={<ResearchModelDetailPage />} />
        <Route path="/journal" element={<HealthJournalPage />} />
        <Route path="/about" element={<PublicAboutPage />} />

        {/* Auth & Onboarding Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/doctor-apply" element={<DoctorApplyPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Patient Portal (Strict RBAC: PATIENT) */}
        <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />
        <Route path="/patient/dashboard" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="dashboard" /></RequireRole>} />
        <Route path="/patient/doctors" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="doctors" /></RequireRole>} />
        <Route path="/patient/appointments" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="appointments" /></RequireRole>} />
        <Route path="/patient/consultations" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="consultations" /></RequireRole>} />
        <Route path="/patient/payments" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="payments" /></RequireRole>} />
        <Route path="/patient/receipts/:paymentId" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="receipt" /></RequireRole>} />
        <Route path="/patient/records" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="records" /></RequireRole>} />
        <Route path="/patient/ocr-review" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="ocr" /></RequireRole>} />
        <Route path="/patient/medicines" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="medicines" /></RequireRole>} />
        <Route path="/patient/pcos" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="pcos" /></RequireRole>} />
        <Route path="/patient/pediatric" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="pediatric" /></RequireRole>} />
        <Route path="/patient/diagnostics" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="diagnostics" /></RequireRole>} />
        <Route path="/patient/support" element={<RequireRole allowedRoles={["PATIENT"]}><PatientPortalPage section="support" /></RequireRole>} />

        {/* Doctor Portal (Strict RBAC: DOCTOR + APPROVED gate) */}
        <Route path="/doctor" element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="/doctor/onboarding-status" element={<RequireRole allowedRoles={["DOCTOR"]} allowPendingDoctor><DoctorPortalPage section="dashboard" /></RequireRole>} />
        <Route path="/doctor/dashboard" element={<RequireRole allowedRoles={["DOCTOR"]}><DoctorPortalPage section="dashboard" /></RequireRole>} />
        <Route path="/doctor/availability" element={<RequireRole allowedRoles={["DOCTOR"]}><DoctorPortalPage section="availability" /></RequireRole>} />
        <Route path="/doctor/calendar" element={<RequireRole allowedRoles={["DOCTOR"]}><DoctorPortalPage section="calendar" /></RequireRole>} />
        <Route path="/doctor/appointments" element={<RequireRole allowedRoles={["DOCTOR"]}><DoctorPortalPage section="appointments" /></RequireRole>} />
        <Route path="/doctor/consultations/:appointmentId" element={<RequireRole allowedRoles={["DOCTOR"]}><DoctorPortalPage section="workspace" /></RequireRole>} />
        <Route path="/doctor/referrals" element={<RequireRole allowedRoles={["DOCTOR"]}><DoctorPortalPage section="referrals" /></RequireRole>} />
        <Route path="/doctor/profile" element={<RequireRole allowedRoles={["DOCTOR"]}><DoctorPortalPage section="profile" /></RequireRole>} />

        {/* Admin Portal (Strict RBAC: ADMIN) */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="dashboard" /></RequireRole>} />
        <Route path="/admin/doctors" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="doctors" /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="users" /></RequireRole>} />
        <Route path="/admin/appointments" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="appointments" /></RequireRole>} />
        <Route path="/admin/payments" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="payments" /></RequireRole>} />
        <Route path="/admin/config" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="config" /></RequireRole>} />
        <Route path="/admin/support" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="support" /></RequireRole>} />
        <Route path="/admin/audit-logs" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="audit" /></RequireRole>} />
        <Route path="/admin/research-registry" element={<RequireRole allowedRoles={["ADMIN"]}><AdminPortalPage section="research" /></RequireRole>} />

        {/* Support Portal (Strict RBAC: SUPPORT + Zero-PHI) */}
        <Route path="/support" element={<Navigate to="/support/dashboard" replace />} />
        <Route path="/support/dashboard" element={<RequireRole allowedRoles={["SUPPORT"]}><SupportPortalPage section="dashboard" /></RequireRole>} />
        <Route path="/support/tickets" element={<RequireRole allowedRoles={["SUPPORT"]}><SupportPortalPage section="tickets" /></RequireRole>} />
        <Route path="/support/faq" element={<RequireRole allowedRoles={["SUPPORT"]}><SupportPortalPage section="faq" /></RequireRole>} />
        <Route path="/support/profile" element={<RequireRole allowedRoles={["SUPPORT"]}><SupportPortalPage section="tickets" /></RequireRole>} />

        {/* Isolated Developer Design System Gallery */}
        <Route path="/dev/design-system" element={<DevGalleryShellWrapper />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MotionConfig>
  );
}

export function App({ routerWrapper }: { routerWrapper?: React.ComponentType<{ children: React.ReactNode }> } = {}) {
  const inner = (
    <PreferencesProvider>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </PreferencesProvider>
  );

  if (routerWrapper) {
    const Wrapper = routerWrapper;
    return <Wrapper>{inner}</Wrapper>;
  }

  return <BrowserRouter>{inner}</BrowserRouter>;
}

export default App;
