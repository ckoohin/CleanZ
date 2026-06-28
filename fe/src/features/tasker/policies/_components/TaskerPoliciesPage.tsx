'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTaskerPolicies } from '../hooks/useTaskerPolicies';
import {
  POLICY_CATEGORY_META,
  type Policy,
  type PolicyCategory,
} from '@/features/admin/modules/policy/types/policy.type';
import { cn } from '@/lib/utils';

// ─── Markdown renderer (giống admin) ─────────────────────────────────────────

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
    <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h2 key={i} className="text-base font-bold mt-4 mb-1 first:mt-0 text-foreground">{line.slice(3)}</h2>;
        if (line.startsWith('# '))
          return <h1 key={i} className="text-lg font-black mt-4 mb-2 first:mt-0 text-foreground">{line.slice(2)}</h1>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{line.slice(4)}</h3>;
        if (line.startsWith('> '))
          return <blockquote key={i} className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{line.slice(2)}</blockquote>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-5 list-disc">{renderInline(line.slice(2))}</li>;
        if (/^\d+\./.test(line))
          return <li key={i} className="ml-5 list-decimal">{renderInline(line.replace(/^\d+\.\s*/, ''))}</li>;
        if (!line.trim())
          return <div key={i} className="h-1.5" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ─── Group by category ────────────────────────────────────────────────────────

function groupByCategory(policies: Policy[]): Map<PolicyCategory, Policy[]> {
  const map = new Map<PolicyCategory, Policy[]>();
  for (const p of policies) {
    const arr = map.get(p.category) ?? [];
    arr.push(p);
    map.set(p.category, arr);
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TaskerPoliciesPage() {
  const { data: policies = [], isLoading, isError } = useTaskerPolicies();

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 py-20 justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Đang tải chính sách...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto w-full">
        <div className="py-20 text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive/50" />
          <p className="text-sm text-muted-foreground">Không thể tải chính sách. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }

  const grouped = groupByCategory(policies);

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground">
          <Link href="/tasker" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Quay lại Dashboard
          </Link>
        </Button>
        <h1
          className="text-3xl font-light leading-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Chính sách <span className="italic text-primary">đối tác</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Các quy định và tiêu chuẩn áp dụng cho Tasker trên nền tảng CleanZ.
        </p>
      </div>

      {policies.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 space-y-3">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground font-medium">Chưa có chính sách nào được công bố.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => {
            const meta = POLICY_CATEGORY_META[category] ?? POLICY_CATEGORY_META.GENERAL;
            const CatIcon = meta.icon;

            return (
              <div key={category} className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
                {/* Category header */}
                <div className={cn('flex items-center gap-3 px-5 py-4 border-b border-border/40', meta.bgColor)}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/40 dark:bg-black/20 shrink-0">
                    <CatIcon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="font-bold text-sm">{meta.label}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0 bg-white/40 dark:bg-black/20 border-0 font-semibold">
                    {items.length}
                  </Badge>
                </div>

                {/* Policies */}
                <Accordion type="multiple" className="divide-y divide-border/30">
                  {items.map((policy) => (
                    <AccordionItem key={policy.id} value={policy.id} className="border-0">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]]:bg-muted/20 group">
                        <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                          <span className="text-xl shrink-0 leading-none" aria-hidden="true">
                            {policy.iconEmoji || '📄'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-snug group-data-[state=open]:text-primary transition-colors">
                              {policy.title}
                            </p>
                            {policy.isDefault && (
                              <span className="text-[10px] text-amber-600 font-medium">Áp dụng mặc định</span>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <div className="rounded-xl border border-border/40 bg-muted/10 px-5 py-4 mt-1">
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
      )}
    </div>
  );
}
