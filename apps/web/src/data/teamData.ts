export interface TeamMember {
  id: string;
  memberNo: string;
  name: string;
  nameBn: string;
  role: string;
  roleBn: string;
  phone: string;
  email: string;
  image: string;
  badge: string;
  badgeBn: string;
  skills: string[];
  bio: string;
  bioBn: string;
  isLeader?: boolean;
}

export const TEAM_INFO = {
  project: "ShasthoSetu AI",
  tagline: "Empowering 170M Citizens with AI-Grounded Clinical Telemedicine",
  region: "Dhaka, Bangladesh",
  teamSize: 5,
  githubRepoUrl: "https://github.com/ashik123-a1/ShasthoSetu-AI",
  liveWebsiteUrl: "https://shasthosetu.fit/",
  demoHelpline: "+880 9612-SHASTHO (74278)",
};

export const OFFICIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "member-01",
    memberNo: "Team Leader",
    name: "Nakib Md Ashik",
    nameBn: "নকীব মো: আশিক",
    role: "Team Leader & System Architect",
    roleBn: "টিম লিডার ও প্রধান সিস্টেম আর্কিটেক্ট",
    phone: "+880 1771449164",
    email: "ashiknakib25@gmail.com",
    image: "/images/team/nakib_md_ashik.png",
    badge: "Leadership & Full-Stack Architecture",
    badgeBn: "নেতৃত্ব ও ফুলস্ট্যাক আর্কিটেকচার",
    skills: ["System Architecture", "Bilingual RAG", "Whisper ASR", "Full-Stack Integration", "Zero-PHI Security"],
    bio: "Leading ShasthoSetu AI end-to-end architecture, coordinating multilingual RAG retrieval, WebRTC teleconsultations, and human-in-the-loop Safe-OCR pipelines.",
    bioBn: "স্বাস্থ্যসেতু এআই-এর সার্বিক আর্কিটেকচার, বহুভাষিক RAG রিট্রিভাল, রিয়েল-টাইম WebRTC টেলিমেডিসিন এবং মানব-যাচাইকৃত Safe-OCR পাইপলাইনের নেতৃত্ব দিচ্ছেন।",
    isLeader: true,
  },
  {
    id: "member-02",
    memberNo: "Member 01",
    name: "Mynuddin Ahmed",
    nameBn: "মঈনুদ্দিন আহমেদ",
    role: "Frontend & 3D Geospatial UI/UX Designer",
    roleBn: "ফ্রন্টএন্ড ও ৩ডি জিওস্প্যাশিয়াল UI/UX ডিজাইনার",
    phone: "+880 1643897205",
    email: "mayanahmedopu@gmail.com",
    image: "/images/team/mynuddin_ahmed.png",
    badge: "3D Twin & Visual Engineering",
    badgeBn: "৩ডি টুইন ও ভিজ্যুয়াল ইঞ্জিনিয়ারিং",
    skills: ["Three.js 3D Twins", "Tailwind CSS", "Leaflet GeoJSON", "Responsive Glassmorphism", "Micro-Interactions"],
    bio: "Engineered the interactive 3D holographic body scanner, 8-division illuminated Leaflet healthcare atlas, and high-performance clinical design systems.",
    bioBn: "ইন্টারেক্টিভ ৩ডি হলোগ্রাফিক স্ক্যানার, ৮-বিভাগ আলোকিত লিফলেট ন্যাশনাল হেলথকেয়ার অ্যাটলাস এবং আধুনিক ক্লিনিক্যাল ডিজাইন সিস্টেম বাস্তবায়ন করেছেন।",
  },
  {
    id: "member-03",
    memberNo: "Member 02",
    name: "Hasin Ishruq",
    nameBn: "হাসিন ইশরুক",
    role: "Clinical AI & ML Research Engineer",
    roleBn: "ক্লিনিক্যাল এআই ও মেশিন লার্নিং রিসার্চ ইঞ্জিনিয়ার",
    phone: "+880 1405080369",
    email: "hasin.ishruq@gmail.com",
    image: "/images/team/hasin_ishruq.png",
    badge: "Multimodal Vision & OCR",
    badgeBn: "মাল্টিমোডাল ভিশন ও ওসিআর",
    skills: ["EasyOCR Bilingual", "PyTorch Inference", "DermoPed AI", "PCOS Ultrasound", "Domain Guardrails"],
    bio: "Spearheaded clinical vision benchmarks, domain guardrail filters for ultrasound & dermopediatrics, and verifiable prescription extraction audits.",
    bioBn: "ক্লিনিক্যাল কম্পিউটার ভিশন মডেল, আল্ট্রাসাউন্ড ও চর্মরোগের ডোমেইন গার্ডরেইল ফিল্টার এবং দ্বিভাষিক প্রেসক্রিপশন এক্সট্রাকশন অডিট পরিচালনা করেছেন।",
  },
  {
    id: "member-04",
    memberNo: "Member 03",
    name: "Al Kabir",
    nameBn: "আল কবির",
    role: "Backend, Security & Telemetry Engineer",
    roleBn: "ব্যাকএন্ড, সিকিউরিটি ও টেলিমেট্রি ইঞ্জিনিয়ার",
    phone: "+880 01798323391",
    email: "alkabir.cse@gmail.com",
    image: "/images/team/al_kabir.png",
    badge: "SQLite Security & Zero-PHI",
    badgeBn: "SQLite সিকিউরিটি ও জিরো-PHI",
    skills: ["FastAPI Microservices", "SQLite 54 Tables", "Zero-PHI HTTP 403", "Audit Trail", "WebRTC Signaling"],
    bio: "Architected the FastAPI backend, atomic SQLite BEGIN IMMEDIATE concurrency locks, Zero-PHI support isolation, and multi-device WebRTC signaling.",
    bioBn: "FastAPI ব্যাকএন্ড, অ্যাটমিক SQLite কনকারেন্সি লকিং, জিরো-PHI ডেটা আইসোলেশন এবং মাল্টি-ডিভাইস WebRTC কল সিগন্যালিং সিস্টেম তৈরি করেছেন।",
  },
  {
    id: "member-05",
    memberNo: "Member 04",
    name: "Rifah Sunjidah Remu",
    nameBn: "রিফাহ সানজিদা রেমু",
    role: "Clinical QA & Health Informatics Engineer",
    roleBn: "ক্লিনিক্যাল QA ও হেলথ ইনফরমেটিক্স ইঞ্জিনিয়ার",
    phone: "+880 1798727607",
    email: "rifahsunjidahremu@gmail.com",
    image: "/images/team/rifah_sunjidah_remu.png",
    badge: "Clinical QA & Dataset Validation",
    badgeBn: "ক্লিনিক্যাল QA ও ডেটাসেট ভ্যালিডেশন",
    skills: ["Clinical Data QA", "Dataset Validation", "UAT Testing", "Healthcare Informatics", "Audit Compliance"],
    bio: "Spearheading clinical dataset verification, pediatric triage test scenarios, user acceptance testing (UAT), and healthcare workflow quality standards for ShasthoSetu AI.",
    bioBn: "স্বাস্থ্যসেতু এআই-এর ক্লিনিক্যাল ডেটাসেট ভ্যালিডেশন, পেডিয়াট্রিক ট্রায়াজ টেস্টিং, ইউজার অ্যাকসেপ্টেন্স টেস্টিং (UAT) এবং স্বাস্থ্যসেবা মানের অডিট পরিচালনা করছেন।",
  },
];
