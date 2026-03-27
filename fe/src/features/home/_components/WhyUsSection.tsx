"use client";
import { Badge } from "@/components/ui/badge";

interface WhyItem {
  icon: any;
  title: string;
  desc: string;
}

interface Props {
  items: WhyItem[];
}

export default function WhyUsSection({ items }: Props) {
  return (
    <section className="bg-muted/40 border-y border-border py-24">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div>
            <Badge variant="secondary" className="text-primary font-semibold mb-4">
              Why King of Service
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
              Service redefined through <span className="text-primary">clarity</span>.
            </h2>
          </div>

          <div className="space-y-6">
            {items.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-0.5">{title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}