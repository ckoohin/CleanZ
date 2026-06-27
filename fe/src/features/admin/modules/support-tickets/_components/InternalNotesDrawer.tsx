"use client";

import React, { useState } from "react";
import { Lock, Send, StickyNote, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  useInternalNotes,
  useAddInternalNote,
} from "../hooks/useSupportTicket";

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  ticketId: string;
  ticketCode?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Ghi chú nội bộ dạng LOG (timeline) — tách hẳn khỏi luồng chat khách/tasker.
 * Mở từ nút riêng cạnh "Xem chi tiết" trong bảng ticket. Giữ tỉ lệ DESKTOP.
 */
export const InternalNotesDrawer: React.FC<Props> = ({
  ticketId,
  ticketCode,
  isOpen,
  onClose,
}) => {
  const { data: notes, isLoading } = useInternalNotes(ticketId, isOpen);
  const addNote = useAddInternalNote(ticketId);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const body = draft.trim();
    if (!body || addNote.isPending) return;
    addNote.mutate(body, { onSuccess: () => setDraft("") });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/40 px-6 pb-4 pt-6">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            <StickyNote className="h-4 w-4 text-amber-500" />
            Ghi chú nội bộ
          </SheetTitle>
          <SheetDescription asChild>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Chỉ admin thấy · {ticketCode ?? "Ticket"}
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* ── Log timeline ── */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !notes || notes.length === 0 ? (
              <div className="py-12 text-center">
                <StickyNote className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Chưa có ghi chú nội bộ nào
                </p>
              </div>
            ) : (
              <ol className="relative space-y-4 border-l border-border/50 pl-5">
                {notes.map((n) => (
                  <li key={n.id} className="relative">
                    <span className="absolute -left-[1.55rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-amber-400" />
                    <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {n.authorName}
                        </span>
                        <time className="shrink-0 text-[11px] text-muted-foreground">
                          {fmtDateTime(n.createdAt)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-foreground/80">
                        {n.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </ScrollArea>

        {/* ── Composer (text-only) ── */}
        <div className="border-t border-border/40 bg-card p-4">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Thêm ghi chú nội bộ... (Ctrl/⌘ + Enter để lưu)"
              className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={!draft.trim() || addNote.isPending}
              onClick={submit}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
