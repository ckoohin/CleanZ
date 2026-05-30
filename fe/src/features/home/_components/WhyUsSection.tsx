import React from "react";
import { motion, Variants } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhyUsSectionProps } from "../types/whyUsSection.type";

const fadeUp = (delay = 0) => ({
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: "easeOut" } },
});

const fadeLeft: Variants = {
  hidden:  { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.6, ease: "easeOut" } },
};

const fadeRight: Variants = {
  hidden:  { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.6, ease: "easeOut" } },
};

export const WhyUsSection: React.FC<WhyUsSectionProps> = ({
  badge          = "Vì sao chọn chúng tôi",
  title          = "Dịch vụ được định nghĩa lại qua",
  titleHighlight = "sự rõ ràng",
  items,
  stats,
  images,
  className,
}) => {
  return (
    <section className={className}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          <motion.div
            className="space-y-8"
            variants={fadeLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div>
              <Badge variant="secondary" className="text-primary font-semibold mb-4">
                {badge}
              </Badge>
              <h2 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
                {title}{" "}
                <span className="text-primary">{titleHighlight}</span>.
              </h2>
            </div>

            <div className="space-y-6">
              {items.map(({ icon: Icon, title: t, desc }, i) => (
                <motion.div
                  key={t}
                  className="flex gap-4"
                  // variants={ fadeUp(i * 0.1) }
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-0.5">{t}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={fadeRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-sm">
                <img
                  src={images[0]?.src}
                  alt={images[0]?.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {stats
                .filter((s) => s.variant === "primary")
                .map((s) => (
                  <Card key={s.label} className="bg-primary border-0 text-primary-foreground p-6 aspect-square flex flex-col justify-center">
                    <span className="text-4xl font-bold mb-1">{s.value}</span>
                    <span className="text-xs uppercase tracking-widest opacity-75 font-semibold">{s.label}</span>
                  </Card>
                ))}
            </div>

            <div className="space-y-4 pt-10">
              {stats
                .filter((s) => s.variant === "default")
                .map((s) => (
                  <Card key={s.label} className="border border-border p-6 aspect-square flex flex-col justify-center">
                    <span className="text-4xl font-bold text-primary mb-1">{s.value}</span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</span>
                  </Card>
                ))}

              <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-sm">
                <img
                  src={images[1]?.src}
                  alt={images[1]?.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
