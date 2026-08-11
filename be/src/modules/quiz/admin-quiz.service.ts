import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Equal, ILike, Repository } from 'typeorm';
import { QuestionEntity } from './entities/question.entity';
import { QuizEntity } from './entities/quiz.entity';
import { QuizQuestionEntity } from './entities/quiz-question.entity';
import { QuizAttemptEntity } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswerEntity } from './entities/quiz-attempt-answer.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsQueryDto } from './dto/questions-query.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { AssignQuestionsDto } from './dto/assign-questions.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { QuizAttemptsQueryDto } from './dto/quiz-attempts-query.dto';

@Injectable()
export class AdminQuizService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(QuizQuestionEntity)
    private readonly quizQuestionRepo: Repository<QuizQuestionEntity>,
    @InjectRepository(QuizAttemptEntity)
    private readonly attemptRepo: Repository<QuizAttemptEntity>,
    @InjectRepository(QuizAttemptAnswerEntity)
    private readonly answerRepo: Repository<QuizAttemptAnswerEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Question Bank ─────────────────────────────────────────────────────────

  async listQuestions(query: QuestionsQueryDto) {
    const { page = 1, limit = 20, search, isActive } = query;
    const where: Record<string, unknown> = {};
    if (search) where.questionText = ILike(`%${search}%`);
    if (isActive !== undefined) where.isActive = Equal(isActive);

    const [items, total] = await this.questionRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getQuestion(id: string) {
    const q = await this.questionRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Câu hỏi không tồn tại');
    return q;
  }

  async createQuestion(dto: CreateQuestionDto) {
    const question = this.questionRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    return this.questionRepo.save(question);
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const question = await this.getQuestion(id);
    Object.assign(question, dto);
    return this.questionRepo.save(question);
  }

  async toggleQuestion(id: string) {
    const question = await this.getQuestion(id);
    question.isActive = !question.isActive;
    return this.questionRepo.save(question);
  }

  async deleteQuestion(id: string) {
    const question = await this.getQuestion(id);
    const usedCount = await this.quizQuestionRepo.count({
      where: { questionId: id },
    });
    if (usedCount > 0) {
      throw new BadRequestException(
        'Câu hỏi đang được sử dụng trong bài kiểm tra, không thể xóa',
      );
    }
    await this.questionRepo.remove(question);
  }

  // ─── Quiz Config ──────────────────────────────────────────────────────────

  async listQuizzes() {
    const quizzes = await this.quizRepo.find({ order: { createdAt: 'DESC' } });
    const result = await Promise.all(
      quizzes.map(async (quiz) => {
        const questionCount = await this.quizQuestionRepo.count({
          where: { quizId: quiz.id },
        });
        const [attemptCount, passedCount] = await Promise.all([
          this.attemptRepo.count({ where: { quizId: quiz.id } }),
          this.attemptRepo.count({
            where: { quizId: quiz.id, status: 'PASSED' as any },
          }),
        ]);
        const passRate =
          attemptCount > 0 ? Math.round((passedCount / attemptCount) * 100) : 0;
        return { ...quiz, questionCount, attemptCount, passRate };
      }),
    );
    return result;
  }

  async getQuiz(id: string) {
    const quiz = await this.quizRepo.findOne({ where: { id } });
    if (!quiz) throw new NotFoundException('Bài kiểm tra không tồn tại');
    return quiz;
  }

  async createQuiz(dto: CreateQuizDto) {
    const quiz = this.quizRepo.create(dto);
    return this.quizRepo.save(quiz);
  }

  async updateQuiz(id: string, dto: UpdateQuizDto) {
    const quiz = await this.getQuiz(id);
    Object.assign(quiz, dto);
    return this.quizRepo.save(quiz);
  }

  async activateQuiz(id: string) {
    const quiz = await this.getQuiz(id);
    const questionCount = await this.quizQuestionRepo.count({
      where: { quizId: id },
    });
    if (questionCount === 0) {
      throw new BadRequestException('Bài kiểm tra chưa có câu hỏi nào');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(QuizEntity, { isActive: true }, { isActive: false });
      quiz.isActive = true;
      return manager.save(QuizEntity, quiz);
    });
  }

  // ─── Quiz Questions ────────────────────────────────────────────────────────

  async listQuizQuestions(quizId: string) {
    await this.getQuiz(quizId);
    const rows = await this.quizQuestionRepo.find({
      where: { quizId },
      relations: ['question'],
      order: { orderIndex: 'ASC' },
    });
    return rows.map((r) => ({
      ...r.question,
      orderIndex: r.orderIndex,
      quizQuestionId: r.id,
    }));
  }

  async assignQuestions(quizId: string, dto: AssignQuestionsDto) {
    await this.getQuiz(quizId);
    const { questionIds, orderIndexes } = dto;

    const existing = await this.quizQuestionRepo.find({
      where: { quizId },
      order: { orderIndex: 'ASC' },
    });
    const maxOrder =
      existing.length > 0 ? Math.max(...existing.map((e) => e.orderIndex)) : 0;

    const newRows = questionIds
      .map((qId, i) => {
        const alreadyAssigned = existing.find((e) => e.questionId === qId);
        if (alreadyAssigned) return null;
        return this.quizQuestionRepo.create({
          quizId,
          questionId: qId,
          orderIndex: orderIndexes?.[i] ?? maxOrder + i + 1,
        });
      })
      .filter(Boolean) as QuizQuestionEntity[];

    if (newRows.length === 0) return { assigned: 0 };
    await this.quizQuestionRepo.save(newRows);
    return { assigned: newRows.length };
  }

  async removeQuizQuestion(quizId: string, questionId: string) {
    const row = await this.quizQuestionRepo.findOne({
      where: { quizId, questionId },
    });
    if (!row)
      throw new NotFoundException('Câu hỏi không có trong bài kiểm tra');
    await this.quizQuestionRepo.remove(row);
  }

  async reorderQuestions(quizId: string, dto: ReorderQuestionsDto) {
    await this.getQuiz(quizId);
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < dto.orderedQuestionIds.length; i++) {
        await manager.update(
          QuizQuestionEntity,
          { quizId, questionId: dto.orderedQuestionIds[i] },
          { orderIndex: i + 1 },
        );
      }
    });
  }

  // ─── Attempts ─────────────────────────────────────────────────────────────

  async listAttempts(quizId: string | undefined, query: QuizAttemptsQueryDto) {
    const { page = 1, limit = 20, status, taskerId, from, to } = query;
    const qb = this.attemptRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'user')
      .orderBy('a.startedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (quizId) qb.andWhere('a.quiz_id = :quizId', { quizId });
    if (status) qb.andWhere('a.status = :status', { status });
    if (taskerId) qb.andWhere('a.tasker_id = :taskerId', { taskerId });
    if (from) qb.andWhere('a.started_at >= :from', { from });
    if (to) qb.andWhere('a.started_at <= :to', { to });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getAttemptDetail(attemptId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { id: attemptId },
      relations: ['tasker', 'tasker.user'],
    });
    if (!attempt) throw new NotFoundException('Attempt không tồn tại');

    const answers = await this.answerRepo.find({
      where: { attemptId },
      relations: ['question'],
    });

    const quizQuestions = await this.quizQuestionRepo.find({
      where: { quizId: attempt.quizId },
      order: { orderIndex: 'ASC' },
    });
    const orderMap = new Map(
      quizQuestions.map((qq) => [qq.questionId, qq.orderIndex]),
    );

    const questions = answers
      .map((a) => ({
        id: a.question.id,
        orderIndex: orderMap.get(a.questionId) ?? 0,
        questionText: a.question.questionText,
        options: a.question.options,
        correctAnswer: a.question.correctAnswer,
        selectedAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return { attempt, questions };
  }

  async getStats(quizId: string) {
    await this.getQuiz(quizId);
    const total = await this.attemptRepo.count({ where: { quizId } });
    const passed = await this.attemptRepo.count({
      where: { quizId, status: 'PASSED' as any },
    });
    const avgResult = await this.attemptRepo
      .createQueryBuilder('a')
      .select('AVG(a.score)', 'avg')
      .where('a.quiz_id = :quizId AND a.score IS NOT NULL', { quizId })
      .getRawOne<{ avg: string }>();

    return {
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgScore: avgResult?.avg ? Math.round(Number(avgResult.avg)) : null,
    };
  }
}
