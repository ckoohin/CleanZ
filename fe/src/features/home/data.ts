import { Award, BookOpen, CreditCard, Dumbbell, HeartPulse, Scissors, Sparkles, UserCheck, Wrench } from "lucide-react";
import { Service } from "./types/home.type";

export const CATEGORIES = [
    { icon: Wrench, label: "Repair", color: "bg-blue-50 text-blue-600" },
    { icon: Sparkles, label: "Cleaning", color: "bg-emerald-50 text-emerald-600" },
    { icon: Scissors, label: "Beauty", color: "bg-rose-50 text-rose-600" },
    { icon: HeartPulse, label: "Health", color: "bg-red-50 text-red-600" },
    { icon: BookOpen, label: "Education", color: "bg-amber-50 text-amber-600" },
    { icon: Dumbbell, label: "Sports", color: "bg-violet-50 text-violet-600" },
];

export const SERVICES: Service[] = [
  {
    id: "svc_001",
    title: "Full Home Deep Cleaning",
    description:
      "Complete sanitization of all surfaces, detailed kitchen and bathroom scrub, and window detailing.",

    image: "https://...",

    tag: "cleaning",

    rating: 4.9,
    reviewCount: 128,

    price: 120,
    currency: "USD",

    unit: "service",

    durationMinutes: 270, // 4.5h
  },
  {
    id: "svc_002",
    title: "HVAC Performance Audit",
    description:
      "Complete diagnostics of your cooling and heating systems to ensure maximum efficiency.",

    image: "https://...",

    tag: "repair",

    rating: 5.0,
    reviewCount: 84,

    price: 85,
    currency: "USD",

    unit: "visit",

    durationMinutes: 90,
  },
  {
    id: "svc_003",
    title: "Private Hatha Yoga",
    description:
      "Personalized 1-on-1 session focusing on alignment, breathwork, and mental clarity.",

    image: "https://...",

    tag: "health",

    rating: 4.8,
    reviewCount: 210,

    price: 60,
    currency: "USD",

    unit: "hour",

    durationMinutes: 60,
  },
];

export const WHY_US = [
    { icon: CreditCard, title: "Upfront Pricing", desc: "No hidden fees or surprise hourly charges. You know the cost before you book." },
    { icon: UserCheck, title: "Elite Vetting", desc: "Only the top 3% of service providers pass our multi-stage background and skill check." },
    { icon: Award, title: "Clarity Guarantee", desc: "Not satisfied? We'll make it right or give you your money back. No questions asked." },
];