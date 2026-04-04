import { motion, Variants } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { CategorySectionProps } from "../types/category.type";
import Container from "@/components/Container";

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
}) => {
  return (
    <Container
      className="-mt-16 relative "
      classNameContent="z-20 mb-10 sm:mb-20"
    >
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4"
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
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-200`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {label}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
    </Container>
  );
};
