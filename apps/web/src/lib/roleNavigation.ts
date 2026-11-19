import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Baby,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileText,
  FlaskConical,
  FolderHeart,
  LayoutDashboard,
  LifeBuoy,
  Pill,
  ScanText,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";

export type AppRole = "PATIENT" | "DOCTOR" | "ADMIN" | "SUPPORT";

export interface RoleNavItem {
  id: string;
  labelKey: string;
  previewPath: string;
  icon: LucideIcon;
  sampleBadge?: string;
}

export const FOUR_ROLE_NAV_CONFIG: Record<AppRole, RoleNavItem[]> = {
  PATIENT: [
    { id: "pt-dash", labelKey: "nav.patient.dashboard", previewPath: "/patient/dashboard", icon: LayoutDashboard },
    { id: "pt-docs", labelKey: "nav.patient.doctors", previewPath: "/patient/doctors", icon: Stethoscope },
    { id: "pt-apts", labelKey: "nav.patient.appointments", previewPath: "/patient/appointments", icon: CalendarCheck, sampleBadge: "2" },
    { id: "pt-pay", labelKey: "nav.patient.payments", previewPath: "/patient/payments", icon: CreditCard },
    { id: "pt-phr", labelKey: "nav.patient.records", previewPath: "/patient/records", icon: FolderHeart },
    { id: "pt-ai", labelKey: "nav.patient.aiAssistant", previewPath: "/patient/ai-assistant", icon: Sparkles },
    { id: "pt-ocr", labelKey: "nav.patient.ocr", previewPath: "/patient/ocr-review", icon: ScanText },
    { id: "pt-meds", labelKey: "nav.patient.medicines", previewPath: "/patient/medicines", icon: Pill },
    { id: "pt-epharma", labelKey: "nav.patient.epharma", previewPath: "/patient/epharma", icon: ShoppingCart },
    { id: "pt-pcos", labelKey: "nav.patient.pcos", previewPath: "/patient/pcos", icon: Activity },
    { id: "pt-ped", labelKey: "nav.patient.pediatric", previewPath: "/patient/pediatric", icon: Baby },
    { id: "pt-sup", labelKey: "nav.patient.support", previewPath: "/patient/support", icon: LifeBuoy },
  ],
  DOCTOR: [
    { id: "dr-dash", labelKey: "nav.doctor.dashboard", previewPath: "/doctor/dashboard", icon: LayoutDashboard },
    { id: "dr-gate", labelKey: "nav.doctor.onboarding", previewPath: "/doctor/onboarding-status", icon: ShieldCheck },
    { id: "dr-avail", labelKey: "nav.doctor.availability", previewPath: "/doctor/availability", icon: CalendarClock },
    { id: "dr-cal", labelKey: "nav.doctor.calendar", previewPath: "/doctor/calendar", icon: CalendarCheck },
    { id: "dr-queue", labelKey: "nav.doctor.appointments", previewPath: "/doctor/appointments", icon: ClipboardCheck, sampleBadge: "4" },
    { id: "dr-ai", labelKey: "nav.doctor.aiAssistant", previewPath: "/doctor/ai-assistant", icon: Sparkles },
    { id: "dr-ref", labelKey: "nav.doctor.referrals", previewPath: "/doctor/referrals", icon: ShieldAlert },
    { id: "dr-prof", labelKey: "nav.doctor.profile", previewPath: "/doctor/profile", icon: FileText },
  ],
  ADMIN: [
    { id: "ad-dash", labelKey: "nav.admin.dashboard", previewPath: "/admin/dashboard", icon: LayoutDashboard },
    { id: "ad-docs", labelKey: "nav.admin.doctors", previewPath: "/admin/doctors", icon: UserCheck, sampleBadge: "3" },
    { id: "ad-users", labelKey: "nav.admin.users", previewPath: "/admin/users", icon: Users },
    { id: "ad-apts", labelKey: "nav.admin.appointments", previewPath: "/admin/appointments", icon: CalendarClock },
    { id: "ad-pay", labelKey: "nav.admin.payments", previewPath: "/admin/payments", icon: CreditCard },
    { id: "ad-cfg", labelKey: "nav.admin.config", previewPath: "/admin/config", icon: Settings2 },
    { id: "ad-rag", labelKey: "nav.admin.rag", previewPath: "/admin/rag", icon: BookOpenCheck },
    { id: "ad-sup", labelKey: "nav.admin.support", previewPath: "/admin/support", icon: ShieldAlert },
    { id: "ad-audit", labelKey: "nav.admin.audit", previewPath: "/admin/audit-logs", icon: ScrollText },
    { id: "ad-res", labelKey: "nav.admin.registry", previewPath: "/admin/research-registry", icon: FlaskConical },
  ],
  SUPPORT: [
    { id: "sup-dash", labelKey: "nav.support.dashboard", previewPath: "/support/dashboard", icon: LayoutDashboard },
    { id: "sup-tix", labelKey: "nav.support.tickets", previewPath: "/support/tickets", icon: LifeBuoy, sampleBadge: "5" },
    { id: "sup-faq", labelKey: "nav.support.macros", previewPath: "/support/faq", icon: BookOpenCheck },
    { id: "sup-ai", labelKey: "nav.support.aiFaq", previewPath: "/support/ai-assistant", icon: Sparkles },
    { id: "sup-prof", labelKey: "nav.support.profile", previewPath: "/support/profile", icon: FileText },
  ],
};
