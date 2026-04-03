import { LucideIcon } from "lucide-react";

export interface CategoryItem {
  icon: LucideIcon;
  label: string;
  color: string;
  href?: string;
}

export interface CategorySectionProps {
  items: CategoryItem[];
  className?: string;
}