"use client"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Bell,
    ShoppingCart,
    Search,
    BadgeCheck,
    ShieldCheck,
    Clock,
    ChevronRight,
    Star,
    Wrench,
    Sparkles,
    Scissors,
    HeartPulse,
    BookOpen,
    Dumbbell,
    CreditCard,
    UserCheck,
    Award,
    ArrowRight,
    Globe,
    Mail,
} from "lucide-react";
import HeroCarousel from "@/features/home/_components/HeroCarousel";
import HeroSection from "@/features/home/_components/HeroSection";
import Footer from "@/components/layouts/site/footer/Footer";
const NAV_LINKS = ["Categories", "Services", "Bookings", "Support"];

const CATEGORIES = [
    { icon: Wrench, label: "Repair", color: "bg-blue-50 text-blue-600" },
    { icon: Sparkles, label: "Cleaning", color: "bg-emerald-50 text-emerald-600" },
    { icon: Scissors, label: "Beauty", color: "bg-rose-50 text-rose-600" },
    { icon: HeartPulse, label: "Health", color: "bg-red-50 text-red-600" },
    { icon: BookOpen, label: "Education", color: "bg-amber-50 text-amber-600" },
    { icon: Dumbbell, label: "Sports", color: "bg-violet-50 text-violet-600" },
];

const SERVICES = [
    {
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYJa6_yPLhaQDrgKaEmjZMDST7JyBmEA9fblgHyXZ7otwSuGS_dDY6Xhvu9d2729z-Je_7BC5XcXZAC1W7z7UEGmYbvUfZMa0TrmKj0_Quqh-6gwu757qacLdDmS-9CfJLEITlRq5bHy-L_e8oq5yLMyrFPGaaqTP7ll5Gs1x4epROHvWrTeKujKFodeFCJZAR-7J7F47os8Kis2MdBxHBF_gcFGKIWPzFsDJySqkdJIKmh0LP2yNlrERIR-Kxm6ZDB-DXwlSb7XCi",
        tag: "Cleaning", rating: "4.9", reviews: "128",
        title: "Full Home Deep Cleaning",
        desc: "Complete sanitization of all surfaces, detailed kitchen and bathroom scrub, and window detailing.",
        price: "$120", unit: "/ service", duration: "4–5 hours",
    },
    {
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDhprE61-UB8lpmdESjSxM13CFZmZ9z4lTM3sYUMngwrskxeCXPn05IbCuUy9I5ONRf4j1JtBfSm7-iEZQJH0JyyJqXVrEN_BhAlcXyNHaeH9J7-EBeEWj8oQ3gZa6hjZ35EBvqHr2mLrW6O_alc-cZWgw_1a7b3XqdvVcG87jRT0F0zdJJFuJwPFRYPbJb2FUcD7LuoOaxOSuVVWtZ7KMXrCDhWXUE5qz-sNysuwzPbj_5AUgzWy_fojr8fMa8r9AZCWpamDEgOAK",
        tag: "Repair", rating: "5.0", reviews: "84",
        title: "HVAC Performance Audit",
        desc: "Complete diagnostics of your cooling and heating systems to ensure maximum efficiency.",
        price: "$85", unit: "/ visit", duration: "1–2 hours",
    },
    {
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQu8Cku98gaOWu81NRfJnyihWkEBnVNhHyir_Nm91rP9Qqzq_4cZptAUMnqaiKkibUwafMybN0--XgngY9jzKk9GWorLKo1bDu7YhRboTcfL6vOk50m8NLNDzBHujtWPR7hYn-E-mqFD_NVmxJuWbLf49AxLC2gDvLaCIJ8iC96EYDNxyGGBnH9uDU4vdd2ZNX7d-Or1NJH-b_Vfc9jbOCe5QlViCL_cOc6MEAbiO8zojXnJbIBDSodIH0o9SOALvdgyuo2Yfj_wKL",
        tag: "Health", rating: "4.8", reviews: "210",
        title: "Private Hatha Yoga",
        desc: "Personalized 1-on-1 session focusing on alignment, breathwork, and mental clarity.",
        price: "$60", unit: "/ hour", duration: "60 mins",
    },
];

const WHY_US = [
    { icon: CreditCard, title: "Upfront Pricing", desc: "No hidden fees or surprise hourly charges. You know the cost before you book." },
    { icon: UserCheck, title: "Elite Vetting", desc: "Only the top 3% of service providers pass our multi-stage background and skill check." },
    { icon: Award, title: "Clarity Guarantee", desc: "Not satisfied? We'll make it right or give you your money back. No questions asked." },
];

const FOOTER_LINKS = {
    Company: ["Company Story", "Careers", "Blog"],
    Support: ["Support Center", "Contact", "Partner Help"],
    Legal: ["Privacy Policy", "Terms of Service"],
};

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function HomePage() {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            {/* HERO CAROUSEL */}
            <HeroCarousel />
            {/* hero section */}
            <HeroSection />

            {/* CATEGORIES */}
            <section className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 mb-24">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {CATEGORIES.map(({ icon: Icon, label, color }) => (
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

            {/* RECOMMENDED SERVICES */}
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
                    {SERVICES.map((s) => (
                        <Card
                            key={s.title}
                            className="group overflow-hidden border border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col"
                        >
                            {/* Image */}
                            <div className="relative h-56 overflow-hidden">
                                <img
                                    src={s.image}
                                    alt={s.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {/* Rating pill */}
                                <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-foreground flex items-center gap-1 border border-border/50">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {s.rating} ({s.reviews})
                                </div>
                                {/* Tag */}
                                <div className="absolute bottom-3 left-3">
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-bold">
                                        {s.tag}
                                    </Badge>
                                </div>
                            </div>

                            {/* Content */}
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
                                <Button className="w-full mt-2 font-semibold" size="sm" variant={"ghost"}>
                                    Book Now
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* WHY CHOOSE US */}
            <section className="bg-muted/40 border-y border-border py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                        {/* Text side */}
                        <div className="space-y-8">
                            <div>
                                <Badge variant="secondary" className="text-primary font-semibold mb-4">
                                    Why King of Service
                                </Badge>
                                <h2 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
                                    Service redefined through{" "}
                                    <span className="text-primary">clarity</span>.
                                </h2>
                            </div>

                            <div className="space-y-6">
                                {WHY_US.map(({ icon: Icon, title, desc }) => (
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

                        {/* Stats bento */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <div className="rounded-2xl overflow-hidden aspect-[4/5]">
                                    <img
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjLWdB8aZW1BjhE-yHocv_cRHTmBMtb80V2d1NIHMQn5m36XbK-XPodSi59aoj6fNw9tMGPdeJ5GRW821MM6mUOP59tZmlLMTvde7RhG7SvLDG3V0dqJzVdR1S_EyzXBtF6CC8wioXBxdsOlDQDGsRfjkP3_j7wdEe-xodsTE5vm8QRD5WNkIu8lxbpZr2UytbZ5YOitAZ3de2bHqKX7OkUIvhcmS2dB0n4OD4XcZoxfm7vBLPX1pO0BCBp3GZE1pqv4xzwmNuzDwa"
                                        alt="Service Team"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <Card className="bg-primary border-0 text-primary-foreground p-6 aspect-square flex flex-col justify-center">
                                    <span className="text-4xl font-bold mb-1">10k+</span>
                                    <span className="text-xs uppercase tracking-widest opacity-75 font-semibold">Five Star Reviews</span>
                                </Card>
                            </div>
                            <div className="space-y-4 pt-10">
                                <Card className="border border-border p-6 aspect-square flex flex-col justify-center">
                                    <span className="text-4xl font-bold text-primary mb-1">24h</span>
                                    <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Fast Response</span>
                                </Card>
                                <div className="rounded-2xl overflow-hidden aspect-[4/5]">
                                    <img
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCulJS9u52NZB_D2JZk5wmG2fuWAGacqlugY_iRdfxC2vhXjlfi-YjwTQxMG1T49UM29WfjLT49GrBLVOWj_5rAF3C3848P18XNOXa7v4qDnW9ETOCdu7SQF5UkUPb7Sdv5UZ8cxI_xFVB4qlfkApuXccR0MeYa3mI_CBO8fXoK1aCq_A8YUojDZNznlDqqW3WEEJhrPN0Xq8b9GhwKub_hI5-YLNbyW4rWNO20vWNuGemQ88Pi9AQLfKuTbYjKoJFhfUeIP_ePcYpt"
                                        alt="Clean Home"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-7xl mx-auto px-6 my-28">
                <div className="bg-foreground rounded-3xl p-14 relative overflow-hidden">
                    {/* subtle tint */}
                    <div className="pointer-events-none absolute inset-0 bg-primary/5" />
                    <div className="pointer-events-none absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent" />

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-white text-4xl md:text-5xl font-bold leading-tight mb-4">
                                Ready to find the perfect professional?
                            </h2>
                            <p className="text-white/50 text-base mb-8 max-w-md leading-relaxed">
                                Join over 50,000 households that trust King of Service for their daily needs.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    className="bg-white text-foreground hover:bg-white/90 font-semibold px-7 py-5 rounded-xl"
                                >
                                    Get Started Now
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-white/20 text-white hover:bg-white/5 hover:text-white font-semibold px-7 py-5 rounded-xl bg-transparent"
                                >
                                    View Pricing
                                </Button>
                            </div>
                        </div>

                        <div className="hidden md:block relative h-72">
                            <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4i4b1qhF0VVZV0uXPmlDd392BG_AhlveoI5X6wNnH3Ab9cNzKZRw1AjDu85gWdQeu4owhvWatAIcE0xCinR5gT-oAwou2Xc13_Ad0F3MwMHd0q2uAW8Jve5VfpwVjphYbtWVmzxv6lAljBk2aLsJ7HUMpCSXOMA1LOmEfc66L9x1OPWwaRClSrFCbigJ6BjVFxAlXwcIsY_5CWB56Clwsx1O2fmWKRJ4VaitaPh1miani9yrEiDI6o_"
                                alt="App interface"
                                className="w-full h-full object-cover rounded-2xl"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <Footer />
        </div>
    );
}