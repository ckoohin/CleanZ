"use client";

import { motion } from "motion/react";

export default function ParticlesBg({
  particles,
}: {
  particles: {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
  }[];
}) {
  return (
    <>
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-[#A8C686]/30 to-transparent rounded-full blur-3xl"
        animate={{ x: [0, 100, 0], y: [0, 150, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-radial from-[#8FB961]/30 to-transparent rounded-full blur-3xl"
        animate={{ x: [0, -100, 0], y: [0, -150, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -100, 0], opacity: [0, 1, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}