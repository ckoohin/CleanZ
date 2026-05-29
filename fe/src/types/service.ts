export interface ServiceItem {
  id: string | number;
  title: string;
  desc: string;
  image: string;
  tag: string;
  rating: string | number;
  reviews: string | number;
  price: string;
  unit: string;
  duration: string;
  bookingUrl?: string;
}

export interface ServiceCardProps {
  service: ServiceItem;
  className?: string;
  index?: number;
}

export interface ServicesSectionProps {
  title?: string;
  subtitle?: string;
  services: ServiceItem[];
  viewAllHref?: string;
  className?: string;
}
