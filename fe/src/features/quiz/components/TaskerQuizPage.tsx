"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid3x3,
  Loader2,
  RotateCcw,
  Send,
  Trophy,
  AlertTriangle,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { quizApi } from "../services/quiz.service";
import type { QuizQuestion, QuizQuestionWithAnswer } from "../types/quiz.types";

// ─── Timer hook ───────────────────────────────────────────────────────────────

function useCountdown(expiredAt: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!expiredAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, new Date(expiredAt).getTime() - Date.now()));
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

// ─── Question grid sheet ──────────────────────────────────────────────────────

function QuestionGridSheet({
  open,
  onClose,
  questions,
  answers,
  current,
  onJump,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  current: number;
  onJump: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const answered = Object.values(answers).filter(Boolean).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card border-t border-border shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pt-2 pb-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Danh sách câu hỏi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {answered}/{questions.length} đã trả lời
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Legend */}
            <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary inline-block" /> Đang xem
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Đã trả lời
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-muted inline-block" /> Chưa trả lời
              </span>
            </div>

            {/* Grid */}
            <div className="px-4 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pb-4">
              {questions.map((q, i) => {
                const done = !!answers[q.id];
                const active = i === current;
                return (
                  <button
                    key={q.id}
                    onClick={() => { onJump(i); onClose(); }}
                    className={cn(
                      "h-10 rounded-xl text-sm font-bold transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : done
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Submit */}
            <div className="px-4 pb-6 pt-2 border-t border-border">
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="w-full h-12 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold rounded-2xl transition-colors"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Nộp bài ({answered}/{questions.length})
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
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
    <div className="min-h-screen bg-background">
      {/* Score header */}
      <div className={cn(
        "px-5 pt-12 pb-8 text-center",
        passed
          ? "bg-gradient-to-b from-emerald-500/10 to-transparent"
          : "bg-gradient-to-b from-red-500/10 to-transparent"
      )}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className={cn(
            "mx-auto mb-5 w-20 h-20 rounded-full flex items-center justify-center",
            passed ? "bg-emerald-500/15" : "bg-red-500/15"
          )}
        >
          {passed
            ? <Trophy className="w-10 h-10 text-emerald-500" />
            : <XCircle className="w-10 h-10 text-red-500" />
          }
        </motion.div>
        <h2 className={cn("text-xl font-black", passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
          {expired ? "Hết giờ làm bài" : passed ? "Chúc mừng! Bạn đã đạt" : "Chưa đạt yêu cầu"}
        </h2>
        <p className="mt-3 text-5xl font-black text-foreground">
          {attempt.score ?? 0}
          <span className="text-xl font-normal text-muted-foreground"> / 100</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {attempt.correctCount ?? 0}/{attempt.totalQuestions} câu đúng · Điểm đạt: {passingScore}
        </p>
        {!passed && canRetry && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Thi lại
          </motion.button>
        )}
      </div>

      {/* Answer review */}
      <div className="px-4 pb-8 space-y-3">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide px-1">Xem lại đáp án</h3>
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={cn(
              "rounded-2xl border p-4",
              q.isCorrect
                ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10"
                : "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10"
            )}
          >
            <div className="flex items-start gap-2 mb-3">
              {q.isCorrect
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              }
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                {i + 1}. {q.questionText}
              </p>
            </div>
            <div className="space-y-1.5 pl-6">
              {q.options.map((opt) => {
                const isCorrect = opt === q.correctAnswer;
                const isSelected = opt === q.selectedAnswer;
                return (
                  <div
                    key={opt}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
                      isCorrect
                        ? "bg-emerald-100 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-medium"
                        : isSelected
                        ? "bg-red-100 dark:bg-red-800/40 text-red-800 dark:text-red-300"
                        : "text-muted-foreground"
                    )}
                  >
                    {isCorrect
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      : isSelected
                      ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      : <span className="w-3.5 h-3.5 shrink-0" />
                    }
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

// ─── Main page ─────────────────────────────────────────────────────────────────

export function TaskerQuizPage() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"intro" | "exam" | "result">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ attempt: any; questions: QuizQuestionWithAnswer[] } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const autoSubmitRef = useRef(false);

  const activeQuery = useQuery({ queryKey: ["quiz-active"], queryFn: quizApi.getActive });

  // Auto-resume an in-progress attempt returned by the server
  useEffect(() => {
    const ca = activeQuery.data?.currentAttempt;
    if (!ca || phase !== "intro") return;
    const notExpired = !ca.expiredAt || new Date(ca.expiredAt) > new Date();
    if (notExpired) {
      setAttemptId(ca.id);
      setExpiredAt(ca.expiredAt);
      setAnswers({});
      setCurrent(0);
      autoSubmitRef.current = false;
      setPhase("exam");
    }
  }, [activeQuery.data]); // eslint-disable-line

  const startMutation = useMutation({
    mutationFn: quizApi.start,
    onSuccess: (attempt) => {
      setAttemptId(attempt.id);
      setExpiredAt(attempt.expiredAt);
      setAnswers({});
      setCurrent(0);
      autoSubmitRef.current = false;
      setPhase("exam");
    },
    onError: () => toast.error("Không thể bắt đầu bài thi"),
  });

  const questions: QuizQuestion[] = activeQuery.data?.quiz?.questions ?? [];

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

  useEffect(() => {
    if (phase === "exam" && remaining === 0 && !autoSubmitRef.current && attemptId) {
      autoSubmitRef.current = true;
      submitMutation.mutate({ id: attemptId, ans: answers });
    }
  }, [remaining, phase, attemptId]); // eslint-disable-line

  const handleSubmit = useCallback(() => {
    if (!attemptId) return;
    const unanswered = questions.filter((q) => !answers[q.id]).length;
    if (unanswered > 0) {
      const ok = window.confirm(`Bạn còn ${unanswered} câu chưa trả lời. Xác nhận nộp bài?`);
      if (!ok) return;
    }
    submitMutation.mutate({ id: attemptId, ans: answers });
  }, [attemptId, questions, answers, submitMutation]);

  const handleRetry = () => {
    setResult(null);
    setPhase("intro");
  };

  // ── Loading ──
  if (activeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── No active quiz ──
  if (activeQuery.isError || !activeQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 px-6">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <p className="font-bold">Chưa có bài kiểm tra</p>
        <p className="text-sm text-muted-foreground">Chưa có bài kiểm tra nào được kích hoạt. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  const { quiz, myStatus, currentAttempt } = activeQuery.data;
  const hasResumable =
    !!currentAttempt &&
    (!currentAttempt.expiredAt || new Date(currentAttempt.expiredAt) > new Date());

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
      <div className="min-h-screen bg-background px-4 pt-6 pb-10">
        <div className="max-w-lg mx-auto space-y-5">
          {/* Header card */}
          <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black leading-tight">{quiz.title}</h1>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{quiz.description}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-blue-500/10 p-3.5 text-center">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{questions.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Câu hỏi</p>
              </div>
              <div className="rounded-2xl bg-amber-500/10 p-3.5 text-center">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {quiz.timeLimitMinutes === -1 ? "∞" : `${quiz.timeLimitMinutes}p`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Thời gian</p>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 p-3.5 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{quiz.passingScore}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Điểm đạt</p>
              </div>
            </div>
          </div>

          {/* Status / CTA */}
          {myStatus.passed ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">Bạn đã vượt qua bài kiểm tra này.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
              {(myStatus.attemptsUsed > 0 || myStatus.lastScore !== null) && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Lượt đã dùng: <strong className="text-foreground">{myStatus.attemptsUsed}</strong>
                    {quiz.maxAttempts !== -1 && ` / ${quiz.maxAttempts}`}
                  </p>
                  {myStatus.lastScore !== null && (
                    <p>Điểm gần nhất: <strong className="text-foreground">{myStatus.lastScore}/100</strong></p>
                  )}
                </div>
              )}

              {hasResumable && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-400/40 bg-amber-400/10 text-amber-800 dark:text-amber-300">
                  <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                  <p className="text-sm font-medium flex-1">
                    Bạn có bài thi đang làm dở.
                    {currentAttempt?.expiredAt && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {" "}Còn lại: {formatTime(Math.max(0, new Date(currentAttempt.expiredAt).getTime() - Date.now()))}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {(quiz.maxAttempts === -1 || (myStatus.attemptsRemaining ?? 1) > 0) ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  className="w-full h-13 py-3.5 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold text-base rounded-2xl transition-colors"
                >
                  {startMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {hasResumable ? "Tiếp tục bài thi" : myStatus.attemptsUsed > 0 ? "Thi lại" : "Bắt đầu thi"}
                </motion.button>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">Bạn đã hết lượt thi.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Exam phase ──
  const q = questions[current];
  const answered = Object.keys(answers).length;
  const timerWarning = remaining !== null && remaining < 60_000;
  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;

  return (
    <>
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">
              Câu {current + 1}/{questions.length}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {answered} đã trả lời
            </p>
          </div>

          {remaining !== null && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm",
              timerWarning
                ? "bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse"
                : "bg-muted text-foreground"
            )}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {formatTime(remaining)}
            </div>
          )}

          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-sm font-medium"
          >
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden sm:inline">Câu hỏi</span>
          </button>
        </div>
      </div>

      {/* Question area — scrollable, padded for header + bottom nav */}
      <div className="pt-[72px] pb-[100px] min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
            className="max-w-2xl mx-auto px-4 py-6 space-y-5"
          >
            <p className="text-base font-bold text-foreground leading-relaxed">
              <span className="text-primary font-black mr-1">{current + 1}.</span>
              {q.questionText}
            </p>

            <div className="space-y-3">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === opt;
                const label = ["A", "B", "C", "D"][oi];
                return (
                  <motion.button
                    key={opt}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    className={cn(
                      "w-full text-left flex items-start gap-3 px-4 py-4 rounded-2xl border-2 transition-all",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <span className={cn(
                      "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {label}
                    </span>
                    <span className={cn(
                      "text-sm leading-relaxed pt-0.5",
                      selected ? "font-semibold text-foreground" : "text-foreground"
                    )}>
                      {opt}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Trước
        </button>

        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Tiếp theo
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Nộp bài
          </button>
        )}
      </div>

      {/* Question grid bottom sheet */}
      <QuestionGridSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        questions={questions}
        answers={answers}
        current={current}
        onJump={setCurrent}
        onSubmit={handleSubmit}
        submitting={submitMutation.isPending}
      />
    </>
  );
}
