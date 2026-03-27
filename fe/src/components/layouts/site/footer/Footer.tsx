import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  Clock,
  Smartphone,
} from "lucide-react";
import LogoApp from "@/components/logo/LogoApp";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const LINKS = {
  "Dịch Vụ": [
    "Vệ sinh nhà cửa",
    "Sửa chữa điện nước",
    "Massage tại nhà",
    "Chăm sóc sắc đẹp",
    "Gia sư tại nhà",
    "Huấn luyện cá nhân",
    "Điều dưỡng tại nhà",
  ],
  "Công Ty": [
    "Về chúng tôi",
    "Đội ngũ",
    "Tuyển dụng",
    "Tin tức & Blog",
    "Đối tác",
    "Báo chí",
  ],
  "Hỗ Trợ": [
    "Trung tâm trợ giúp",
    "Liên hệ",
    "Chính sách hoàn tiền",
    "Hướng dẫn đặt lịch",
    "Báo cáo sự cố",
  ],
  "Pháp Lý": [
    "Điều khoản dịch vụ",
    "Chính sách bảo mật",
    "Cookie",
    "Giấy phép hoạt động",
  ],
};

const SOCIALS = [
  { icon: Facebook,  label: "Facebook",  href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube,   label: "Youtube",   href: "#" },
  { icon: Twitter,   label: "Twitter",   href: "#" },
];

const TRUST_BADGES = [
  { icon: BadgeCheck,  text: "Thợ được xác minh" },
  { icon: ShieldCheck, text: "Bảo hiểm công việc" },
  { icon: Clock,       text: "Hỗ trợ 24/7" },
];

const CONTACT = [
  { icon: Phone,  text: "1800 6868 (Miễn phí)" },
  { icon: Mail,   text: "support@kingofservice.vn" },
  { icon: MapPin, text: "72 Lê Thánh Tôn, Q.1, TP.HCM" },
];

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function Footer() {
  return (
    <footer className="bg-background border-t border-border">

      {/* ── TOP BAND: Trust + App download ── */}
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-6">
            {TRUST_BADGES.map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                {text}
              </span>
            ))}
          </div>

          {/* App download */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium hidden md:block">
              Tải ứng dụng:
            </span>
            <Button variant="outline" size="sm" className="gap-2 rounded-full text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              App Store
            </Button>
            <Button variant="outline" size="sm" className="gap-2 rounded-full text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              Google Play
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12">

          {/* Brand col — 2/6 */}
          <div className="lg:col-span-2 space-y-6">
            <LogoApp />

            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Nền tảng kết nối dịch vụ tại nhà hàng đầu Việt Nam. Hơn 1,200 chuyên viên được xác minh sẵn sàng phục vụ bạn.
            </p>

            {/* Contact info */}
            <div className="space-y-2.5">
              {CONTACT.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Socials */}
            <div className="flex gap-2">
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links grid — 4/6 */}
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(LINKS).map(([heading, items]) => (
              <div key={heading}>
                <h4 className="font-semibold text-foreground mb-4 text-sm">{heading}</h4>
                <ul className="space-y-2.5">
                  {items.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-muted-foreground hover:text-primary transition-colors text-sm leading-relaxed"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── NEWSLETTER ── */}
        <div className="mt-14 rounded-2xl bg-muted/50 border border-border px-8 py-8 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground mb-1">Nhận ưu đãi độc quyền</h4>
            <p className="text-muted-foreground text-sm">
              Đăng ký nhận thông báo về khuyến mãi và dịch vụ mới nhất.
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <Input
              placeholder="Email của bạn"
              className="w-full md:w-64 rounded-full text-sm"
            />
            <Button className="rounded-full gap-1.5 shrink-0 font-semibold px-5">
              Đăng ký
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── PARTNERS / CERTS ── */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium mr-2">Chứng nhận & Đối tác:</span>
          {["VNPAY", "ZaloPay", "MoMo", "Visa / MC", "Bộ Công Thương"].map((p) => (
            <Badge key={p} variant="secondary" className="text-xs font-semibold rounded-full px-3 py-1">
              {p}
            </Badge>
          ))}
        </div>

        <Separator className="mt-10 mb-6" />

        {/* ── BOTTOM BAR ── */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-xs">
            © 2024 King of Service. Bảo lưu mọi quyền. GPKD số: 0123456789 — ĐKKD tại Sở KHĐT TP.HCM.
          </p>
          <div className="flex flex-wrap gap-5 justify-center">
            {["Điều khoản", "Bảo mật", "Cookie", "Trợ năng"].map((t) => (
              <a
                key={t}
                href="#"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}