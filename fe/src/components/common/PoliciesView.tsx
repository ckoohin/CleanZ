'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="text-sm leading-7 text-foreground/75 space-y-1">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h2 key={i} className="text-sm font-bold mt-4 mb-1 first:mt-0 text-foreground">{line.slice(3)}</h2>;
        if (line.startsWith('# '))
          return <h1 key={i} className="text-base font-bold mt-4 mb-1 first:mt-0 text-foreground">{line.slice(2)}</h1>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground/90">{line.slice(4)}</h3>;
        if (line.startsWith('> '))
          return <blockquote key={i} className="border-l-2 border-primary/30 pl-3 text-muted-foreground italic my-2">{line.slice(2)}</blockquote>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc marker:text-muted-foreground/50">{renderInline(line.slice(2))}</li>;
        if (/^\d+\./.test(line))
          return <li key={i} className="ml-4 list-decimal marker:text-muted-foreground/50">{renderInline(line.replace(/^\d+\.\s*/, ''))}</li>;
        if (!line.trim())
          return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByCategory(policies: Policy[]): Map<PolicyCategory, Policy[]> {
  const map = new Map<PolicyCategory, Policy[]>();
  for (const p of policies) {
    const arr = map.get(p.category) ?? [];
    arr.push(p);
    map.set(p.category, arr);
  }
  return map;
}

// ─── Policy item (custom accordion) ──────────────────────────────────────────

function PolicyItem({ policy }: { policy: Policy }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('border-b border-border/50 last:border-0 transition-colors', open && 'bg-muted/30')}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/40 transition-colors group"
      >
        <span className="text-lg leading-none shrink-0 w-7 text-center">{policy.iconEmoji || '📄'}</span>
        <span className={cn(
          'flex-1 text-sm font-medium leading-snug transition-colors',
          open ? 'text-primary' : 'text-foreground group-hover:text-primary',
        )}>
          {policy.title}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200',
          open && 'rotate-180 text-primary',
        )} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 ml-10">
          {policy.content ? (
            <MarkdownContent content={policy.content} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Chưa có nội dung chi tiết.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  sectionRef,
}: {
  category: PolicyCategory;
  items: Policy[];
  sectionRef: (el: HTMLDivElement | null) => void;
}) {
  const meta = POLICY_CATEGORY_META[category] ?? POLICY_CATEGORY_META.GENERAL;
  const CatIcon = meta.icon;

  return (
    <section ref={sectionRef} className="scroll-mt-24">
      {/* Section label */}
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
          <CatIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{meta.label}</h2>
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs text-muted-foreground/60 tabular-nums">{items.length}</span>
      </div>

      {/* Policy list */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {items.map((policy) => (
          <PolicyItem key={policy.id} policy={policy} />
        ))}
      </div>
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-muted" />
            <div className="h-3 bg-muted rounded w-24" />
            <div className="flex-1 h-px bg-border/40" />
          </div>
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-7 h-5 bg-muted rounded" />
                <div className="h-4 bg-muted rounded flex-1 max-w-sm" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export type PoliciesViewProps = {
  policies: Policy[];
  isLoading: boolean;
  isError: boolean;
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
};

export function PoliciesView({
  policies,
  isLoading,
  isError,
  backHref,
  backLabel,
  title,
  description,
}: PoliciesViewProps) {
  const [activeCategory, setActiveCategory] = useState<PolicyCategory | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const grouped = groupByCategory(policies);
  const categories = Array.from(grouped.keys());

  // Track active category on scroll
  useEffect(() => {
    if (categories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.getAttribute('data-category') as PolicyCategory);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    for (const cat of categories) {
      const el = sectionRefs.current[cat];
      if (el) {
        el.setAttribute('data-category', cat);
        observer.observe(el);
      }
    }
    return () => observer.disconnect();
  }, [categories.join(',')]);

  const scrollToCategory = (category: PolicyCategory) => {
    sectionRefs.current[category]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <div className="h-6 bg-muted rounded w-32 mb-8 animate-pulse" />
        <div className="flex gap-10">
          <div className="hidden lg:block w-52 shrink-0 space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}
          </div>
          <div className="flex-1"><Skeleton /></div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-xs">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive/40" />
          <p className="font-medium text-foreground">Không thể tải chính sách</p>
          <p className="text-sm text-muted-foreground">Vui lòng kiểm tra kết nối và thử lại.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-5 text-muted-foreground hover:text-foreground">
          <Link href={backHref} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {/* ── Empty ─────────────────────────────────────────────────────────────── */}
      {policies.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-3">
          <FileText className="w-9 h-9 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Chưa có chính sách nào được công bố.</p>
        </div>
      ) : (
        <div className="flex gap-10 xl:gap-14 items-start">

          {/* ── Left sidebar ────────────────────────────────────────────────────── */}
          <aside className="hidden lg:block w-52 xl:w-56 shrink-0 sticky top-24">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3 px-2">
              Danh mục
            </p>
            <nav className="space-y-0.5">
              {categories.map((cat) => {
                const meta = POLICY_CATEGORY_META[cat] ?? POLICY_CATEGORY_META.GENERAL;
                const CatIcon = meta.icon;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-all',
                      isActive
                        ? 'bg-primary/8 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <CatIcon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/60')} />
                    <span className="flex-1 truncate">{meta.label}</span>
                    <span className={cn('text-[10px] tabular-nums', isActive ? 'text-primary/70' : 'text-muted-foreground/40')}>
                      {grouped.get(cat)!.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Content ─────────────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Mobile chips */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 lg:hidden scrollbar-hide">
              {categories.map((cat) => {
                const meta = POLICY_CATEGORY_META[cat] ?? POLICY_CATEGORY_META.GENERAL;
                const CatIcon = meta.icon;
                return (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0 transition-all',
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground border-primary font-medium'
                        : 'bg-background border-border text-muted-foreground',
                    )}
                  >
                    <CatIcon className="w-3 h-3" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Category sections */}
            {Array.from(grouped.entries()).map(([category, items]) => (
              <CategorySection
                key={category}
                category={category}
                items={items}
                sectionRef={(el) => { sectionRefs.current[category] = el; }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
