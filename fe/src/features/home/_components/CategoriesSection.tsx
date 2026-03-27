"use client";
import { Card, CardContent } from "@/components/ui/card";

interface Category {
  icon: any;
  label: string;
  color: string;
}

interface Props {
  categories: Category[];
}

export default function CategoriesSection({ categories }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 mb-24">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {categories.map(({ icon: Icon, label, color }) => (
          <Card
            key={label}
            className="group cursor-pointer border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200"
          >
            <CardContent className="flex flex-col items-center text-center p-6 gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}