"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Clock, ArrowRight } from "lucide-react";

interface Service {
  image: string;
  tag: string;
  rating: string;
  reviews: string;
  title: string;
  desc: string;
  price: string;
  unit: string;
  duration: string;
}

interface Props {
  services: Service[];
}

export default function ServicesSection({ services }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-6 mb-32">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            Recommended Services
          </h2>
          <p className="text-muted-foreground text-sm">
            Handpicked professionals based on your activity.
          </p>
        </div>
        <Button variant="ghost" className="text-primary font-semibold gap-1 group">
          View all
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((s) => (
          <Card
            key={s.title}
            className="group overflow-hidden border border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={s.image}
                alt={s.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-foreground flex items-center gap-1 border border-border/50">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {s.rating} ({s.reviews})
              </div>
              <div className="absolute bottom-3 left-3">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-bold">
                  {s.tag}
                </Badge>
              </div>
            </div>

            <CardContent className="p-5 flex-1 flex flex-col gap-2">
              <h3 className="font-bold text-base text-foreground">{s.title}</h3>
              <p className="text-muted-foreground text-sm line-clamp-2 flex-1">{s.desc}</p>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{s.price}</span>
                  <span className="text-muted-foreground text-xs">{s.unit}</span>
                </div>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {s.duration}
                </span>
              </div>
              <Button className="w-full mt-2 font-semibold" size="sm" variant="ghost">
                Book Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}