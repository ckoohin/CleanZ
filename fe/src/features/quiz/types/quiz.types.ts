export type QuizAttemptStatus = "IN_PROGRESS" | "PASSED" | "FAILED" | "EXPIRED";

export interface QuizQuestion {
  id: string;
  orderIndex: number;
  questionText: string;
  options: string[];
}

export interface QuizQuestionWithAnswer extends QuizQuestion {
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  maxAttempts: number;
  passingScore: number;
  isActive: boolean;
  questions: QuizQuestion[];
}

export interface QuizMyStatus {
  passed: boolean;
  attemptsUsed: number;
  attemptsRemaining: number | null;
  lastScore: number | null;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  taskerId: string;
  attemptNumber: number;
  status: QuizAttemptStatus;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string | null;
  expiredAt: string | null;
}

export interface ActiveQuizResponse {
  quiz: Quiz;
  myStatus: QuizMyStatus;
}

export interface StartAttemptResponse extends QuizAttempt {}

export interface SubmitAttemptResponse {
  attempt: QuizAttempt;
  questions: QuizQuestionWithAnswer[];
}

// Admin types
export interface AdminQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  tags: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuiz {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  maxAttempts: number;
  passingScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  attemptCount?: number;
  passRate?: number;
}

export interface AdminQuizStats {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgScore: number | null;
}

export interface AdminAttempt {
  id: string;
  quizId: string;
  taskerId: string;
  attemptNumber: number;
  status: QuizAttemptStatus;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string | null;
  expiredAt: string | null;
  tasker?: {
    id: string;
    user?: { fullName: string; email: string };
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
