import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QuizAttemptStatus } from 'src/common/enums/quiz-attempt-status.enum';
import { QuizEntity } from './entities/quiz.entity';
import { QuizAttemptEntity } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswerEntity } from './entities/quiz-attempt-answer.entity';
import { QuizQuestionEntity } from './entities/quiz-question.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(QuizAttemptEntity)
    private readonly attemptRepo: Repository<QuizAttemptEntity>,
    @InjectRepository(QuizQuestionEntity)
    private readonly quizQuestionRepo: Repository<QuizQuestionEntity>,
    @InjectRepository(TaskerEntity)
    private readonly taskerRepo: Repository<TaskerEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private async findTaskerByUserId(userId: string): Promise<TaskerEntity> {
    const tasker = await this.taskerRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!tasker) throw new NotFoundException('Không tìm thấy hồ sơ tasker');
    return tasker;
  }

  async getActiveQuiz(userId: string) {
    const tasker = await this.findTaskerByUserId(userId);
    const quiz = await this.quizRepo.findOne({ where: { isActive: true } });
    if (!quiz) throw new NotFoundException('Chưa có bài kiểm tra nào được kích hoạt');

    const quizQuestions = await this.quizQuestionRepo.find({
      where: { quizId: quiz.id },
      relations: ['question'],
      order: { orderIndex: 'ASC' },
    });

    const questions = quizQuestions.map((qq) => ({
      id: qq.question.id,
      orderIndex: qq.orderIndex,
      questionText: qq.question.questionText,
      options: qq.question.options,
      // correctAnswer intentionally omitted
    }));

    const myStatus = await this._statusByTaskerId(tasker.id, quiz);

    return { quiz: { ...quiz, questions }, myStatus };
  }

  async getMyStatus(userId: string) {
    const tasker = await this.findTaskerByUserId(userId);
    return this._statusByTaskerId(tasker.id);
  }

  private async _statusByTaskerId(taskerId: string, quiz?: QuizEntity) {
    const activeQuiz =
      quiz ?? (await this.quizRepo.findOne({ where: { isActive: true } }));
    if (!activeQuiz) return { passed: false, attemptsUsed: 0, attemptsRemaining: null, lastScore: null };

    const attempts = await this.attemptRepo.find({
      where: { taskerId, quizId: activeQuiz.id },
      order: { startedAt: 'DESC' },
    });

    const passed = attempts.some((a) => a.status === QuizAttemptStatus.PASSED);
    const attemptsUsed = attempts.length;
    const lastScore = attempts[0]?.score ?? null;
    const attemptsRemaining =
      activeQuiz.maxAttempts === -1 ? null : Math.max(0, activeQuiz.maxAttempts - attemptsUsed);

    return { passed, attemptsUsed, attemptsRemaining, lastScore };
  }

  async startAttempt(userId: string): Promise<QuizAttemptEntity> {
    const tasker = await this.findTaskerByUserId(userId);

    if (tasker.quizPassedAt) {
      throw new ForbiddenException('Bạn đã hoàn thành bài kiểm tra trước đó');
    }

    const quiz = await this.quizRepo.findOne({ where: { isActive: true } });
    if (!quiz) throw new NotFoundException('Chưa có bài kiểm tra nào được kích hoạt');

    const attemptsUsed = await this.attemptRepo.count({
      where: { taskerId: tasker.id, quizId: quiz.id },
    });

    if (quiz.maxAttempts !== -1 && attemptsUsed >= quiz.maxAttempts) {
      throw new ForbiddenException('Bạn đã hết lượt thi');
    }

    const totalQuestions = await this.quizQuestionRepo.count({
      where: { quizId: quiz.id },
    });

    if (totalQuestions === 0) {
      throw new BadRequestException('Bài kiểm tra chưa có câu hỏi');
    }

    const expiredAt =
      quiz.timeLimitMinutes === -1
        ? null
        : new Date(Date.now() + quiz.timeLimitMinutes * 60_000);

    const attempt = this.attemptRepo.create({
      quizId: quiz.id,
      taskerId: tasker.id,
      attemptNumber: attemptsUsed + 1,
      status: QuizAttemptStatus.IN_PROGRESS,
      totalQuestions,
      expiredAt,
    });

    return this.attemptRepo.save(attempt);
  }

  async submitAttempt(
    userId: string,
    attemptId: string,
    dto: SubmitAttemptDto,
  ) {
    const tasker = await this.findTaskerByUserId(userId);
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, taskerId: tasker.id },
      relations: ['quiz'],
    });

    if (!attempt) throw new NotFoundException('Attempt không tồn tại');
    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Bài thi này đã được nộp');
    }

    const now = new Date();
    const isExpired = attempt.expiredAt && now > attempt.expiredAt;

    const quizQuestions = await this.quizQuestionRepo.find({
      where: { quizId: attempt.quizId },
      relations: ['question'],
    });

    const questionMap = new Map(quizQuestions.map((qq) => [qq.question.id, qq.question]));

    return this.dataSource.transaction(async (manager) => {
      const answerEntities = quizQuestions.map((qq) => {
        const submitted = dto.answers.find((a) => a.questionId === qq.question.id);
        const selectedAnswer = isExpired ? null : (submitted?.selectedAnswer ?? null);
        const isCorrect = !isExpired && selectedAnswer === qq.question.correctAnswer;

        return manager.create(QuizAttemptAnswerEntity, {
          attemptId,
          questionId: qq.question.id,
          selectedAnswer,
          isCorrect,
        });
      });

      await manager.save(QuizAttemptAnswerEntity, answerEntities);

      const correctCount = answerEntities.filter((a) => a.isCorrect).length;
      const score = isExpired
        ? 0
        : Math.round((correctCount / attempt.totalQuestions) * 100);
      const status = isExpired
        ? QuizAttemptStatus.EXPIRED
        : score >= attempt.quiz.passingScore
          ? QuizAttemptStatus.PASSED
          : QuizAttemptStatus.FAILED;

      attempt.status = status;
      attempt.score = score;
      attempt.correctCount = correctCount;
      attempt.submittedAt = now;
      await manager.save(QuizAttemptEntity, attempt);

      if (status === QuizAttemptStatus.PASSED) {
        await manager.update(TaskerEntity, { id: tasker.id }, { quizPassedAt: now });
      }

      const questionsWithResult = quizQuestions.map((qq) => {
        const answer = answerEntities.find((a) => a.questionId === qq.question.id)!;
        return {
          id: qq.question.id,
          orderIndex: qq.orderIndex,
          questionText: qq.question.questionText,
          options: qq.question.options,
          correctAnswer: qq.question.correctAnswer,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
        };
      });

      return { attempt: { ...attempt, status, score, correctCount }, questions: questionsWithResult };
    });
  }

  async getAttemptResult(userId: string, attemptId: string) {
    const tasker = await this.findTaskerByUserId(userId);
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId, taskerId: tasker.id },
    });
    if (!attempt) throw new NotFoundException('Attempt không tồn tại');
    if (attempt.status === QuizAttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException('Bài thi chưa được nộp');
    }

    const answers = await this.dataSource
      .getRepository(QuizAttemptAnswerEntity)
      .find({
        where: { attemptId },
        relations: ['question'],
      });

    const quizQuestions = await this.quizQuestionRepo.find({
      where: { quizId: attempt.quizId },
      order: { orderIndex: 'ASC' },
    });
    const orderMap = new Map(quizQuestions.map((qq) => [qq.questionId, qq.orderIndex]));

    const questions = answers.map((a) => ({
      id: a.question.id,
      orderIndex: orderMap.get(a.questionId) ?? 0,
      questionText: a.question.questionText,
      options: a.question.options,
      correctAnswer: a.question.correctAnswer,
      selectedAnswer: a.selectedAnswer,
      isCorrect: a.isCorrect,
    }));

    questions.sort((a, b) => a.orderIndex - b.orderIndex);

    return { attempt, questions };
  }
}
