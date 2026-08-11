"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Zap,
  X,
  Loader2,
  ChevronRight,
  BookOpen,
  Users,
  BarChart3,
  ListOrdered,
  Trash2,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { adminQuizApi, adminQuestionsApi } from "../services/quiz.service";
import type { AdminQuestion, AdminQuiz } from "../types/quiz.types";

// ─── Quiz form modal ───────────────────────────────────────────────────────────

function QuizModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: AdminQuiz;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [timeLimit, setTimeLimit] = useState(String(initial?.timeLimitMinutes ?? -1));
  const [maxAttempts, setMaxAttempts] = useState(String(initial?.maxAttempts ?? 3));
  const [passingScore, setPassingScore] = useState(String(initial?.passingScore ?? 80));

  const saveMutation = useMutation({
    mutationFn: () => {
      const dto = {
        title: title.trim(),
        description: description.trim() || undefined,
        timeLimitMinutes: Number(timeLimit),
        maxAttempts: Number(maxAttempts),
        passingScore: Number(passingScore),
      };
      return initial ? adminQuizApi.update(initial.id, dto) : adminQuizApi.create(dto);
    },
    onSuccess: () => {
      toast.success(initial ? "Đã cập nhật bài kiểm tra" : "Đã tạo bài kiểm tra");
      onSaved();
    },
    onError: () => toast.error("Có lỗi xảy ra"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {initial ? "Chỉnh sửa bài kiểm tra" : "Tạo bài kiểm tra mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên bài kiểm tra <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="vd: Kiểm tra đầu vào Tasker 2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mô tả</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Thời gian (phút)
                <span className="text-xs font-normal text-gray-400 block">-1 = không giới hạn</span>
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Số lượt thi
                <span className="text-xs font-normal text-gray-400 block">-1 = không giới hạn</span>
              </label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Điểm đạt (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors">Hủy</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial ? "Lưu" : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz detail / question assignment panel ───────────────────────────────────

function QuizDetailPanel({ quiz, onClose }: { quiz: AdminQuiz; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"questions" | "attempts" | "stats">("questions");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bankSearch, setBankSearch] = useState("");

  const quizQuestionsQuery = useQuery({
    queryKey: ["admin-quiz-questions", quiz.id],
    queryFn: () => adminQuizApi.listQuestions(quiz.id),
  });

  const bankQuery = useQuery({
    queryKey: ["admin-questions-bank", bankSearch],
    queryFn: () => adminQuestionsApi.list({ limit: 50, search: bankSearch || undefined, isActive: true }),
    enabled: tab === "questions",
  });

  const attemptsQuery = useQuery({
    queryKey: ["admin-quiz-attempts", quiz.id],
    queryFn: () => adminQuizApi.getAttempts(quiz.id, { limit: 20 }),
    enabled: tab === "attempts",
  });

  const statsQuery = useQuery({
    queryKey: ["admin-quiz-stats", quiz.id],
    queryFn: () => adminQuizApi.getStats(quiz.id),
    enabled: tab === "stats",
  });

  const assignMutation = useMutation({
    mutationFn: () => adminQuizApi.assignQuestions(quiz.id, [...selectedIds]),
    onSuccess: (data: any) => {
      toast.success(`Đã thêm ${data.assigned} câu hỏi`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quiz.id] });
      qc.invalidateQueries({ queryKey: ["admin-quiz"] });
    },
    onError: () => toast.error("Không thể thêm câu hỏi"),
  });

  const removeMutation = useMutation({
    mutationFn: (questionId: string) => adminQuizApi.removeQuestion(quiz.id, questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quiz.id] });
      qc.invalidateQueries({ queryKey: ["admin-quiz"] });
    },
    onError: () => toast.error("Không thể gỡ câu hỏi"),
  });

  const activateMutation = useMutation({
    mutationFn: () => adminQuizApi.activate(quiz.id),
    onSuccess: () => {
      toast.success("Đã kích hoạt bài kiểm tra");
      qc.invalidateQueries({ queryKey: ["admin-quiz"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Không thể kích hoạt"),
  });

  const assignedIds = new Set((quizQuestionsQuery.data ?? []).map((q: any) => q.id));
  const bankItems: AdminQuestion[] = (bankQuery.data?.items ?? []).filter((q) => !assignedIds.has(q.id));
  const allSelected = bankItems.length > 0 && bankItems.every((q) => selectedIds.has(q.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        bankItems.forEach((q) => next.delete(q.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        bankItems.forEach((q) => next.add(q.id));
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{quiz.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {quiz.timeLimitMinutes === -1 ? "Không giới hạn thời gian" : `${quiz.timeLimitMinutes} phút`} ·
              {quiz.maxAttempts === -1 ? " Không giới hạn lượt" : ` ${quiz.maxAttempts} lượt`} ·
              Điểm đạt: {quiz.passingScore}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!quiz.isActive && (
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {activateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Kích hoạt
              </button>
            )}
            {quiz.isActive && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg">Đang hoạt động</span>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(["questions", "attempts", "stats"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              {t === "questions" ? "Câu hỏi" : t === "attempts" ? "Lượt thi" : "Thống kê"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Questions tab */}
          {tab === "questions" && (
            <div className="p-5 space-y-5">
              {/* Assigned questions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4" />
                  Câu hỏi trong bài ({quizQuestionsQuery.data?.length ?? 0})
                </h3>
                {quizQuestionsQuery.isLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                ) : (quizQuestionsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Chưa có câu hỏi nào được gán</p>
                ) : (
                  <div className="space-y-2">
                    {(quizQuestionsQuery.data ?? []).map((q: any, i: number) => (
                      <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
                        <p className="flex-1 text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{q.questionText}</p>
                        <button
                          onClick={() => removeMutation.mutate(q.id)}
                          disabled={removeMutation.isPending}
                          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question bank */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Thêm từ ngân hàng câu hỏi
                </h3>
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Tìm câu hỏi..."
                  className="w-full mb-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {bankItems.length > 0 && (
                  <label className="flex items-center gap-2 mb-2 px-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {allSelected ? "Bỏ chọn tất cả" : `Chọn tất cả (${bankItems.length})`}
                    </span>
                  </label>
                )}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bankItems.map((q) => (
                    <label
                      key={q.id}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedIds.has(q.id) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(q.id)}
                        onChange={() => toggleSelect(q.id)}
                        className="mt-0.5 accent-blue-600 w-4 h-4 shrink-0"
                      />
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{q.questionText}</p>
                    </label>
                  ))}
                  {bankItems.length === 0 && !bankQuery.isLoading && (
                    <p className="text-sm text-gray-400 py-4 text-center">Không có câu hỏi nào phù hợp</p>
                  )}
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending}
                    className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Thêm {selectedIds.size} câu đã chọn
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Attempts tab */}
          {tab === "attempts" && (
            <div className="p-5">
              {attemptsQuery.isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : (attemptsQuery.data?.items ?? []).length === 0 ? (
                <p className="text-center text-gray-400 py-10">Chưa có lượt thi nào</p>
              ) : (
                <div className="space-y-2">
                  {(attemptsQuery.data?.items ?? []).map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-sm">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {a.tasker?.user?.fullName ?? "Tasker"} · Lần {a.attemptNumber}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(a.startedAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.status === "PASSED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : a.status === "FAILED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {a.status === "PASSED" ? "Đạt" : a.status === "FAILED" ? "Không đạt" : a.status === "EXPIRED" ? "Hết giờ" : "Đang thi"}
                        </span>
                        {a.score !== null && <p className="text-xs text-gray-500 mt-0.5">{a.score}/100</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats tab */}
          {tab === "stats" && (
            <div className="p-5">
              {statsQuery.isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : statsQuery.data ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Tổng lượt thi", value: statsQuery.data.total, color: "blue" },
                    { label: "Đạt", value: statsQuery.data.passed, color: "green" },
                    { label: "Không đạt", value: statsQuery.data.failed, color: "red" },
                    { label: "Tỉ lệ đạt", value: `${statsQuery.data.passRate}%`, color: "purple" },
                    { label: "Điểm TB", value: statsQuery.data.avgScore !== null ? `${statsQuery.data.avgScore}/100` : "—", color: "amber" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl p-4 bg-${s.color}-50 dark:bg-${s.color}-900/20`}>
                      <p className={`text-2xl font-bold text-${s.color}-600 dark:text-${s.color}-400`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function AdminQuizPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"create" | AdminQuiz | null>(null);
  const [selected, setSelected] = useState<AdminQuiz | null>(null);

  const query = useQuery({
    queryKey: ["admin-quiz"],
    queryFn: adminQuizApi.list,
  });

  const quizzes: AdminQuiz[] = query.data ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quản lý bài kiểm tra</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quizzes.length} bài kiểm tra</p>
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
            <Plus className="w-4 h-4" /> Tạo bài kiểm tra
          </button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Chưa có bài kiểm tra nào</div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className={`rounded-2xl border ${quiz.isActive ? "border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"} p-5`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{quiz.title}</h2>
                    {quiz.isActive && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">Đang hoạt động</span>
                    )}
                  </div>
                  {quiz.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{quiz.description}</p>}

                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      {quiz.questionCount ?? 0} câu
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {quiz.attemptCount ?? 0} lượt thi
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4" />
                      {quiz.passRate ?? 0}% đạt
                    </span>
                    <span>Điểm đạt: {quiz.passingScore}%</span>
                    <span>{quiz.timeLimitMinutes === -1 ? "Không giới hạn thời gian" : `${quiz.timeLimitMinutes} phút`}</span>
                    <span>{quiz.maxAttempts === -1 ? "Không giới hạn lượt" : `${quiz.maxAttempts} lượt`}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => setModal(quiz)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelected(quiz)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    Quản lý <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <QuizModal
          initial={modal === "create" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            qc.invalidateQueries({ queryKey: ["admin-quiz"] });
          }}
        />
      )}

      {selected && (
        <QuizDetailPanel quiz={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
