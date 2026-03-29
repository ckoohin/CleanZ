import { LucideIcon } from "lucide-react";

export interface Category {
  icon: LucideIcon;
  label: string;
  color: string;
}

export type ServiceTag = 
  | "cleaning"
  | "repair"
  | "health"
  | "beauty"
  | "education"
  | "sports";

export interface Service {
  id: string;

  title: string;
  description: string;

  image: string;

  tag: ServiceTag;

  rating: number;       // ⭐ number chuẩn
  reviewCount: number;  // số lượng review

  price: number;        // 💰 number để tính toán
  currency: "USD" | "VND";

  unit: "service" | "hour" | "visit";

  durationMinutes: number; // ⏱ chuẩn hoá time
}

export interface WhyUs {
  icon: LucideIcon;
  title: string;
  desc: string;
}


