"use client";
import { m, Variants } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Container from "@/components/Container";
import { CategorySectionProps } from "@/types/category";
import { useRouter } from "next/navigation";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const CategorySection: React.FC<CategorySectionProps> = ({
  items,
  title = "Danh mục phổ biến",
  subtitle,
  viewAllHref,
  className,
}) => {
  const router = useRouter();

  return (
    <Container className={cn("relative", className)} classNameContent="z-20 mb-10 sm:mb-20">
      {(title || viewAllHref) && (
        <div className="flex items-center justify-between mb-10">
          <div>
            {title && <h2 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">{title}</h2>}
            {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
          </div>
          {viewAllHref && (
            <Link 
              href={viewAllHref} 
              className="text-[#fd7e14] hover:text-[#e66a00] flex items-center gap-1.5 font-bold transition-colors group"
            >
              Xem tất cả 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}
      <m.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {items.map(({ icon: Icon, label, color, href }) => (
          <m.div key={label} variants={itemVariants}>
            <Card
              className="group cursor-pointer border border-border/60 hover:border-[#fd7e14]/30 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden"
              onClick={() => href && router.push(href)}
            >
              <CardContent className="flex flex-col items-center text-center p-6 gap-4">
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                    color,
                    "group-hover:scale-110 group-hover:bg-[#fd7e14] group-hover:text-white"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-[#1a1a1a] group-hover:text-[#fd7e14] transition-colors">
                  {label}
                </span>
              </CardContent>
            </Card>
          </m.div>
        ))}
      </m.div>
    </Container>
  );
};
