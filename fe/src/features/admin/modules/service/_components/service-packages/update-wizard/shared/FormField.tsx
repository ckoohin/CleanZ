import React from "react";
import { HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function Field({ label, required, hint, tooltip, children }: {
  label: React.ReactNode;
  required?: boolean;
  hint?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-extrabold text-slate-800">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {hint && <p className="text-xs font-semibold text-slate-700">{hint}</p>}
    </div>
  );
}
