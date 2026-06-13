"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Menu, 
  Search, 
  Globe, 
  ChevronDown, 
  Info,
  HelpCircle
} from "lucide-react";
import LogoApp from "@/components/logo/LogoApp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Container from "@/components/Container";

export const PartnerHeader = () => {
  const [lang, setLang] = useState("Tiếng Việt");

  return (
    <div className="w-full">
      {/* Yellow Alert Bar */}
      <div className="bg-[#FFB000] text-foreground py-2">
        <Container classNameContent="flex-row items-center justify-center gap-2 text-sm font-medium">
          <Info className="w-4 h-4 shrink-0" />
          <p className="text-center">
            Nếu bạn là Đối tác CleanZ đang gặp sự cố về tài khoản, vui lòng truy cập{" "}
            <a href="/help" className="underline font-bold hover:text-black transition-colors">
              Trung tâm trợ giúp.
            </a>
          </p>
        </Container>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <Container classNameContent="h-16 flex-row items-center justify-between gap-4">
          
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="w-6 h-6" />
              <span className="sr-only">Menu</span>
            </Button>
            <LogoApp />
          </div>

          {/* Right: Navigation */}
          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden md:flex items-center gap-6">
              {/* Dropdown 1 */}
              <button className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors group">
                Trở thành Đối tác của chúng tôi
                <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform" />
              </button>

              <Link href="/help" className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors">
                Trung tâm Hỗ trợ
              </Link>
            </div>

            {/* Language Switcher */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors">
                <Globe className="w-4 h-4" />
                {lang}
                <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform" />
              </button>
              {/* Simple Dropdown placeholder */}
              <div className="absolute top-full right-0 mt-2 w-32 bg-background border border-border rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all">
                <button onClick={() => setLang("Tiếng Việt")} className="w-full text-left px-4 py-2 text-sm hover:bg-muted rounded-t-lg">Tiếng Việt</button>
                <button onClick={() => setLang("English")} className="w-full text-left px-4 py-2 text-sm hover:bg-muted rounded-b-lg">English</button>
              </div>
            </div>

            {/* Search Icon */}
            <Button variant="ghost" size="icon" className="text-foreground">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </Container>
      </header>
    </div>
  );
};
