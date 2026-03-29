import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  CalendarDays,
  Heart,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useProfile } from "@/features/auth/hooks/auth.hooks";

type Props = {
  src?: string;
  alt?: string;
  name?: string;
  email?: string;
};

const MENU_ITEMS = [
  { icon: User,        label: "Hồ sơ của tôi",   href: "/profile" },
  { icon: CalendarDays,label: "Lịch đặt dịch vụ", href: "/bookings" },
  { icon: Heart,       label: "Dịch vụ yêu thích", href: "/favorites" },
  { icon: Shield,      label: "Bảo mật tài khoản", href: "/security" },
  { icon: Settings,    label: "Cài đặt",           href: "/settings" },
];

export const AvatarProfile: React.FC<Props> = ({
  src = "https://i.pravatar.cc/40",
  alt = "User",
  name = "Nguyễn Văn A",
  email = "user@kingofservice.vn",
}) => {
  const { data: user, isLoading } = useProfile();

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) return null

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted transition-colors"
      >
        <div className="relative">
          <Avatar className="w-8 h-8">
            <AvatarImage src={src} alt={alt} />
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full" />
        </div>
        <div className="hidden lg:flex flex-col items-start">
          <span className="text-xs font-semibold text-foreground leading-tight">{name}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Khách hàng</span>
        </div>
        <ChevronDown className={cn(
          "hidden lg:block w-3 h-3 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>

      <div className={cn(
        "absolute right-0 top-full mt-2 w-64 z-50",
        "bg-background border border-border rounded-2xl shadow-xl shadow-black/10",
        "overflow-hidden transition-all duration-200 origin-top-right",
        open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
      )}>
        <div className="px-4 py-3.5 flex items-center gap-3 bg-muted/40">
          <Avatar className="w-10 h-10">
            <AvatarImage src={src} alt={alt} />
            <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <span className="shrink-0 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
            Pro
          </span>
        </div>

        <Separator />

        <div className="p-1.5">
          {MENU_ITEMS.map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        <Separator />

        <div className="p-1.5">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium">
            <LogOut className="w-4 h-4 shrink-0" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};