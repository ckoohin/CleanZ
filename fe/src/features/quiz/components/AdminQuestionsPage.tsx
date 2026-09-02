"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { StatusSwitch } from "@/components/ui/base/status_switch";
import { toast } from "@/lib/toast";
import { adminQuestionsApi } from "../services/quiz.service";
import type { AdminQuestion } from "../types/quiz.types";

// ─── Question Form Modal ───────────────────────────────────────────────────────

function QuestionModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AdminQuestion;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [questionText, setQuestionText] = useState(initial?.questionText ?? "");
  const [options, setOptions] = useState<string[]>(
    initial?.options ?? ["", "", "", ""]
  );
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correctAnswer ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));

  const saveMutation = useMutation({
    mutationFn: () => {
      const dto = {
        questionText: questionText.trim(),
        options: options.filter(Boolean),
        correctAnswer,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      return initial
        ? adminQuestionsApi.update(initial.id, dto)
        : adminQuestionsApi.create(dto);
    },
    onSuccess: () => {
      toast.success(initial ? "Đã cập nhật câu hỏi" : "Đã tạo câu hỏi");
      onSaved();
    },
    onError: () => toast.error("Có lỗi xảy ra"),
  });

  const setOption = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));

  const addOption = () => setOptions((prev) => [...prev, ""]);
  const removeOption = (i: number) => {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    if (correctAnswer === options[i]) setCorrectAnswer("");
  };

  const valid =
    questionText.trim() &&
    options.filter(Boolean).length >= 2 &&
    correctAnswer &&
    options.includes(correctAnswer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl bg-[var(--c-card)] rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-line)]">
          <h2 className="font-semibold text-[var(--c-ink)]">
            {initial ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
          </h2>
          <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-ink)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-[var(--c-ink-soft)] mb-1.5">
              Nội dung câu hỏi <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full rounded-xl border border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-3 py-2.5 text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/40 resize-none"
              placeholder="Nhập nội dung câu hỏi..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--c-ink-soft)] mb-1.5">
              Các lựa chọn <span className="text-rose-500">*</span>
              <span className="text-xs font-normal text-[var(--c-muted)] ml-2">(chọn ô radio = đáp án đúng)</span>
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctAnswer === opt && opt !== ""}
                    onChange={() => opt && setCorrectAnswer(opt)}
                    className="accent-emerald-500 w-4 h-4 shrink-0"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      if (correctAnswer === options[i]) setCorrectAnswer(e.target.value);
                      setOption(i, e.target.value);
                    }}
                    className="flex-1 rounded-lg border border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-3 py-2 text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/40"
                    placeholder={`Lựa chọn ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="text-[var(--c-muted)] hover:text-rose-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addOption}
              className="mt-2 flex items-center gap-1.5 text-sm text-[var(--c-primary-strong)] hover:text-[var(--c-primary)] transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm lựa chọn
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--c-ink-soft)] mb-1.5">
              Tags <span className="text-xs font-normal text-[var(--c-muted)]">(phân cách bằng dấu phẩy)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-3 py-2.5 text-sm text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/40"
              placeholder="vd: an toàn, vệ sinh, quy trình"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--c-line)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--c-muted)] hover:text-[var(--c-ink)] transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!valid || saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-[var(--c-primary)] hover:bg-[var(--c-primary-strong)] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial ? "Lưu thay đổi" : "Tạo câu hỏi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function AdminQuestionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("");
  const [modal, setModal] = useState<"create" | AdminQuestion | null>(null);

  const query = useQuery({
    queryKey: ["admin-questions", page, search, isActiveFilter],
    queryFn: () =>
      adminQuestionsApi.list({
        page,
        limit: 15,
        search: search || undefined,
        isActive: isActiveFilter === "" ? undefined : isActiveFilter === "true",
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: adminQuestionsApi.toggle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
    },
    onError: () => toast.error("Không thể thay đổi trạng thái"),
  });

  const deleteMutation = useMutation({
    mutationFn: adminQuestionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success("Đã xóa câu hỏi");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Không thể xóa câu hỏi này");
    },
  });

  const handleDelete = (q: AdminQuestion) => {
    if (!window.confirm(`Xóa câu hỏi: "${q.questionText.slice(0, 60)}..."?`)) return;
    deleteMutation.mutate(q.id);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-questions"] });

  const { items = [], total = 0, limit = 15 } = query.data ?? {};
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--c-ink)]">Ngân hàng câu hỏi</h1>
          <p className="text-sm text-[var(--c-muted)] mt-0.5">{total} câu hỏi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="p-2 text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] transition-colors disabled:opacity-40"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${query.isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setModal("create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--c-primary)] hover:bg-[var(--c-primary-strong)] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm câu hỏi
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setSearch(searchInput); setPage(1); }
            }}
            placeholder="Tìm câu hỏi..."
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/40 w-64"
          />
        </div>
        <select
          value={isActiveFilter}
          onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-xl border border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/40"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Tạm tắt</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--c-line)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--c-card-2)]">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-[var(--c-muted)]">#</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--c-muted)]">Câu hỏi</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--c-muted)]">Đáp án đúng</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--c-muted)]">Lựa chọn</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--c-muted)]">Trạng thái</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--c-muted)]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-line)]">
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--c-primary-strong)] mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[var(--c-muted)]">Không có câu hỏi nào</td>
              </tr>
            ) : (
              items.map((q, i) => (
                <tr key={q.id} className="bg-[var(--c-card)] hover:bg-[var(--c-card-2)] transition-colors">
                  <td className="px-4 py-3 text-[var(--c-muted)]">{(page - 1) * limit + i + 1}</td>
                  <td className="px-4 py-3 text-[var(--c-ink-soft)] max-w-sm">
                    <p className="line-clamp-2">{q.questionText}</p>
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.tags.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 bg-[var(--c-chip)] text-[var(--c-muted)] text-xs rounded">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-medium text-xs max-w-[140px]">
                    <p className="line-clamp-2">{q.correctAnswer}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--c-muted)] text-xs">{q.options.length} lựa chọn</td>
                  <td className="px-4 py-3 text-center">
                      <StatusSwitch
                        checked={q.isActive}
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(q.id)}
                        ariaLabel={`${q.isActive ? "Tắt" : "Bật"} câu hỏi`}
                        activeLabel="Bật"
                        inactiveLabel="Tắt"
                        className="mx-auto"
                      />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal(q)}
                        className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-[var(--c-muted)] hover:text-rose-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--c-line)] bg-[var(--c-card-2)]">
            <p className="text-sm text-[var(--c-muted)]">Trang {page}/{totalPages} · {total} câu hỏi</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[var(--c-line)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[var(--c-line)] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <QuestionModal
          initial={modal === "create" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); invalidate(); }}
        />
      )}
    </div>
  );
}
