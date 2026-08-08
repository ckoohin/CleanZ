"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
  AlertTriangle,
  Loader2,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { quizApi } from "../services/quiz.service";
import type { QuizQuestion, QuizQuestionWithAnswer } from "../types/quiz.types";

// ─── Timer ────────────────────────────────────────────────────────────────────

function useCountdown(expiredAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiredAt) { setRemaining(null); return; }
    const tick = () => {
      const diff = Math.max(0, new Date(expiredAt).getTime() - Date.now());
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiredAt]);

  return remaining;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Result view ──────────────────────────────────────────────────────────────

function ResultView({
  attempt,
  questions,
  passingScore,
  onRetry,
  canRetry,
}: {
  attempt: { status: string; score: number | null; correctCount: number | null; totalQuestions: number };
  questions: QuizQuestionWithAnswer[];
  passingScore: number;
  onRetry: () => void;
  canRetry: boolean;
}) {
  const passed = attempt.status === "PASSED";
  const expired = attempt.status === "EXPIRED";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Score card */}
      <div className={`rounded-2xl p-8 text-center ${passed ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"}`}>
        {passed ? (
          <Trophy className="w-16 h-16 text-green-500 mx-auto mb-3" />
        ) : (
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
        )}
        <h2 className={`text-2xl font-bold ${passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {expired ? "Hết giờ" : passed ? "Chúc mừng! Bạn đã vượt qua" : "Chưa đạt"}
        </h2>
        <p className="mt-2 text-4xl font-black text-gray-800 dark:text-gray-100">
          {attempt.score ?? 0}
          <span className="text-lg font-normal text-gray-500"> / 100</span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {attempt.correctCount ?? 0}/{attempt.totalQuestions} câu đúng · Điểm đạt: {passingScore}
        </p>
        {!passed && canRetry && (
          <button
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Thi lại
          </button>
        )}
      </div>

      {/* Answer review */}
      <h3 className="font-semibold text-gray-700 dark:text-gray-300">Xem lại đáp án</h3>
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className={`rounded-xl border p-4 ${q.isCorrect ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"}`}>
            <p className="font-medium text-gray-800 dark:text-gray-100 mb-3">
              <span className="text-gray-400 mr-1">{i + 1}.</span> {q.questionText}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt) => {
                const isCorrect = opt === q.correctAnswer;
                const isSelected = opt === q.selectedAnswer;
                return (
                  <div
                    key={opt}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      isCorrect
                        ? "bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-300 font-medium"
                        : isSelected
                        ? "bg-red-100 dark:bg-red-800/40 text-red-800 dark:text-red-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : isSelected ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 shrink-0" />
                    )}
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Exam view ────────────────────────────────────────────────────────────────

export function TaskerQuizPage() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"intro" | "exam" | "result">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ attempt: any; questions: QuizQuestionWithAnswer[] } | null>(null);
  const autoSubmitRef = useRef(false);

  const activeQuery = useQuery({
    queryKey: ["quiz-active"],
    queryFn: quizApi.getActive,
  });

  const startMutation = useMutation({
    mutationFn: quizApi.start,
    onSuccess: (attempt) => {
      setAttemptId(attempt.id);
      setExpiredAt(attempt.expiredAt);
      setAnswers({});
      setCurrent(0);
      setPhase("exam");
    },
    onError: () => toast.error("Không thể bắt đầu bài thi"),
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, ans }: { id: string; ans: Record<string, string> }) =>
      quizApi.submit(
        id,
        questions.map((q) => ({ questionId: q.id, selectedAnswer: ans[q.id] ?? null }))
      ),
    onSuccess: (data) => {
      setResult(data);
      setPhase("result");
      qc.invalidateQueries({ queryKey: ["quiz-active"] });
    },
    onError: () => toast.error("Nộp bài thất bại, vui lòng thử lại"),
  });

  const remaining = useCountdown(expiredAt);

  // auto-submit when timer hits 0
  useEffect(() => {
    if (phase === "exam" && remaining === 0 && !autoSubmitRef.current && attemptId) {
      autoSubmitRef.current = true;
      submitMutation.mutate({ id: attemptId, ans: answers });
    }
  }, [remaining, phase, attemptId]); // eslint-disable-line

  const handleSubmit = () => {
    if (!attemptId) return;
    const unanswered = questions.filter((q) => !answers[q.id]).length;
    if (unanswered > 0) {
      const ok = window.confirm(`Bạn còn ${unanswered} câu chưa trả lời. Xác nhận nộp bài?`);
      if (!ok) return;
    }
    submitMutation.mutate({ id: attemptId, ans: answers });
  };

  const handleRetry = () => {
    autoSubmitRef.current = false;
    setResult(null);
    setPhase("intro");
  };

  if (activeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (activeQuery.isError || !activeQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <p className="text-gray-600 dark:text-gray-400">Chưa có bài kiểm tra nào được kích hoạt</p>
      </div>
    );
  }

  const { quiz, myStatus } = activeQuery.data;
  const questions: QuizQuestion[] = quiz.questions ?? [];

  // ── Result phase ──
  if (phase === "result" && result) {
    const canRetry =
      myStatus.passed === false &&
      (quiz.maxAttempts === -1 || (myStatus.attemptsRemaining ?? 1) > 0);
    return (
      <ResultView
        attempt={result.attempt}
        questions={result.questions}
        passingScore={quiz.passingScore}
        onRetry={handleRetry}
        canRetry={canRetry}
      />
    );
  }

  // ── Intro phase ──
  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{quiz.title}</h1>
              {quiz.description && <p className="text-sm text-gray-500 mt-0.5">{quiz.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{questions.length}</p>
              <p className="text-xs text-gray-500 mt-1">Câu hỏi</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {quiz.timeLimitMinutes === -1 ? "∞" : `${quiz.timeLimitMinutes}p`}
              </p>
              <p className="text-xs text-gray-500 mt-1">Thời gian</p>
            </div>
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{quiz.passingScore}%</p>
              <p className="text-xs text-gray-500 mt-1">Điểm đạt</p>
            </div>
          </div>

          {myStatus.passed ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Bạn đã vượt qua bài kiểm tra này. Bạn có thể xem lại nhưng không cần thi thêm.
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Lượt đã dùng: <strong>{myStatus.attemptsUsed}</strong>
                  {quiz.maxAttempts !== -1 && ` / ${quiz.maxAttempts}`}
                </p>
                {myStatus.lastScore !== null && (
                  <p>Điểm gần nhất: <strong>{myStatus.lastScore}/100</strong></p>
                )}
              </div>

              {(quiz.maxAttempts === -1 || (myStatus.attemptsRemaining ?? 1) > 0) ? (
                <button
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {startMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Bắt đầu thi
                </button>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-700 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  Bạn đã hết lượt thi.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Exam phase ──
  const q = questions[current];
  const answered = Object.keys(answers).length;
  const timerWarning = remaining !== null && remaining < 60_000;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Danh sách câu</p>
          <p className="text-xs text-gray-400 mt-0.5">{answered}/{questions.length} đã trả lời</p>
        </div>

        {/* Timer */}
        {remaining !== null && (
          <div className={`mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono font-bold ${timerWarning ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>
            <Clock className="w-4 h-4 shrink-0" />
            {formatTime(remaining)}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3 grid grid-cols-4 gap-1.5 content-start">
          {questions.map((qItem, i) => {
            const done = !!answers[qItem.id];
            const isActive = i === current;
            return (
              <button
                key={qItem.id}
                onClick={() => setCurrent(i)}
                className={`h-9 w-full rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : done
                    ? "bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>

        <div className="p-3">
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Nộp bài
          </button>
        </div>
      </aside>

      {/* Question area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-6">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              Câu {current + 1} / {questions.length}
            </span>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
              {q.questionText}
            </p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm leading-relaxed ${
                    selected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 font-medium"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Câu trước
            </button>

            {current < questions.length - 1 ? (
              <button
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Câu tiếp <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Nộp bài
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
