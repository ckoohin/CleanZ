import { LucideIcon } from "lucide-react";

export interface CategoryItem {
  icon: LucideIcon;
  label: string;
  color: string;
  href?: string;
  count?: number;
}

export interface CategorySectionProps {
  title?: string;
  subtitle?: string;
  items: CategoryItem[];
  viewAllHref?: string;
  className?: string;
}
