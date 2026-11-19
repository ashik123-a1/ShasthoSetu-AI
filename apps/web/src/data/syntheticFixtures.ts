import type { AppStatus } from "../components/ui";

export interface SyntheticLedgerRow {
  id: string;
  refCode: string;
  doctorBn: string;
  doctorEn: string;
  specialtyBn: string;
  specialtyEn: string;
  scheduleUtc: string;
  feePoisha: number;
  bookingStatus: AppStatus;
  paymentStatus: AppStatus;
  isSynthetic: true;
}

export const SYNTHETIC_LEDGER_ROWS: SyntheticLedgerRow[] = [
  {
    id: "syn-1",
    refCode: "DEMO-APT-101",
    doctorBn: "ডাঃ ফারহানা রহমান (নমুনা)",
    doctorEn: "Dr. Farhana Rahman (Sample)",
    specialtyBn: "স্ত্রীরোগ ও পিসিওএস",
    specialtyEn: "Gynecology & PCOS",
    scheduleUtc: "2026-11-20T04:30:00Z",
    feePoisha: 50000,
    bookingStatus: "CONFIRMED",
    paymentStatus: "DEMO_PAID",
    isSynthetic: true,
  },
  {
    id: "syn-2",
    refCode: "DEMO-APT-102",
    doctorBn: "ডাঃ তানভীর আহমেদ (নমুনা)",
    doctorEn: "Dr. Tanvir Ahmed (Sample)",
    specialtyBn: "শিশু রোগ",
    specialtyEn: "Pediatrics",
    scheduleUtc: "2026-11-20T05:15:00Z",
    feePoisha: 60000,
    bookingStatus: "AWAITING_DEMO_PAYMENT",
    paymentStatus: "DEMO_PENDING",
    isSynthetic: true,
  },
  {
    id: "syn-3",
    refCode: "DEMO-APT-103",
    doctorBn: "ডাঃ নুসরাত জাহান (নমুনা)",
    doctorEn: "Dr. Nusrat Jahan (Sample)",
    specialtyBn: "চর্ম ও ভাইরাল র‍্যাশ",
    specialtyEn: "Dermatology",
    scheduleUtc: "2026-11-20T06:00:00Z",
    feePoisha: 70000,
    bookingStatus: "CHECKED_IN",
    paymentStatus: "DEMO_PAID",
    isSynthetic: true,
  },
  {
    id: "syn-4",
    refCode: "DEMO-APT-104",
    doctorBn: "ডাঃ রফিকুল ইসলাম (নমুনা)",
    doctorEn: "Dr. Rafiqul Islam (Sample)",
    specialtyBn: "মেডিসিন",
    specialtyEn: "Internal Medicine",
    scheduleUtc: "2026-11-20T09:30:00Z",
    feePoisha: 40000,
    bookingStatus: "COMPLETED",
    paymentStatus: "DEMO_PAID",
    isSynthetic: true,
  },
  {
    id: "syn-5",
    refCode: "DEMO-APT-105",
    doctorBn: "ডাঃ সামিয়া করিম (নমুনা)",
    doctorEn: "Dr. Samia Karim (Sample)",
    specialtyBn: "শিশু ও টিকা",
    specialtyEn: "Pediatric Care",
    scheduleUtc: "2026-11-20T10:30:00Z",
    feePoisha: 55000,
    bookingStatus: "CANCELLED",
    paymentStatus: "DEMO_REFUNDED",
    isSynthetic: true,
  },
  {
    id: "syn-6",
    refCode: "DEMO-APT-106",
    doctorBn: "ডাঃ মেহেদী হাসান (নমুনা)",
    doctorEn: "Dr. Mehedi Hasan (Sample)",
    specialtyBn: "মেডিসিন",
    specialtyEn: "General Physician",
    scheduleUtc: "2026-11-20T11:15:00Z",
    feePoisha: 45000,
    bookingStatus: "BOOKING_PENDING",
    paymentStatus: "DEMO_FAILED",
    isSynthetic: true,
  },
  {
    id: "syn-7",
    refCode: "DEMO-APT-107",
    doctorBn: "ডাঃ অনন্যা সেন (নমুনা)",
    doctorEn: "Dr. Ananya Sen (Sample)",
    specialtyBn: "স্ত্রীরোগ ও প্রসূতি",
    specialtyEn: "OB-GYN",
    scheduleUtc: "2026-11-21T03:30:00Z",
    feePoisha: 80000,
    bookingStatus: "CONFIRMED",
    paymentStatus: "DEMO_PAID",
    isSynthetic: true,
  },
];

export const ALL_SAMPLE_STATUSES: AppStatus[] = [
  "BOOKING_PENDING",
  "AWAITING_DEMO_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "DEMO_PENDING",
  "DEMO_PAID",
  "DEMO_FAILED",
  "DEMO_REFUNDED",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
];
