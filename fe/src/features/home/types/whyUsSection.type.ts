import { LucideIcon } from "lucide-react";

export interface WhyUsItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface StatItem {
  value: string;
  label: string;
  variant?: "primary" | "default";
}

export interface WhyUsSectionProps {
  badge?: string;
  title?: string;
  titleHighlight?: string;
  items: WhyUsItem[];
  stats: StatItem[];
  images: { src: string; alt: string }[];
  className?: string;
}