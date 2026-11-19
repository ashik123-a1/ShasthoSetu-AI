export interface HeroDoctorSlide {
  id: string;
  src: string;
  tag: string;
  titleEn: string;
  titleBn: string;
  captionEn: string;
  captionBn: string;
  accent: string;
}

export const HERO_DOCTOR_SLIDES: HeroDoctorSlide[] = [
  {
    id: "back-to-back",
    src: "/images/hero/hero-doctors-back-to-back.jpg",
    tag: "BMDC DEMO TEAM • UNIFIED CARE",
    titleEn: "Specialist Clinicians Standing Back-to-Back for Every Family",
    titleBn: "প্রতিটি পরিবারের পাশে দাঁড়ানো সমন্বিত বিশেষজ্ঞ চিকিৎসক দল",
    captionEn: "Coordinated gynecology, pediatrics, dermatology & safe digital follow-up",
    captionBn: "স্ত্রীরোগ, শিশুরোগ, চর্মরোগ ও নিরাপদ ডিজিটাল প্রেসক্রিপশন সমন্বয়",
    accent: "#38bdf8",
  },
  {
    id: "telemedicine",
    src: "/images/hero/hero-doctors-telemedicine.jpg",
    tag: "MATERNAL & CHILD CARE • TELEMEDICINE",
    titleEn: "Compassionate Family & Pediatric Video Consultations",
    titleBn: "মা ও শিশুর জন্য সহানুভূতিশীল টেলিমেডিসিন পরামর্শ",
    captionEn: "Verified slot reservations with Asia/Dhaka schedule clarity & isolation",
    captionBn: "শিশু-নির্ভরশীল প্রোফাইল ও এশিয়া/ঢাকা সময়সূচী অনুযায়ী নিশ্চিত বুকিং",
    accent: "#2dd4bf",
  },
  {
    id: "ai-lab",
    src: "/images/hero/hero-doctors-ai-lab.jpg",
    tag: "CLINICIAN-REVIEWED AI • NON-DIAGNOSTIC",
    titleEn: "Doctor-in-the-Loop Multimodal Research Diagnostics",
    titleBn: "চিকিৎসক-নিয়ন্ত্রিত মাল্টিমডাল গবেষণা ও ওসিআর বিশ্লেষণ",
    captionEn: "Human verification required before any OCR medicine enters your schedule",
    captionBn: "মানব যাচাই ছাড়া কোনো ওসিআর ওষুধ সময়সূচীতে যুক্ত হয় না",
    accent: "#f2c879",
  },
  {
    id: "care-team",
    src: "/images/hero/hero-doctors-team-care.jpg",
    tag: "8-DIVISION HOSPITAL ATLAS • BANGLADESH",
    titleEn: "Connected Care Network Across All 8 Divisions",
    titleBn: "বাংলাদেশের ৮টি বিভাগে সংযুক্ত স্বাস্থ্যসেবা নেটওয়ার্ক",
    captionEn: "Dhaka, Chattogram, Rajshahi, Sylhet, Khulna, Barishal, Rangpur & Mymensingh",
    captionBn: "ঢাকা, চট্টগ্রাম, রাজশাহী, সিলেট, খুলনা, বরিশাল, রংপুর ও ময়মনসিংহ",
    accent: "#818cf8",
  },
];
