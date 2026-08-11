import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  ActiveQuizResponse,
  AdminAttempt,
  AdminQuestion,
  AdminQuiz,
  AdminQuizStats,
  PaginatedResponse,
  StartAttemptResponse,
  SubmitAttemptResponse,
} from "../types/quiz.types";

// ─── Tasker quiz API ───────────────────────────────────────────────────────────

export const quizApi = {
  getActive: () =>
    http.get<ActiveQuizResponse>(API_ENDPOINTS.QUIZ.ACTIVE).then((r) => r.data),

  getMyStatus: () =>
    http.get(API_ENDPOINTS.QUIZ.MY_STATUS).then((r) => r.data),

  start: () =>
    http
      .post<StartAttemptResponse>(API_ENDPOINTS.QUIZ.START)
      .then((r) => r.data),

  submit: (
    attemptId: string,
    answers: { questionId: string; selectedAnswer?: string | null }[]
  ) =>
    http
      .post<SubmitAttemptResponse>(API_ENDPOINTS.QUIZ.SUBMIT(attemptId), {
        answers,
      })
      .then((r) => r.data),

  getAttemptResult: (attemptId: string) =>
    http
      .get<SubmitAttemptResponse>(API_ENDPOINTS.QUIZ.ATTEMPT(attemptId))
      .then((r) => r.data),
};

// ─── Admin question bank API ───────────────────────────────────────────────────

export interface QuestionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export const adminQuestionsApi = {
  list: (q: QuestionsQuery = {}) =>
    http
      .get<PaginatedResponse<AdminQuestion>>(API_ENDPOINTS.ADMIN_QUESTIONS.BASE, {
        params: q,
      })
      .then((r) => r.data),

  get: (id: string) =>
    http
      .get<AdminQuestion>(API_ENDPOINTS.ADMIN_QUESTIONS.DETAIL(id))
      .then((r) => r.data),

  create: (dto: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    tags?: string[];
    isActive?: boolean;
  }) =>
    http
      .post<AdminQuestion>(API_ENDPOINTS.ADMIN_QUESTIONS.BASE, dto)
      .then((r) => r.data),

  update: (
    id: string,
    dto: Partial<{
      questionText: string;
      options: string[];
      correctAnswer: string;
      tags: string[];
      isActive: boolean;
    }>
  ) =>
    http
      .patch<AdminQuestion>(API_ENDPOINTS.ADMIN_QUESTIONS.DETAIL(id), dto)
      .then((r) => r.data),

  toggle: (id: string) =>
    http
      .patch<AdminQuestion>(API_ENDPOINTS.ADMIN_QUESTIONS.TOGGLE(id))
      .then((r) => r.data),

  delete: (id: string) =>
    http.delete(API_ENDPOINTS.ADMIN_QUESTIONS.DETAIL(id)).then((r) => r.data),
};

// ─── Admin quiz API ────────────────────────────────────────────────────────────

export const adminQuizApi = {
  list: () =>
    http
      .get<AdminQuiz[]>(API_ENDPOINTS.ADMIN_QUIZ.BASE)
      .then((r) => r.data),

  get: (id: string) =>
    http
      .get<AdminQuiz>(API_ENDPOINTS.ADMIN_QUIZ.DETAIL(id))
      .then((r) => r.data),

  create: (dto: {
    title: string;
    description?: string;
    timeLimitMinutes?: number;
    maxAttempts?: number;
    passingScore?: number;
  }) =>
    http
      .post<AdminQuiz>(API_ENDPOINTS.ADMIN_QUIZ.BASE, dto)
      .then((r) => r.data),

  update: (
    id: string,
    dto: Partial<{
      title: string;
      description: string;
      timeLimitMinutes: number;
      maxAttempts: number;
      passingScore: number;
    }>
  ) =>
    http
      .patch<AdminQuiz>(API_ENDPOINTS.ADMIN_QUIZ.DETAIL(id), dto)
      .then((r) => r.data),

  activate: (id: string) =>
    http
      .patch<AdminQuiz>(API_ENDPOINTS.ADMIN_QUIZ.ACTIVATE(id))
      .then((r) => r.data),

  listQuestions: (id: string) =>
    http
      .get(API_ENDPOINTS.ADMIN_QUIZ.QUESTIONS(id))
      .then((r) => r.data),

  assignQuestions: (
    id: string,
    questionIds: string[],
    orderIndexes?: number[]
  ) =>
    http
      .post(API_ENDPOINTS.ADMIN_QUIZ.QUESTIONS(id), { questionIds, orderIndexes })
      .then((r) => r.data),

  removeQuestion: (id: string, questionId: string) =>
    http
      .delete(API_ENDPOINTS.ADMIN_QUIZ.REMOVE_QUESTION(id, questionId))
      .then((r) => r.data),

  reorder: (id: string, orderedQuestionIds: string[]) =>
    http
      .patch(API_ENDPOINTS.ADMIN_QUIZ.REORDER(id), { orderedQuestionIds })
      .then((r) => r.data),

  getAttempts: (id: string, params?: Record<string, unknown>) =>
    http
      .get<PaginatedResponse<AdminAttempt>>(
        API_ENDPOINTS.ADMIN_QUIZ.ATTEMPTS(id),
        { params }
      )
      .then((r) => r.data),

  getStats: (id: string) =>
    http
      .get<AdminQuizStats>(API_ENDPOINTS.ADMIN_QUIZ.STATS(id))
      .then((r) => r.data),

  getAllAttempts: (params?: Record<string, unknown>) =>
    http
      .get<PaginatedResponse<AdminAttempt>>(
        API_ENDPOINTS.ADMIN_QUIZ_ATTEMPTS.BASE,
        { params }
      )
      .then((r) => r.data),

  getAttemptDetail: (id: string) =>
    http
      .get(API_ENDPOINTS.ADMIN_QUIZ_ATTEMPTS.DETAIL(id))
      .then((r) => r.data),
};
