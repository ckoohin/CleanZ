'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2, AlertCircle, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCustomerPolicies } from '../hooks/useCustomerPolicies';
import {
  POLICY_CATEGORY_META,
  type Policy,
  type PolicyCategory,
} from '@/features/admin/modules/policy/types/policy.type';
import { cn } from '@/lib/utils';

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground/80">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h2 key={i} className="text-base font-bold mt-5 mb-2 first:mt-0 text-foreground">{line.slice(3)}</h2>;
        if (line.startsWith('# '))
          return <h1 key={i} className="text-lg font-black mt-5 mb-2 first:mt-0 text-foreground">{line.slice(2)}</h1>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-sm font-semibold mt-4 mb-1 text-foreground">{line.slice(4)}</h3>;
        if (line.startsWith('> '))
          return <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-2">{line.slice(2)}</blockquote>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-5 list-disc marker:text-primary/60">{renderInline(line.slice(2))}</li>;
        if (/^\d+\./.test(line))
          return <li key={i} className="ml-5 list-decimal marker:text-primary/60">{renderInline(line.replace(/^\d+\.\s*/, ''))}</li>;
        if (!line.trim())
          return <div key={i} className="h-2" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ─── Group by category (preserve insertion order) ─────────────────────────────

function groupByCategory(policies: Policy[]): Map<PolicyCategory, Policy[]> {
  const map = new Map<PolicyCategory, Policy[]>();
  for (const p of policies) {
    const arr = map.get(p.category) ?? [];
    arr.push(p);
    map.set(p.category, arr);
  }
  return map;
}

// ─── Category nav item ────────────────────────────────────────────────────────

function CategoryNavItem({
  category,
  count,
  active,
  onClick,
}: {
  category: PolicyCategory;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const meta = POLICY_CATEGORY_META[category] ?? POLICY_CATEGORY_META.GENERAL;
  const CatIcon = meta.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors', active ? 'bg-primary/15' : 'bg-muted')}>
        <CatIcon className={cn('w-4 h-4', active ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <span className="flex-1 text-sm truncate">{meta.label}</span>
      <span className={cn('text-[11px] font-bold tabular-nums shrink-0', active ? 'text-primary' : 'text-muted-foreground/70')}>
        {count}
      </span>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PolicySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted" />
            <div className="h-4 bg-muted rounded w-32" />
            <div className="ml-auto h-5 bg-muted rounded-full w-6" />
          </div>
          {[1, 2].map((j) => (
            <div key={j} className="px-6 py-4 border-b border-border/20 last:border-0 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-muted" />
              <div className="h-4 bg-muted rounded flex-1 max-w-xs" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CustomerPoliciesPage() {
  const { data: policies = [], isLoading, isError } = useCustomerPolicies();
  const [activeCategory, setActiveCategory] = useState<PolicyCategory | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const grouped = groupByCategory(policies);
  const categories = Array.from(grouped.keys());

  const scrollToCategory = (category: PolicyCategory) => {
    setActiveCategory(category);
    sectionRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Hero skeleton */}
        <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/40 px-6 md:px-10 py-10">
          <div className="max-w-7xl mx-auto animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-9 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-96" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
          <PolicySkeleton />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive/60" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Không thể tải chính sách</p>
            <p className="text-sm text-muted-foreground mt-1">Vui lòng kiểm tra kết nối và thử lại.</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-14">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/customer" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Quay lại Trang chủ
            </Link>
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  <ScrollText className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
                  {policies.length} chính sách
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-light leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                Chính sách{' '}
                <span className="italic text-primary">khách hàng</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-xl">
                Các quy định, điều khoản và tiêu chuẩn dịch vụ áp dụng cho khách hàng trên nền tảng CleanZ.
              </p>
            </div>

            {/* Category chips — desktop only */}
            {categories.length > 0 && (
              <div className="hidden lg:flex flex-wrap gap-2 justify-end max-w-xs">
                {categories.map((cat) => {
                  const meta = POLICY_CATEGORY_META[cat] ?? POLICY_CATEGORY_META.GENERAL;
                  const CatIcon = meta.icon;
                  return (
                    <button
                      key={cat}
                      onClick={() => scrollToCategory(cat)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                        activeCategory === cat
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background/80 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary',
                      )}
                    >
                      <CatIcon className="w-3 h-3" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10">
        {policies.length === 0 ? (
          <div className="py-24 text-center rounded-3xl border-2 border-dashed border-border/50 bg-muted/10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Chưa có chính sách nào</p>
              <p className="text-sm text-muted-foreground mt-1">Các chính sách sẽ được công bố sớm.</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-8 xl:gap-12 items-start">

            {/* ── Sticky category sidebar (desktop only) ─────────────────────── */}
            <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">
                Danh mục
              </p>
              <nav className="space-y-0.5">
                {categories.map((cat) => (
                  <CategoryNavItem
                    key={cat}
                    category={cat}
                    count={grouped.get(cat)!.length}
                    active={activeCategory === cat}
                    onClick={() => scrollToCategory(cat)}
                  />
                ))}
              </nav>
            </aside>

            {/* ── Policy list ────────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Mobile: horizontal scrollable chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden scrollbar-hide">
                {categories.map((cat) => {
                  const meta = POLICY_CATEGORY_META[cat] ?? POLICY_CATEGORY_META.GENERAL;
                  const CatIcon = meta.icon;
                  return (
                    <button
                      key={cat}
                      onClick={() => scrollToCategory(cat)}
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border whitespace-nowrap transition-all shrink-0',
                        activeCategory === cat
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary',
                      )}
                    >
                      <CatIcon className="w-3 h-3" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              {/* Policy cards */}
              {Array.from(grouped.entries()).map(([category, items]) => {
                const meta = POLICY_CATEGORY_META[category] ?? POLICY_CATEGORY_META.GENERAL;
                const CatIcon = meta.icon;

                return (
                  <div
                    key={category}
                    ref={(el) => { sectionRefs.current[category] = el; }}
                    className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm scroll-mt-28"
                  >
                    {/* Category header */}
                    <div className={cn('flex items-center gap-4 px-6 py-5 border-b border-border/30', meta.bgColor)}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/50 dark:bg-black/20 shrink-0 shadow-sm">
                        <CatIcon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-none">{meta.label}</p>
                        <p className="text-xs text-current/60 mt-0.5 opacity-70">{items.length} chính sách</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[11px] h-6 px-2.5 bg-white/50 dark:bg-black/20 border-0 font-bold"
                      >
                        {items.length}
                      </Badge>
                    </div>

                    {/* Accordion */}
                    <Accordion type="multiple" className="divide-y divide-border/30">
                      {items.map((policy) => (
                        <AccordionItem key={policy.id} value={policy.id} className="border-0">
                          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/40 transition-colors [&[data-state=open]]:bg-muted/30 group">
                            <div className="flex items-center gap-4 text-left min-w-0 flex-1">
                              <span
                                className="text-2xl shrink-0 leading-none w-9 h-9 flex items-center justify-center rounded-xl bg-muted/50 group-hover:bg-muted transition-colors"
                                aria-hidden="true"
                              >
                                {policy.iconEmoji || '📄'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground leading-snug group-data-[state=open]:text-primary transition-colors truncate">
                                  {policy.title}
                                </p>
                                {policy.isDefault && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                                    ⭐ Áp dụng mặc định
                                  </span>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 pb-6 pt-0">
                            <div className="rounded-xl border border-border/40 bg-muted/20 px-6 py-5 mt-2">
                              {policy.content ? (
                                <MarkdownContent content={policy.content} />
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Chưa có nội dung chi tiết.</p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
