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
}

export interface ServiceCardProps {
  service: ServiceItem;
}

export interface ServicesSectionProps {
  title?: string;
  subtitle?: string;
  services: ServiceItem[];
  viewAllHref?: string;
  className?: string;
}