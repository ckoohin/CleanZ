"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
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
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {initial ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nội dung câu hỏi <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Nhập nội dung câu hỏi..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Các lựa chọn <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-400 ml-2">(chọn ô radio = đáp án đúng)</span>
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctAnswer === opt && opt !== ""}
                    onChange={() => opt && setCorrectAnswer(opt)}
                    className="accent-green-500 w-4 h-4 shrink-0"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      if (correctAnswer === options[i]) setCorrectAnswer(e.target.value);
                      setOption(i, e.target.value);
                    }}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Lựa chọn ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addOption}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm lựa chọn
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tags <span className="text-xs font-normal text-gray-400">(phân cách bằng dấu phẩy)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="vd: an toàn, vệ sinh, quy trình"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!valid || saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ngân hàng câu hỏi</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} câu hỏi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-40"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${query.isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setModal("create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm câu hỏi
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setSearch(searchInput); setPage(1); }
            }}
            placeholder="Tìm câu hỏi..."
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <select
          value={isActiveFilter}
          onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Tạm tắt</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Câu hỏi</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Đáp án đúng</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Lựa chọn</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Trạng thái</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">Không có câu hỏi nào</td>
              </tr>
            ) : (
              items.map((q, i) => (
                <tr key={q.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{(page - 1) * limit + i + 1}</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-sm">
                    <p className="line-clamp-2">{q.questionText}</p>
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.tags.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-green-700 dark:text-green-400 font-medium text-xs max-w-[140px]">
                    <p className="line-clamp-2">{q.correctAnswer}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{q.options.length} lựa chọn</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleMutation.mutate(q.id)}
                      disabled={toggleMutation.isPending}
                      className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                    >
                      {q.isActive ? (
                        <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600 dark:text-green-400">Bật</span></>
                      ) : (
                        <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">Tắt</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal(q)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <p className="text-sm text-gray-500">Trang {page}/{totalPages} · {total} câu hỏi</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
