import React from "react";

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
export function SectionCard({ icon: Icon, title, description, headerAction, children }: {
  icon: React.ElementType;
  title: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Icon className="w-4 h-4 text-primary" /></div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg">{title}</h3>
            {description && <p className="text-sm font-medium text-slate-600 mt-0.5">{description}</p>}
          </div>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
