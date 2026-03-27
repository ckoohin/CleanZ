"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Sparkles, ChefHat } from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

export default function BrandingPanel() {
    return (
        <motion.div
            className="w-full lg:w-5/12 bg-gradient-to-br from-[#7FA84F] via-[#6B9440] to-[#5A8435] p-10 lg:p-16 flex flex-col justify-between relative overflow-hidden"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
        >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full" />
                <div className="absolute bottom-20 right-10 w-40 h-40 border-4 border-white rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white rounded-full" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <motion.div
                            className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/30"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <UtensilsCrossed className="w-9 h-9 text-white" strokeWidth={2.5} />
                        </motion.div>
                        <div>
                            <h1 className="text-4xl font-bold text-white tracking-tight">Savory</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Sparkles className="w-4 h-4 text-white/80" />
                                <p className="text-white/90 text-sm font-medium">Buffet Management Pro</p>
                            </div>
                        </div>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                            Nâng tầm trải nghiệm <br />
                            <span className="text-white/80">ẩm thực buffet</span>
                        </h2>
                        <p className="text-white/90 text-lg leading-relaxed mb-6">
                            Hệ thống quản lý nhà hàng thông minh với công nghệ hiện đại,
                            tối ưu hoá trải nghiệm khách hàng và vận hành
                        </p>

                        {/* Feature badges */}
                        <div className="flex flex-wrap gap-3">
                            {['Gọi món thông minh', 'Quản lý real-time', 'Báo cáo chi tiết'].map((feature, idx) => (
                                <motion.div
                                    key={feature}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.8 + idx * 0.1 }}
                                >
                                    <Badge variant="secondary" className="px-4 py-2 bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30">
                                        {feature}
                                    </Badge>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Stats section */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1 }}
                    className="grid grid-cols-3 gap-6 mb-8"
                >
                    {[
                        { number: '500+', label: 'Nhà hàng' },
                        { number: '50K+', label: 'Người dùng' },
                        { number: '99%', label: 'Hài lòng' }
                    ].map((stat) => (
                        <motion.div
                            key={stat.label}
                            className="text-center"
                            whileHover={{ scale: 1.05 }}
                        >
                            <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                            <div className="text-white/70 text-xs">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Animated food showcase */}
            <motion.div
                className="relative z-10"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
            >
                <div className="relative">
                    <motion.div
                        animate={{
                            y: [0, -20, 0],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="relative rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <ImageWithFallback
                            src="https://images.unsplash.com/photo-1763207291832-819499e261dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWZmZXQlMjByZXN0YXVyYW50JTIwZm9vZCUyMHNwcmVhZHxlbnwxfHx8fDE3NzIwMTExMDh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                            alt="Buffet Food"
                            className="w-full h-56 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#7FA84F] via-transparent to-transparent" />

                        {/* Floating badge */}
                        <motion.div
                            className="absolute top-4 right-4"
                            animate={{
                                y: [0, -5, 0],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Badge className="bg-white/20 backdrop-blur-xl text-white border-white/30 hover:bg-white/30">
                                🍽️ Premium Buffet
                            </Badge>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Decorative chef hat icon */}
            <motion.div
                className="absolute bottom-10 right-10 opacity-10"
                animate={{
                    rotate: [0, 10, 0, -10, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <ChefHat className="w-40 h-40 text-white" strokeWidth={1} />
            </motion.div>
        </motion.div>
    );
}