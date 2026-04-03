import { motion, Variants } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { containerVariants, itemVariants } from "../motions/service.motion";

export interface CategoryItem {
  icon: LucideIcon;
  label: string;
  color: string;
  href?: string;
}

interface CategorySectionProps {
  items: CategoryItem[];
  className?: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({ items, className }) => {
  return (
    <section className={className}>
      <motion.div
        className="grid grid-cols-3 md:grid-cols-6 gap-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {items.map(({ icon: Icon, label, color, href }) => (
          <motion.div key={label} variants={itemVariants}>
            <Card
              className="group cursor-pointer border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200"
              onClick={() => href && (window.location.href = href)}
            >
              <CardContent className="flex flex-col items-center text-center p-5 gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default CategorySection;