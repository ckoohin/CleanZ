import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from './entity/review.entity';
import { ReviewReportEntity } from './entity/review-report.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { DecideReportDto, ReportDecision } from './dto/decide-report.dto';
import { TaskerReplyDto } from './dto/tasker-reply.dto';
import { BookingEntity } from '../booking/entity/booking.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { TaskerEntity } from '../tasker/entity/tasker.entity';
import { ReviewReportStatus } from 'src/common/enums/review-report-status.enum';

function parseFloat2(val: string | null | undefined): number {
  return val ? parseFloat(val) : 0;
}

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(ReviewReportEntity)
    private readonly reportRepo: Repository<ReviewReportEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(TaskerEntity)
    private readonly taskerRepo: Repository<TaskerEntity>,
  ) {}

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async resolveTaskerId(userId: string): Promise<string> {
    const tasker = await this.taskerRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!tasker) throw new ForbiddenException('Bạn chưa đăng ký làm tasker');
    return tasker.id;
  }

  private async recalcTaskerRating(taskerId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.tasker_id = :taskerId', { taskerId })
      .andWhere('r.is_hidden = false')
      .select('AVG(r.overall_rating)', 'avg')
      .getRawOne<{ avg: string | null }>();

    const avg = result?.avg ? parseFloat(result.avg) : 5;
    await this.taskerRepo.update(taskerId, {
      ratingAvg: Math.round(avg * 100) / 100,
    });
  }

  // ─── Customer ───────────────────────────────────────────────────────────────

  async createReview(bookingId: string, userId: string, dto: CreateReviewDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['customer', 'customer.user', 'tasker'],
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (!booking.customer || booking.customer.user.id !== userId)
      throw new ForbiddenException('Bạn không có quyền đánh giá đơn hàng này');

    if (booking.status !== BookingStatus.COMPLETED)
      throw new BadRequestException(
        'Chỉ có thể đánh giá đơn hàng đã hoàn thành',
      );

    if (!booking.tasker)
      throw new BadRequestException('Đơn hàng chưa có Tasker');

    const existing = await this.reviewRepo.findOne({ where: { bookingId } });
    if (existing)
      throw new BadRequestException('Đơn hàng này đã được đánh giá');

    const review = this.reviewRepo.create({
      bookingId,
      customerId: booking.customer.id,
      taskerId: booking.tasker.id,
      packageId: booking.packageId,
      overallRating: dto.overallRating,
      punctuality: dto.punctuality ?? 5,
      cleanliness: dto.cleanliness ?? 5,
      friendliness: dto.friendliness ?? 5,
      satisfaction: dto.satisfaction ?? 5,
      comment: dto.comment ?? null,
      isAnonymous: dto.isAnonymous ?? false,
      images: dto.images?.length ? dto.images : null,
    });

    await this.reviewRepo.save(review);
    await this.recalcTaskerRating(booking.tasker.id);

    return { message: 'Đánh giá thành công', review };
  }

  async getReviewByBooking(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['customer', 'customer.user'],
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (!booking.customer || booking.customer.user.id !== userId)
      throw new ForbiddenException('Bạn không có quyền xem đánh giá này');

    const review = await this.reviewRepo.findOne({ where: { bookingId } });
    return { review: review ?? null };
  }

  async reportReview(reviewId: string, userId: string, dto: ReportReviewDto) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');

    const existing = await this.reportRepo.findOne({
      where: { reviewId, reportedBy: userId },
    });
    if (existing)
      throw new BadRequestException('Bạn đã báo cáo đánh giá này rồi');

    const report = this.reportRepo.create({
      reviewId,
      reportedBy: userId,
      reason: dto.reason,
      description: dto.description ?? null,
    });
    await this.reportRepo.save(report);
    await this.reviewRepo.increment({ id: reviewId }, 'reportCount', 1);

    return {
      message: 'Đã gửi báo cáo. Chúng tôi sẽ xem xét trong thời gian sớm nhất.',
    };
  }

  // ─── Package (public) ─────────────────────────────────────────────────────────

  async getPackageReviews(
    packageId: string,
    page = 1,
    limit = 10,
    stars?: number,
  ) {
    const skip = (page - 1) * limit;

    const baseQb = (applyStars = false) => {
      const qb = this.reviewRepo
        .createQueryBuilder('r')
        .where('r.package_id = :packageId', { packageId })
        .andWhere('r.is_hidden = false');

      if (applyStars && stars !== undefined && !isNaN(stars)) {
        qb.andWhere('FLOOR(r.overall_rating)::int = :stars', { stars });
      }

      return qb;
    };

    const [rawItems, total, aggResult, distribution] = await Promise.all([
      baseQb(true)
        .leftJoin('customers', 'c', 'c.id = r.customer_id')
        .leftJoin('users', 'u', 'u.id = c.user_id')
        .select([
          'r.id AS id',
          'r.overall_rating AS "overallRating"',
          'r.punctuality AS punctuality',
          'r.cleanliness AS cleanliness',
          'r.friendliness AS friendliness',
          'r.satisfaction AS satisfaction',
          'r.comment AS comment',
          'r.images AS images',
          'r.admin_reply AS "adminReply"',
          'r.tasker_reply AS "taskerReply"',
          'r.is_anonymous AS "isAnonymous"',
          'r.created_at AS "createdAt"',
          `CASE WHEN r.is_anonymous THEN NULL ELSE u.full_name END AS "customerName"`,
          `CASE WHEN r.is_anonymous THEN NULL ELSE u.avatar_url END AS avatar`,
        ])
        .orderBy('r.created_at', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany<{
          id: string;
          overallRating: string;
          punctuality: number;
          cleanliness: number;
          friendliness: number;
          satisfaction: number;
          comment: string | null;
          images: string | null;
          adminReply: string | null;
          taskerReply: string | null;
          isAnonymous: boolean;
          createdAt: Date;
          customerName: string | null;
          avatar: string | null;
        }>(),

      baseQb(true).getCount(),

      baseQb(false)
        .select('AVG(r.overall_rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .getRawOne<{ avg: string; count: string }>(),

      baseQb(false)
        .select('FLOOR(r.overall_rating)::int', 'star')
        .addSelect('COUNT(*)', 'count')
        .groupBy('FLOOR(r.overall_rating)::int')
        .getRawMany<{ star: number; count: string }>(),
    ]);

    const totalAll = parseInt(aggResult?.count ?? '0');

    return {
      items: rawItems.map((r) => ({
        ...r,
        overallRating: parseFloat2(r.overallRating),
        images: r.images ? (JSON.parse(r.images) as string[]) : [],
      })),
      total,
      avgRating: parseFloat2(aggResult?.avg),
      totalReviews: totalAll,
      distribution: [5, 4, 3, 2, 1].map((star) => {
        const found = distribution.find((d) => Number(d.star) === star);
        const count = found ? parseInt(found.count) : 0;
        return {
          stars: star,
          count,
          pct: totalAll > 0 ? Math.round((count / totalAll) * 1000) / 10 : 0,
        };
      }),
    };
  }

  async getTaskerPublicReviews(taskerId: string, page = 1, limit = 5) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 20);
    const skip = (safePage - 1) * safeLimit;

    const tasker = await this.taskerRepo.findOne({
      where: { id: taskerId },
      relations: ['user'],
    });
    if (!tasker) throw new NotFoundException('Không tìm thấy Tasker');

    const baseQb = () =>
      this.reviewRepo
        .createQueryBuilder('r')
        .where('r.tasker_id = :taskerId', { taskerId })
        .andWhere('r.is_hidden = false');

    const [rawItems, total, aggResult, distribution] = await Promise.all([
      baseQb()
        .leftJoin('customers', 'c', 'c.id = r.customer_id')
        .leftJoin('users', 'u', 'u.id = c.user_id')
        .leftJoin('bookings', 'b', 'b.id = r.booking_id')
        .select([
          'r.id AS id',
          'r.overall_rating AS "overallRating"',
          'r.punctuality AS punctuality',
          'r.cleanliness AS cleanliness',
          'r.friendliness AS friendliness',
          'r.satisfaction AS satisfaction',
          'r.comment AS comment',
          'r.images AS images',
          'r.admin_reply AS "adminReply"',
          'r.tasker_reply AS "taskerReply"',
          'r.tasker_replied_at AS "taskerRepliedAt"',
          'r.is_anonymous AS "isAnonymous"',
          'r.created_at AS "createdAt"',
          'b.booking_code AS "bookingCode"',
          `CASE WHEN r.is_anonymous THEN 'Ẩn danh' ELSE u.full_name END AS "customerName"`,
          `CASE WHEN r.is_anonymous THEN NULL ELSE u.avatar_url END AS avatar`,
        ])
        .orderBy('r.created_at', 'DESC')
        .offset(skip)
        .limit(safeLimit)
        .getRawMany<{
          id: string;
          overallRating: string;
          punctuality: number;
          cleanliness: number;
          friendliness: number;
          satisfaction: number;
          comment: string | null;
          images: string | null;
          adminReply: string | null;
          taskerReply: string | null;
          taskerRepliedAt: Date | null;
          isAnonymous: boolean;
          createdAt: Date;
          bookingCode: string | null;
          customerName: string | null;
          avatar: string | null;
        }>(),

      baseQb().getCount(),

      baseQb()
        .select('AVG(r.overall_rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .getRawOne<{ avg: string; count: string }>(),

      baseQb()
        .select('FLOOR(r.overall_rating)::int', 'star')
        .addSelect('COUNT(*)', 'count')
        .groupBy('FLOOR(r.overall_rating)::int')
        .getRawMany<{ star: number; count: string }>(),
    ]);

    return {
      tasker: {
        id: tasker.id,
        fullName: tasker.user?.fullName ?? null,
        avatarUrl: tasker.user?.avatarUrl ?? null,
        ratingAvg: Number(tasker.ratingAvg),
        totalCompletedJobs: tasker.totalCompletedJobs,
      },
      items: rawItems.map((r) => ({
        ...r,
        overallRating: parseFloat2(r.overallRating),
        images: r.images ? (JSON.parse(r.images) as string[]) : [],
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      avgRating: parseFloat2(aggResult?.avg),
      totalReviews: parseInt(aggResult?.count ?? '0'),
      distribution: [5, 4, 3, 2, 1].map((star) => {
        const found = distribution.find((d) => Number(d.star) === star);
        const count = found ? parseInt(found.count) : 0;
        return {
          stars: star,
          count,
          pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        };
      }),
    };
  }

  // ─── Tasker ─────────────────────────────────────────────────────────────────

  async taskerGetMyReviews(
    userId: string,
    page = 1,
    limit = 20,
    minRating?: number,
    maxRating?: number,
  ) {
    const taskerId = await this.resolveTaskerId(userId);
    const skip = (page - 1) * limit;

    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoin('customers', 'c', 'c.id = r.customer_id')
      .leftJoin('users', 'u', 'u.id = c.user_id')
      .leftJoin('bookings', 'b', 'b.id = r.booking_id')
      .where('r.tasker_id = :taskerId', { taskerId })
      .andWhere('r.is_hidden = false')
      .select([
        'r.id AS id',
        'r.overall_rating AS "overallRating"',
        'r.punctuality AS punctuality',
        'r.cleanliness AS cleanliness',
        'r.friendliness AS friendliness',
        'r.satisfaction AS satisfaction',
        'r.comment AS comment',
        'r.images AS images',
        'r.tasker_reply AS "taskerReply"',
        'r.tasker_replied_at AS "taskerRepliedAt"',
        'r.report_count AS "reportCount"',
        'r.is_anonymous AS "isAnonymous"',
        'r.created_at AS "createdAt"',
        `CASE WHEN r.is_anonymous THEN 'Ẩn danh' ELSE u.full_name END AS "customerName"`,
        'b.booking_code AS "bookingCode"',
      ]);

    if (minRating !== undefined)
      qb.andWhere('r.overall_rating >= :minRating', { minRating });
    if (maxRating !== undefined)
      qb.andWhere('r.overall_rating <= :maxRating', { maxRating });

    const [rawItems, total, aggResult] = await Promise.all([
      qb
        .clone()
        .orderBy('r.created_at', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany<{
          id: string;
          overallRating: string;
          punctuality: number;
          cleanliness: number;
          friendliness: number;
          satisfaction: number;
          comment: string | null;
          images: string | null;
          taskerReply: string | null;
          taskerRepliedAt: Date | null;
          reportCount: number;
          isAnonymous: boolean;
          createdAt: Date;
          customerName: string | null;
          bookingCode: string | null;
        }>(),
      qb.getCount(),
      this.reviewRepo
        .createQueryBuilder('r')
        .where('r.tasker_id = :taskerId', { taskerId })
        .andWhere('r.is_hidden = false')
        .select('AVG(r.overall_rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .getRawOne<{ avg: string; count: string }>(),
    ]);

    return {
      items: rawItems.map((r) => ({
        ...r,
        overallRating: parseFloat2(r.overallRating),
        images: r.images ? (JSON.parse(r.images) as string[]) : [],
      })),
      total,
      page,
      limit,
      avgRating: parseFloat2(aggResult?.avg),
      totalReviews: parseInt(aggResult?.count ?? '0'),
    };
  }

  async taskerReplyReview(
    reviewId: string,
    userId: string,
    dto: TaskerReplyDto,
  ) {
    const taskerId = await this.resolveTaskerId(userId);
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.taskerId !== taskerId)
      throw new ForbiddenException('Bạn không có quyền phản hồi đánh giá này');
    if (review.taskerReply)
      throw new BadRequestException(
        'Bạn đã phản hồi đánh giá này rồi (chỉ được phép 1 lần)',
      );

    review.taskerReply = dto.reply;
    review.taskerRepliedAt = new Date();
    await this.reviewRepo.save(review);

    return { message: 'Đã gửi phản hồi', taskerReply: review.taskerReply };
  }

  async taskerReportReview(
    reviewId: string,
    userId: string,
    dto: ReportReviewDto,
  ) {
    const taskerId = await this.resolveTaskerId(userId);
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.taskerId !== taskerId)
      throw new ForbiddenException('Đây không phải đánh giá dành cho bạn');

    const existing = await this.reportRepo.findOne({
      where: { reviewId, reportedBy: taskerId },
    });
    if (existing)
      throw new BadRequestException('Bạn đã báo cáo đánh giá này rồi');

    const report = this.reportRepo.create({
      reviewId,
      reportedBy: taskerId,
      reason: dto.reason,
      description: dto.description ?? null,
    });
    await this.reportRepo.save(report);
    await this.reviewRepo.increment({ id: reviewId }, 'reportCount', 1);

    return { message: 'Đã gửi báo cáo.' };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async getAdminReviews(query: AdminReviewQueryDto) {
    const {
      page = 1,
      limit = 20,
      fromDate,
      toDate,
      minRating,
      maxRating,
      isHidden,
      taskerId,
      reportStatus,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoin('customers', 'c', 'c.id = r.customer_id')
      .leftJoin('users', 'cu', 'cu.id = c.user_id')
      .leftJoin('taskers', 't', 't.id = r.tasker_id')
      .leftJoin('users', 'tu', 'tu.id = t.user_id')
      .leftJoin('bookings', 'b', 'b.id = r.booking_id')
      .select([
        'r.id AS id',
        'r.booking_id AS "bookingId"',
        'r.customer_id AS "customerId"',
        'r.tasker_id AS "taskerId"',
        'r.package_id AS "packageId"',
        'r.overall_rating AS "overallRating"',
        'r.punctuality AS punctuality',
        'r.cleanliness AS cleanliness',
        'r.friendliness AS friendliness',
        'r.satisfaction AS satisfaction',
        'r.comment AS comment',
        'r.images AS images',
        'r.is_anonymous AS "isAnonymous"',
        'r.is_hidden AS "isHidden"',
        'r.admin_reply AS "adminReply"',
        'r.tasker_reply AS "taskerReply"',
        'r.report_count AS "reportCount"',
        'r.created_at AS "createdAt"',
        'cu.full_name AS "customerName"',
        'cu.avatar_url AS "customerAvatar"',
        'tu.full_name AS "taskerName"',
        'b.booking_code AS "bookingCode"',
      ]);

    if (fromDate) qb.andWhere('r.created_at >= :fromDate', { fromDate });
    if (toDate) qb.andWhere('r.created_at <= :toDate', { toDate });
    if (minRating !== undefined)
      qb.andWhere('r.overall_rating >= :minRating', { minRating });
    if (maxRating !== undefined)
      qb.andWhere('r.overall_rating <= :maxRating', { maxRating });
    if (isHidden !== undefined)
      qb.andWhere('r.is_hidden = :isHidden', { isHidden });
    if (taskerId) qb.andWhere('r.tasker_id = :taskerId', { taskerId });
    if (reportStatus === ReviewReportStatus.PENDING) {
      qb.andWhere('r.report_count > 0');
      qb.innerJoin(
        'review_reports',
        'rr',
        'rr.review_id = r.id AND rr.status = :rStatus',
        { rStatus: ReviewReportStatus.PENDING },
      );
    }

    type RawRow = {
      id: string;
      bookingId: string;
      customerId: string;
      taskerId: string;
      packageId: string | null;
      overallRating: string;
      punctuality: number;
      cleanliness: number;
      friendliness: number;
      satisfaction: number;
      comment: string | null;
      images: string | null;
      isAnonymous: boolean;
      isHidden: boolean;
      adminReply: string | null;
      taskerReply: string | null;
      reportCount: number;
      createdAt: Date;
      customerName: string | null;
      customerAvatar: string | null;
      taskerName: string | null;
      bookingCode: string | null;
    };

    const [total, items] = await Promise.all([
      qb.getCount(),
      qb
        .clone()
        .orderBy('r.created_at', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany<RawRow>(),
    ]);

    return {
      items: items.map((r) => ({
        ...r,
        overallRating: parseFloat2(r.overallRating),
        images: r.images ? (JSON.parse(r.images) as string[]) : [],
      })),
      total,
      page,
      limit,
    };
  }

  async getAdminDashboard(fromDate?: string, toDate?: string) {
    const from = fromDate
      ? new Date(fromDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();

    const [agg, distribution, trend, pendingReports] = await Promise.all([
      this.reviewRepo
        .createQueryBuilder('r')
        .where('r.created_at BETWEEN :from AND :to', { from, to })
        .andWhere('r.is_hidden = false')
        .select([
          'AVG(r.overall_rating) AS avg',
          'COUNT(*) AS total',
          `COUNT(*) FILTER (WHERE r.overall_rating >= 4.5) AS promoters`,
          `COUNT(*) FILTER (WHERE r.overall_rating <= 3) AS detractors`,
          'AVG(r.punctuality) AS "avgPunctuality"',
          'AVG(r.cleanliness) AS "avgCleanliness"',
          'AVG(r.friendliness) AS "avgFriendliness"',
          'AVG(r.satisfaction) AS "avgSatisfaction"',
        ])
        .getRawOne<{
          avg: string;
          total: string;
          promoters: string;
          detractors: string;
          avgPunctuality: string;
          avgCleanliness: string;
          avgFriendliness: string;
          avgSatisfaction: string;
        }>(),

      this.reviewRepo
        .createQueryBuilder('r')
        .where('r.created_at BETWEEN :from AND :to', { from, to })
        .andWhere('r.is_hidden = false')
        .select('FLOOR(r.overall_rating)::int', 'star')
        .addSelect('COUNT(*)', 'count')
        .groupBy('FLOOR(r.overall_rating)::int')
        .getRawMany<{ star: number; count: string }>(),

      this.reviewRepo
        .createQueryBuilder('r')
        .where('r.created_at BETWEEN :from AND :to', { from, to })
        .andWhere('r.is_hidden = false')
        .select(`DATE_TRUNC('day', r.created_at)::date`, 'date')
        .addSelect('COUNT(*)', 'count')
        .addSelect('AVG(r.overall_rating)', 'avg')
        .groupBy(`DATE_TRUNC('day', r.created_at)::date`)
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string; avg: string }>(),

      this.reportRepo
        .createQueryBuilder('rr')
        .where('rr.status = :status', { status: ReviewReportStatus.PENDING })
        .getCount(),
    ]);

    const total = parseInt(agg?.total ?? '0');
    const promoters = parseInt(agg?.promoters ?? '0');
    const detractors = parseInt(agg?.detractors ?? '0');
    const nps =
      total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return {
      summary: {
        avgRating: parseFloat2(agg?.avg),
        total,
        nps,
        criteria: {
          punctuality: parseFloat2(agg?.avgPunctuality),
          cleanliness: parseFloat2(agg?.avgCleanliness),
          friendliness: parseFloat2(agg?.avgFriendliness),
          satisfaction: parseFloat2(agg?.avgSatisfaction),
        },
      },
      distribution: [5, 4, 3, 2, 1].map((star) => {
        const found = distribution.find((d) => Number(d.star) === star);
        const count = found ? parseInt(found.count) : 0;
        return {
          stars: star,
          count,
          pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        };
      }),
      trend: trend.map((t) => ({
        date: t.date,
        count: parseInt(t.count),
        avg: parseFloat2(t.avg),
      })),
      pendingReports,
    };
  }

  async getAdminReports(page = 1, limit = 20, status?: ReviewReportStatus) {
    const skip = (page - 1) * limit;

    const qb = this.reportRepo
      .createQueryBuilder('rr')
      .leftJoin('reviews', 'r', 'r.id = rr.review_id')
      .leftJoin('users', 'reporter', 'reporter.id = rr.reported_by')
      .select([
        'rr.id AS id',
        'rr.review_id AS "reviewId"',
        'rr.reported_by AS "reportedBy"',
        'rr.reason AS reason',
        'rr.description AS description',
        'rr.status AS status',
        'rr.admin_note AS "adminNote"',
        'rr.reviewed_at AS "reviewedAt"',
        'rr.created_at AS "createdAt"',
        'reporter.full_name AS "reporterName"',
        'r.overall_rating AS "reviewRating"',
        'r.comment AS "reviewComment"',
        'r.is_hidden AS "reviewHidden"',
      ]);

    if (status) qb.where('rr.status = :status', { status });

    type RawReport = {
      id: string;
      reviewId: string;
      reportedBy: string;
      reason: string;
      description: string | null;
      status: string;
      adminNote: string | null;
      reviewedAt: Date | null;
      createdAt: Date;
      reporterName: string | null;
      reviewRating: string | null;
      reviewComment: string | null;
      reviewHidden: boolean | null;
    };

    const [total, items] = await Promise.all([
      qb.getCount(),
      qb
        .clone()
        .orderBy('rr.created_at', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany<RawReport>(),
    ]);

    return {
      items: items.map((r) => ({
        ...r,
        reviewRating: r.reviewRating ? parseFloat2(r.reviewRating) : null,
      })),
      total,
      page,
      limit,
    };
  }

  async decideReport(
    reportId: string,
    adminUserId: string,
    dto: DecideReportDto,
  ) {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
    if (report.status !== ReviewReportStatus.PENDING)
      throw new BadRequestException('Báo cáo đã được xử lý trước đó');

    report.status =
      dto.decision === ReportDecision.APPROVE
        ? ReviewReportStatus.APPROVED
        : ReviewReportStatus.REJECTED;
    report.reviewedBy = adminUserId;
    report.reviewedAt = new Date();
    report.adminNote = dto.note ?? null;
    await this.reportRepo.save(report);

    if (dto.decision === ReportDecision.APPROVE) {
      await this.reviewRepo.update(report.reviewId, { isHidden: true });
      const review = await this.reviewRepo.findOne({
        where: { id: report.reviewId },
      });
      if (review) await this.recalcTaskerRating(review.taskerId);
    }

    return {
      message:
        dto.decision === ReportDecision.APPROVE
          ? 'Đã duyệt và ẩn đánh giá'
          : 'Đã từ chối báo cáo',
    };
  }

  async toggleHide(id: string) {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    review.isHidden = !review.isHidden;
    await this.reviewRepo.save(review);
    await this.recalcTaskerRating(review.taskerId);
    return {
      message: review.isHidden ? 'Đã ẩn đánh giá' : 'Đã hiện đánh giá',
      isHidden: review.isHidden,
    };
  }

  async setAdminReply(id: string, reply: string | null | undefined) {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    review.adminReply = reply ?? null;
    await this.reviewRepo.save(review);
    return { message: 'Đã lưu phản hồi', adminReply: review.adminReply };
  }

  async exportCsv(query: AdminReviewQueryDto): Promise<Buffer> {
    const data = await this.getAdminReviews({ ...query, page: 1, limit: 1000 });

    const header = [
      'ID',
      'Mã đơn',
      'Khách hàng',
      'Tasker',
      'Tổng điểm',
      'Đúng giờ',
      'Vệ sinh',
      'Thái độ',
      'Hài lòng',
      'Bình luận',
      'Ẩn danh',
      'Đã ẩn',
      'Ngày tạo',
    ].join(',');

    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

    const rows = data.items.map((r) =>
      [
        r.id,
        r.bookingCode ?? '',
        esc(r.customerName ?? ''),
        esc(r.taskerName ?? ''),
        r.overallRating,
        r.punctuality,
        r.cleanliness,
        r.friendliness,
        r.satisfaction,
        esc(r.comment ?? ''),
        r.isAnonymous ? 'Có' : 'Không',
        r.isHidden ? 'Có' : 'Không',
        new Date(r.createdAt).toLocaleString('vi-VN'),
      ].join(','),
    );

    return Buffer.from([header, ...rows].join('\n'), 'utf-8');
  }
}
