import { LucideIcon } from "lucide-react";

export interface CategoryItem {
  icon: LucideIcon;
  label: string;
  color: string;
  href?: string;
}

export interface ServiceItem {
  id: string | number;
  title: string;
  desc: string;
  image: string;
  tag: string;
  rating: string;
  reviews: string;
  price: string;
  unit: string;
  duration: string;
  bookingUrl?: string;
  categoryId?: string;
}
