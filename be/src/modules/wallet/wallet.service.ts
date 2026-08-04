import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { WalletEntity } from './entity/wallet.entity';
import { PaginatedData } from 'src/common/helpers/response.interface';
import { WalletListQueryDto } from './dto/wallet-list-query.dto';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { SYSTEM_CONFIG_KEYS } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';
import type { TaskerEarningsPeriod } from './dto/tasker-earnings-breakdown-query.dto';
import { VN_NOW_SQL } from 'src/common/helpers/vietnam-time.helper';
import { sumOutstandingDebt } from './entity/tasker-debt.entity';

interface WalletMutationInput {
  wallet: WalletEntity;
  amount: number;
  type: WalletTransactionType;
  booking?: BookingEntity | null;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
}

interface WalletTransferInput {
  fromWallet: WalletEntity;
  toWallet: WalletEntity;
  amount: number;
  debitType: WalletTransactionType;
  creditType: WalletTransactionType;
  booking?: BookingEntity | null;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
}

export interface WithdrawalLimits {
  minVnd: number;
  maxVnd: number;
  maxPerWeek: number;
}

export interface WalletResponse {
  id: string;
  ownerType: WalletOwnerType;
  balance: number;
  holdBalance: number;
  taskerId?: string | null;
  customerId?: string | null;
  /** Chỉ có ở ví Tasker: sàn phải giữ lại để còn nhận đơn (0 nếu đã nghỉ việc). */
  minAcceptBalance?: number;
  /** Chỉ có ở ví Tasker: balance − minAcceptBalance. */
  withdrawableBalance?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionResponse {
  id: string;
  walletId: string;
  bookingId?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: Date;
  /** Tóm tắt booking để FE đối soát thu nhập/chiết khấu ngay tại giao dịch. */
  booking?: {
    id: string;
    bookingCode: string;
    totalPrice: number;
    discountAmount: number;
  } | null;
}

export interface WalletTransactionListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: WalletTransactionResponse[];
}

export interface WalletTransactionQueryOpts {
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
  fromDate?: string;
  toDate?: string;
}

export interface TaskerEarningsSummaryResponse {
  today: number;
  week: number;
  month: number;
  year: number;
  completedBookings: number;
}

export interface TaskerEarningsBreakdownResponse {
  period: TaskerEarningsPeriod;
  total: number;
  availableFrom: string;
  availableTo: string;
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  selectedValue: string;
  options: Array<{
    value: string;
    label: string;
    isCurrent: boolean;
  }>;
  points: Array<{
    key: string;
    label: string;
    dateLabel: string;
    amount: number;
    rangeStart: string;
    rangeEnd: string;
  }>;
}

type CalendarPeriod = 'day' | 'week' | 'month' | 'year';

interface EarningsBucketTemplate {
  key: string;
  label: string;
  dateLabel: string;
  rangeStart: string;
  rangeEnd: string;
}

interface EarningsWindow {
  startAt: string;
  endAt: string;
  availableFrom: string;
  availableTo: string;
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  selectedValue: string;
  options: TaskerEarningsBreakdownResponse['options'];
  bucketUnit: 'hour' | 'day' | 'month';
  bucketFormat: 'YYYY-MM-DD HH24' | 'YYYY-MM-DD' | 'YYYY-MM';
  points: EarningsBucketTemplate[];
}

const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const pad2 = (value: number): string => String(value).padStart(2, '0');

const localDateKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

const localMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;

/**
 * Biên truy vấn cho cột `timestamp` trong DB — nay lưu theo GIỜ VIỆT NAM
 * (migration NormalizeTimestampsToVietnamTime) nên KHÔNG trừ offset nữa.
 * `localTime` vốn đã là giờ VN được gói trong epoch UTC, nên lấy thẳng chữ số.
 */
const databaseVietnamTimestamp = (localTime: number): string =>
  new Date(localTime).toISOString().slice(0, 23).replace('T', ' ');

const utcIsoFromLocal = (localTime: number): string =>
  new Date(localTime - VIETNAM_UTC_OFFSET_MS).toISOString();

const localDateLabel = (localTime: number, includeYear = false): string => {
  const date = new Date(localTime);
  const value = `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}`;
  return includeYear ? `${value}/${date.getUTCFullYear()}` : value;
};

const startOfLocalWeek = (localTime: number): number => {
  const date = new Date(localTime);
  const daysFromMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysFromMonday,
  );
};

const startOfLocalMonth = (localTime: number): number => {
  const date = new Date(localTime);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

const startOfLocalYear = (localTime: number): number => {
  const date = new Date(localTime);
  return Date.UTC(date.getUTCFullYear(), 0, 1);
};

const parseLocalAnchor = (anchor: string | undefined, fallback: number) => {
  if (!anchor) return fallback;
  const [year, month, day] = anchor.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const nextPeriodStart = (
  period: Exclude<TaskerEarningsPeriod, 'today'>,
  localTime: number,
): number => {
  const date = new Date(localTime);
  if (period === 'week') return localTime + 7 * 24 * 60 * 60 * 1000;
  if (period === 'month') {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  return Date.UTC(date.getUTCFullYear() + 1, 0, 1);
};

const periodStart = (
  period: Exclude<TaskerEarningsPeriod, 'today'>,
  localTime: number,
): number => {
  if (period === 'week') return startOfLocalWeek(localTime);
  if (period === 'month') return startOfLocalMonth(localTime);
  return startOfLocalYear(localTime);
};

const periodOptionLabel = (
  period: Exclude<TaskerEarningsPeriod, 'today'>,
  localTime: number,
): string => {
  const date = new Date(localTime);
  if (period === 'week') {
    const end = localTime + 6 * 24 * 60 * 60 * 1000;
    const crossesYear =
      date.getUTCFullYear() !== new Date(end).getUTCFullYear();
    return crossesYear
      ? `${localDateLabel(localTime, true)} - ${localDateLabel(end, true)}`
      : `${localDateLabel(localTime)} - ${localDateLabel(end, true)}`;
  }
  if (period === 'month') {
    return `Tháng ${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
  }
  return `Năm ${date.getUTCFullYear()}`;
};

const buildPeriodOptions = (
  period: Exclude<TaskerEarningsPeriod, 'today'>,
  accountCreatedLocal: number,
  currentLocal: number,
): TaskerEarningsBreakdownResponse['options'] => {
  const first = periodStart(period, accountCreatedLocal);
  const current = periodStart(period, currentLocal);
  const options: TaskerEarningsBreakdownResponse['options'] = [];

  for (
    let cursor = first;
    cursor <= current;
    cursor = nextPeriodStart(period, cursor)
  ) {
    options.push({
      value: localDateKey(new Date(cursor)),
      label: periodOptionLabel(period, cursor),
      isCurrent: cursor === current,
    });
  }

  return options.reverse();
};

const buildEarningsWindow = (
  period: TaskerEarningsPeriod,
  accountCreatedAt: Date,
  anchor?: string,
  now = new Date(),
): EarningsWindow => {
  const vietnamNow = new Date(now.getTime() + VIETNAM_UTC_OFFSET_MS);
  const vietnamAccountCreated = new Date(
    accountCreatedAt.getTime() + VIETNAM_UTC_OFFSET_MS,
  );
  const currentLocal = Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate(),
  );
  const accountCreatedLocal = Date.UTC(
    vietnamAccountCreated.getUTCFullYear(),
    vietnamAccountCreated.getUTCMonth(),
    vietnamAccountCreated.getUTCDate(),
  );
  let startLocal: number;
  let endLocal: number;
  let rangeLabel: string;
  let selectedValue: string;
  let options: TaskerEarningsBreakdownResponse['options'];
  let bucketUnit: EarningsWindow['bucketUnit'];
  let bucketFormat: EarningsWindow['bucketFormat'];
  let points: EarningsBucketTemplate[];
  const availableFrom = localDateKey(new Date(accountCreatedLocal));
  const availableTo = localDateKey(new Date(currentLocal));

  if (period === 'today') {
    const requestedDay = parseLocalAnchor(anchor, currentLocal);
    startLocal = Math.min(
      currentLocal,
      Math.max(accountCreatedLocal, requestedDay),
    );
    endLocal = startLocal + 24 * 60 * 60 * 1000;
    bucketUnit = 'day';
    bucketFormat = 'YYYY-MM-DD';
    rangeLabel = `Ngày ${localDateLabel(startLocal, true)}`;
    selectedValue = localDateKey(new Date(startLocal));
    options = [];
    points = [
      {
        key: selectedValue,
        label: localDateLabel(startLocal),
        dateLabel: localDateLabel(startLocal, true),
        rangeStart: utcIsoFromLocal(startLocal),
        rangeEnd: utcIsoFromLocal(endLocal),
      },
    ];
  } else {
    const firstStart = periodStart(period, accountCreatedLocal);
    const currentStart = periodStart(period, currentLocal);
    const requestedStart = periodStart(
      period,
      parseLocalAnchor(anchor, currentStart),
    );
    startLocal = Math.min(currentStart, Math.max(firstStart, requestedStart));
    endLocal = nextPeriodStart(period, startLocal);
    rangeLabel = periodOptionLabel(period, startLocal);
    selectedValue = localDateKey(new Date(startLocal));
    options = buildPeriodOptions(period, accountCreatedLocal, currentLocal);

    if (period === 'year') {
      const selectedYear = new Date(startLocal).getUTCFullYear();
      bucketUnit = 'month';
      bucketFormat = 'YYYY-MM';
      points = Array.from({ length: 12 }, (_, index) => {
        const pointStart = Date.UTC(selectedYear, index, 1);
        const pointEnd = Date.UTC(selectedYear, index + 1, 1);
        return {
          key: localMonthKey(new Date(pointStart)),
          label: `T${index + 1}`,
          dateLabel: `Tháng ${index + 1}/${selectedYear}`,
          rangeStart: utcIsoFromLocal(pointStart),
          rangeEnd: utcIsoFromLocal(pointEnd),
        };
      });
    } else {
      const daysInPeriod =
        period === 'week' ? 7 : new Date(endLocal - 1).getUTCDate();
      const startDate = new Date(startLocal);
      bucketUnit = 'day';
      bucketFormat = 'YYYY-MM-DD';
      points = Array.from({ length: daysInPeriod }, (_, index) => {
        const pointStart =
          period === 'week'
            ? startLocal + index * 24 * 60 * 60 * 1000
            : Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                index + 1,
              );
        const pointEnd = pointStart + 24 * 60 * 60 * 1000;
        return {
          key: localDateKey(new Date(pointStart)),
          label: period === 'week' ? WEEKDAY_LABELS[index] : String(index + 1),
          dateLabel: localDateLabel(pointStart),
          rangeStart: utcIsoFromLocal(pointStart),
          rangeEnd: utcIsoFromLocal(pointEnd),
        };
      });
    }
  }

  return {
    startAt: databaseVietnamTimestamp(startLocal),
    endAt: databaseVietnamTimestamp(endLocal),
    availableFrom,
    availableTo,
    rangeStart: utcIsoFromLocal(startLocal),
    rangeEnd: utcIsoFromLocal(endLocal),
    rangeLabel,
    selectedValue,
    options,
    bucketUnit,
    bucketFormat,
    points,
  };
};

/**
 * `created_at` lưu theo GIỜ VIỆT NAM (migration NormalizeTimestampsToVietnamTime).
 * Mốc đầu kỳ cũng tính theo giờ VN để so sánh trực tiếp và vẫn dùng được index.
 */
const vietnamPeriodStartUtc = (period: CalendarPeriod): string =>
  `DATE_TRUNC('${period}', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')`;

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async findAllWallets(
    query: WalletListQueryDto,
  ): Promise<PaginatedData<WalletEntity>> {
    const { page = 1, limit = 20, ownerType, search } = query;
    const skip = (page - 1) * limit;
    const repository = this.dataSource.getRepository(WalletEntity);
    const qb = repository
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('wallet.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .orderBy('wallet.updatedAt', 'DESC');

    if (ownerType) {
      qb.andWhere('wallet.ownerType = :ownerType', { ownerType });
    }

    if (search?.trim()) {
      qb.andWhere(
        `(
          CAST(wallet.id AS text) ILIKE :search
          OR taskerUser.fullName ILIKE :search
          OR taskerUser.email ILIKE :search
          OR customerUser.fullName ILIKE :search
          OR customerUser.email ILIKE :search
        )`,
        { search: `%${search.trim()}%` },
      );
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMyTaskerWallet(userId: string): Promise<WalletResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateTaskerWallet(
        this.dataSource.manager,
        tasker,
      );

      // Tasker cần biết sàn phải giữ lại (để nhận đơn) và phần thật sự rút được.
      const minAcceptBalance =
        tasker.status === TaskerStatus.TERMINATED
          ? 0
          : await this.systemConfig.getRegisteredNumber(
              this.dataSource.manager,
              SYSTEM_CONFIG_KEYS.TASKER_MIN_ACCEPT_BALANCE_VND,
            );

      return {
        ...this.mapWallet(wallet),
        minAcceptBalance,
        withdrawableBalance: Math.max(
          0,
          toNumber(wallet.balance) - minAcceptBalance,
        ),
      };
    }, 'Không thể lấy ví tasker');
  }

  async getMyTaskerEarningsSummary(
    userId: string,
  ): Promise<TaskerEarningsSummaryResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateTaskerWallet(
        this.dataSource.manager,
        tasker,
      );

      const incomeExpression = `
        CASE
          WHEN tx.type = :earningType THEN tx.amount
          WHEN tx.type = :platformFeeType THEN GREATEST(
            COALESCE(booking.totalPrice, 0)
              + COALESCE(booking.discountAmount, 0)
              - tx.amount,
            0
          )
          ELSE 0
        END
      `;
      const dayStart = vietnamPeriodStartUtc('day');
      const weekStart = vietnamPeriodStartUtc('week');
      const monthStart = vietnamPeriodStartUtc('month');
      const yearStart = vietnamPeriodStartUtc('year');

      const summary = await this.dataSource
        .getRepository(WalletTransactionEntity)
        .createQueryBuilder('tx')
        .leftJoin('tx.booking', 'booking')
        .select(
          `COALESCE(SUM(CASE WHEN tx.createdAt >= ${dayStart} THEN ${incomeExpression} ELSE 0 END), 0)`,
          'today',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN tx.createdAt >= ${weekStart} THEN ${incomeExpression} ELSE 0 END), 0)`,
          'week',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN tx.createdAt >= ${monthStart} THEN ${incomeExpression} ELSE 0 END), 0)`,
          'month',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN tx.createdAt >= ${yearStart} THEN ${incomeExpression} ELSE 0 END), 0)`,
          'year',
        )
        .where('tx.wallet = :walletId', { walletId: wallet.id })
        .andWhere('tx.type IN (:...incomeTypes)', {
          incomeTypes: [
            WalletTransactionType.TASKER_EARNING,
            WalletTransactionType.PLATFORM_FEE,
          ],
        })
        .andWhere(`tx.createdAt >= ${yearStart}`)
        .setParameters({
          earningType: WalletTransactionType.TASKER_EARNING,
          platformFeeType: WalletTransactionType.PLATFORM_FEE,
        })
        .getRawOne<{
          today: string;
          week: string;
          month: string;
          year: string;
        }>();

      const completedBookings = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .where('booking.tasker = :taskerId', { taskerId: tasker.id })
        .andWhere('booking.status = :status', {
          status: BookingStatus.COMPLETED,
        })
        .getCount();

      return {
        today: toNumber(summary?.today ?? 0),
        week: toNumber(summary?.week ?? 0),
        month: toNumber(summary?.month ?? 0),
        year: toNumber(summary?.year ?? 0),
        completedBookings,
      };
    }, 'Không thể tổng hợp thu nhập tasker');
  }

  async getMyTaskerEarningsBreakdown(
    userId: string,
    period: TaskerEarningsPeriod,
    anchor?: string,
  ): Promise<TaskerEarningsBreakdownResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateTaskerWallet(
        this.dataSource.manager,
        tasker,
      );
      const window = buildEarningsWindow(period, tasker.createdAt, anchor);
      const incomeExpression = `
        CASE
          WHEN tx.type = :earningType THEN tx.amount
          WHEN tx.type = :platformFeeType THEN GREATEST(
            COALESCE(booking.totalPrice, 0)
              + COALESCE(booking.discountAmount, 0)
              - tx.amount,
            0
          )
          ELSE 0
        END
      `;
      // `created_at` là timestamp không timezone và đã lưu trực tiếp theo giờ
      // Việt Nam, nên gom nhóm trên giá trị gốc. Cộng thêm 7 giờ ở đây sẽ đẩy
      // các giao dịch buổi tối sang bucket của ngày hôm sau.
      const bucketExpression = `DATE_TRUNC('${window.bucketUnit}', tx.createdAt)`;

      const rows = await this.dataSource
        .getRepository(WalletTransactionEntity)
        .createQueryBuilder('tx')
        .leftJoin('tx.booking', 'booking')
        .select(
          `TO_CHAR(${bucketExpression}, '${window.bucketFormat}')`,
          'bucket',
        )
        .addSelect(`COALESCE(SUM(${incomeExpression}), 0)`, 'amount')
        .where('tx.wallet = :walletId', { walletId: wallet.id })
        .andWhere('tx.type IN (:...incomeTypes)', {
          incomeTypes: [
            WalletTransactionType.TASKER_EARNING,
            WalletTransactionType.PLATFORM_FEE,
          ],
        })
        .andWhere('tx.createdAt >= :startAt', { startAt: window.startAt })
        .andWhere('tx.createdAt < :endAt', { endAt: window.endAt })
        .setParameters({
          earningType: WalletTransactionType.TASKER_EARNING,
          platformFeeType: WalletTransactionType.PLATFORM_FEE,
        })
        .groupBy(bucketExpression)
        .orderBy(bucketExpression, 'ASC')
        .getRawMany<{ bucket: string; amount: string }>();

      const amountByBucket = new Map(
        rows.map((row) => [row.bucket, toNumber(row.amount)]),
      );
      const points = window.points.map((point) => ({
        ...point,
        amount: amountByBucket.get(point.key) ?? 0,
      }));

      return {
        period,
        total: points.reduce((sum, point) => sum + point.amount, 0),
        availableFrom: window.availableFrom,
        availableTo: window.availableTo,
        rangeStart: window.rangeStart,
        rangeEnd: window.rangeEnd,
        rangeLabel: window.rangeLabel,
        selectedValue: window.selectedValue,
        options: window.options,
        points,
      };
    }, 'Không thể lấy biểu đồ thu nhập tasker');
  }

  async getMyCustomerWallet(userId: string): Promise<WalletResponse> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateCustomerWallet(
        this.dataSource.manager,
        customer,
      );

      return this.mapWallet(wallet);
    }, 'Không thể lấy ví customer');
  }

  /** Hạn mức rút tiền do admin cấu hình (system_configs) — dùng chung Tasker & Customer. */
  async getWithdrawalLimits(manager: EntityManager): Promise<WithdrawalLimits> {
    const [minVnd, maxVnd, maxPerWeek] = await Promise.all([
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.WITHDRAWAL_MIN_VND,
      ),
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.WITHDRAWAL_MAX_VND,
      ),
      this.systemConfig.getRegisteredNumber(
        manager,
        SYSTEM_CONFIG_KEYS.WITHDRAWAL_MAX_PER_WEEK,
      ),
    ]);

    return { minVnd, maxVnd, maxPerWeek };
  }

  assertWithdrawalAmount(amount: number, limits: WithdrawalLimits): void {
    if (amount < limits.minVnd) {
      throw new BadRequestException(
        `Số tiền rút tối thiểu là ${limits.minVnd.toLocaleString('vi-VN')}đ`,
      );
    }

    if (amount > limits.maxVnd) {
      throw new BadRequestException(
        `Số tiền rút tối đa mỗi lần là ${limits.maxVnd.toLocaleString('vi-VN')}đ`,
      );
    }
  }

  async createTaskerWithdrawalRequest(
    userId: string,
    dto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestEntity> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const tasker = await this.findTaskerByUserId(manager, userId);
        const wallet = await this.getOrCreateTaskerWallet(manager, tasker);
        const lockedWallet = await this.lockWallet(manager, wallet.id);

        // Khóa rút tiền khi Tasker đang có sự cố bồi thường dang dở, chống rút trốn nghĩa
        // vụ. Dùng raw query để không tạo phụ thuộc vòng vào IncidentModule.
        const activeIncident: unknown[] = await manager.query(
          `SELECT 1 FROM incidents
            WHERE tasker_id = $1
              AND status IN ('REVIEWING','AWAITING_RESPONSE','AWAITING_PAYOUT')
            LIMIT 1`,
          [tasker.id],
        );
        if (activeIncident.length > 0) {
          throw new BadRequestException(
            'Bạn đang có sự cố bồi thường đang xử lý — tạm khóa rút tiền cho tới khi hoàn tất.',
          );
        }

        // Còn NỢ thì cũng không cho rút: nếu chỉ chặn lúc đang xử lý sự cố, Tasker rút
        // sạch ví ngay sau khi chi trả là khoản nợ không bao giờ đòi được. Sổ nợ đã trừ
        // sẵn phần Admin xoá nên không khoá nhầm khoản không ai còn đòi.
        const debt = await sumOutstandingDebt(manager, tasker.id);
        if (debt > 0) {
          throw new BadRequestException(
            `Bạn còn nợ bồi thường ${debt.toLocaleString('vi-VN')}đ với nền tảng — ` +
              'khoản này sẽ được trừ dần từ thu nhập. Tạm khóa rút tiền cho tới khi trả hết.',
          );
        }

        const withdrawalRepository = manager.getRepository(
          WithdrawalRequestEntity,
        );

        const weeklyCount = await withdrawalRepository
          .createQueryBuilder('withdrawal')
          .where('withdrawal.taskerId = :taskerId', { taskerId: tasker.id })
          .andWhere('withdrawal.status IN (:...statuses)', {
            statuses: [
              WithdrawalStatus.PENDING,
              WithdrawalStatus.APPROVED,
              WithdrawalStatus.PROCESSED,
            ],
          })
          .andWhere(
            `DATE_TRUNC('week', withdrawal.createdAt) = DATE_TRUNC('week', ${VN_NOW_SQL})`,
          )
          .getCount();

        const limits = await this.getWithdrawalLimits(manager);

        if (weeklyCount >= limits.maxPerWeek) {
          throw new BadRequestException(
            `Bạn chỉ được gửi tối đa ${limits.maxPerWeek} yêu cầu rút tiền mỗi tuần`,
          );
        }

        const pendingResult = await withdrawalRepository
          .createQueryBuilder('withdrawal')
          .select('COALESCE(SUM(withdrawal.amount), 0)', 'total')
          .where('withdrawal.walletId = :walletId', {
            walletId: lockedWallet.id,
          })
          .andWhere('withdrawal.status = :status', {
            status: WithdrawalStatus.PENDING,
          })
          .getRawOne<{ total: string }>();

        const amount = this.normalizeAmount(dto.amount);
        this.assertWithdrawalAmount(amount, limits);

        const pendingAmount = toNumber(pendingResult?.total ?? 0);

        // Tasker đang làm phải giữ lại sàn số dư để còn nhận được đơn; nghỉ việc
        // (TERMINATED) thì được rút sạch ví.
        const reserve =
          tasker.status === TaskerStatus.TERMINATED
            ? 0
            : await this.systemConfig.getRegisteredNumber(
                manager,
                SYSTEM_CONFIG_KEYS.TASKER_MIN_ACCEPT_BALANCE_VND,
              );

        const availableBalance = Math.max(
          0,
          toNumber(lockedWallet.balance) - pendingAmount - reserve,
        );

        if (amount > availableBalance) {
          const reserveNote =
            reserve > 0
              ? ` (phải giữ tối thiểu ${reserve.toLocaleString('vi-VN')}đ trong ví để tiếp tục nhận đơn)`
              : '';
          throw new BadRequestException(
            `Số dư khả dụng không đủ. Số tiền có thể rút: ${availableBalance.toLocaleString('vi-VN')}đ${reserveNote}`,
          );
        }

        const bankName = tasker.bankName?.trim();
        const bankAccount = tasker.bankAccountNumber?.trim();
        const bankBin = tasker.bankBin?.trim();

        if (!bankName || !bankAccount || !bankBin) {
          throw new BadRequestException(
            'Vui lòng cập nhật đầy đủ ngân hàng, số tài khoản và mã BIN trước khi rút tiền',
          );
        }

        const request = withdrawalRepository.create({
          taskerId: tasker.id,
          walletId: lockedWallet.id,
          wallet: lockedWallet,
          amount,
          status: WithdrawalStatus.PENDING,
          bankName,
          bankAccount,
          bankBin,
          note: dto.note?.trim() || null,
          reviewedAt: null,
          processedAt: null,
        });

        return withdrawalRepository.save(request);
      });
    }, 'Không thể tạo yêu cầu rút tiền');
  }

  async getSystemWallet(): Promise<WalletResponse> {
    return asyncHandleOperation(async () => {
      const wallet = await this.getOrCreateSystemWallet(
        this.dataSource.manager,
      );

      return this.mapWallet(wallet);
    }, 'Không thể lấy ví hệ thống');
  }

  async getMyTaskerTransactions(
    userId: string,
    opts: WalletTransactionQueryOpts = {},
  ): Promise<WalletTransactionListResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateTaskerWallet(
        this.dataSource.manager,
        tasker,
      );

      return this.getTransactionsByWalletId(wallet.id, opts);
    }, 'Không thể lấy lịch sử ví tasker');
  }

  async getMyCustomerTransactions(
    userId: string,
    opts: WalletTransactionQueryOpts = {},
  ): Promise<WalletTransactionListResponse> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomerByUserId(
        this.dataSource.manager,
        userId,
      );
      const wallet = await this.getOrCreateCustomerWallet(
        this.dataSource.manager,
        customer,
      );

      return this.getTransactionsByWalletId(wallet.id, opts);
    }, 'Không thể lấy lịch sử ví customer');
  }

  async getSystemTransactions(
    opts: WalletTransactionQueryOpts = {},
  ): Promise<WalletTransactionListResponse> {
    return asyncHandleOperation(async () => {
      const wallet = await this.getOrCreateSystemWallet(
        this.dataSource.manager,
      );

      return this.getTransactionsByWalletId(wallet.id, opts);
    }, 'Không thể lấy lịch sử ví hệ thống');
  }

  async getOrCreateTaskerWallet(
    manager: EntityManager,
    tasker: TaskerEntity,
  ): Promise<WalletEntity> {
    const walletRepository = manager.getRepository(WalletEntity);
    const existingWallet = await walletRepository.findOne({
      where: { tasker: { id: tasker.id }, ownerType: WalletOwnerType.TASKER },
      relations: ['tasker'],
    });

    if (existingWallet) {
      return existingWallet;
    }

    const wallet = await walletRepository.save(
      walletRepository.create({
        ownerType: WalletOwnerType.TASKER,
        tasker,
        balance: 0,
        holdBalance: 0,
      }),
    );

    return wallet;
  }

  async getOrCreateCustomerWallet(
    manager: EntityManager,
    customer: CustomerEntity,
  ): Promise<WalletEntity> {
    const walletRepository = manager.getRepository(WalletEntity);
    const existingWallet = await walletRepository.findOne({
      where: {
        customer: { id: customer.id },
        ownerType: WalletOwnerType.CUSTOMER,
      },
      relations: ['customer'],
    });

    if (existingWallet) {
      return existingWallet;
    }

    return walletRepository.save(
      walletRepository.create({
        ownerType: WalletOwnerType.CUSTOMER,
        customer,
        balance: 0,
        holdBalance: 0,
      }),
    );
  }

  async getOrCreateSystemWallet(manager: EntityManager): Promise<WalletEntity> {
    const walletRepository = manager.getRepository(WalletEntity);
    const existingWallet = await walletRepository.findOne({
      where: { ownerType: WalletOwnerType.SYSTEM },
    });

    if (existingWallet) {
      return existingWallet;
    }

    return walletRepository.save(
      walletRepository.create({
        ownerType: WalletOwnerType.SYSTEM,
        balance: 0,
        holdBalance: 0,
      }),
    );
  }

  async creditWallet(
    manager: EntityManager,
    input: WalletMutationInput,
  ): Promise<WalletEntity> {
    return this.applyBalanceChange(manager, input, input.amount);
  }

  async debitWallet(
    manager: EntityManager,
    input: WalletMutationInput,
  ): Promise<WalletEntity> {
    return this.applyBalanceChange(manager, input, -input.amount);
  }

  async transfer(
    manager: EntityManager,
    input: WalletTransferInput,
  ): Promise<void> {
    await this.debitWallet(manager, {
      wallet: input.fromWallet,
      amount: input.amount,
      type: input.debitType,
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });
    await this.creditWallet(manager, {
      wallet: input.toWallet,
      amount: input.amount,
      type: input.creditType,
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });
  }

  async recordPlatformIncome(
    manager: EntityManager,
    amount: number,
    booking?: BookingEntity | null,
    description?: string | null,
  ): Promise<WalletEntity> {
    const systemWallet = await this.getOrCreateSystemWallet(manager);
    return this.creditWallet(manager, {
      wallet: systemWallet,
      amount,
      type: WalletTransactionType.PLATFORM_FEE,
      booking,
      description,
    });
  }

  async recordPlatformExpense(
    manager: EntityManager,
    amount: number,
    booking?: BookingEntity | null,
    description?: string | null,
  ): Promise<WalletEntity> {
    const systemWallet = await this.getOrCreateSystemWallet(manager);
    return this.debitWallet(manager, {
      wallet: systemWallet,
      amount,
      type: WalletTransactionType.ADJUSTMENT,
      booking,
      description,
    });
  }

  /**
   * Tạm giữ tiền: chuyển `amount` từ `balance` → `hold_balance` (ghi DEPOSIT_HOLD).
   * Dùng để giữ nghĩa vụ tiềm năng (vd: bồi thường sự cố khi đang điều tra).
   */
  async holdFunds(
    manager: EntityManager,
    input: WalletMutationInput,
  ): Promise<WalletEntity> {
    const amount = this.normalizeAmount(input.amount);
    const wallet = await this.lockWallet(manager, input.wallet.id);
    const balanceBefore = toNumber(wallet.balance);
    if (balanceBefore < amount) {
      throw new BadRequestException('Số dư ví không đủ để tạm giữ');
    }
    wallet.balance = balanceBefore - amount;
    wallet.holdBalance = toNumber(wallet.holdBalance) + amount;
    const saved = await manager.getRepository(WalletEntity).save(wallet);
    await this.createTransaction(manager, {
      wallet: saved,
      type: WalletTransactionType.DEPOSIT_HOLD,
      amount,
      balanceBefore,
      balanceAfter: toNumber(saved.balance),
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });
    return saved;
  }

  /**
   * Giải phóng tiền tạm giữ: chuyển `amount` từ `hold_balance` → `balance` (ghi DEPOSIT_RELEASE).
   */
  async releaseFunds(
    manager: EntityManager,
    input: WalletMutationInput,
  ): Promise<WalletEntity> {
    const amount = this.normalizeAmount(input.amount);
    const wallet = await this.lockWallet(manager, input.wallet.id);
    const holdBefore = toNumber(wallet.holdBalance);
    if (holdBefore < amount) {
      throw new BadRequestException('Số tiền tạm giữ không đủ để giải phóng');
    }
    const balanceBefore = toNumber(wallet.balance);
    wallet.holdBalance = holdBefore - amount;
    wallet.balance = balanceBefore + amount;
    const saved = await manager.getRepository(WalletEntity).save(wallet);
    await this.createTransaction(manager, {
      wallet: saved,
      type: WalletTransactionType.DEPOSIT_RELEASE,
      amount,
      balanceBefore,
      balanceAfter: toNumber(saved.balance),
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });
    return saved;
  }

  /**
   * Thu tiền đang tạm giữ (hold → ra khỏi ví, KHÔNG trả lại balance): giảm `hold_balance`
   * và ghi bút toán `type` (thường DEPOSIT_DEDUCT). Dùng khi chuyển HOLD → trừ thật lúc chốt.
   */
  async captureHeldFunds(
    manager: EntityManager,
    input: WalletMutationInput,
  ): Promise<WalletEntity> {
    const amount = this.normalizeAmount(input.amount);
    const wallet = await this.lockWallet(manager, input.wallet.id);
    const holdBefore = toNumber(wallet.holdBalance);
    if (holdBefore < amount) {
      throw new BadRequestException('Số tiền tạm giữ không đủ để thu');
    }
    const balanceUnchanged = toNumber(wallet.balance);
    wallet.holdBalance = holdBefore - amount;
    const saved = await manager.getRepository(WalletEntity).save(wallet);
    await this.createTransaction(manager, {
      wallet: saved,
      type: input.type,
      amount,
      balanceBefore: balanceUnchanged,
      balanceAfter: balanceUnchanged,
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });
    return saved;
  }

  private async applyBalanceChange(
    manager: EntityManager,
    input: WalletMutationInput,
    signedAmount: number,
  ): Promise<WalletEntity> {
    const amount = this.normalizeAmount(input.amount);
    const balanceChange = signedAmount < 0 ? -amount : amount;
    const wallet = await this.lockWallet(manager, input.wallet.id);
    const balanceBefore = toNumber(wallet.balance);
    const balanceAfter = balanceBefore + balanceChange;

    if (balanceAfter < 0) {
      throw new BadRequestException('Số dư ví không đủ');
    }

    wallet.balance = balanceAfter;
    const savedWallet = await manager.getRepository(WalletEntity).save(wallet);
    await this.createTransaction(manager, {
      wallet: savedWallet,
      type: input.type,
      amount,
      balanceBefore,
      balanceAfter,
      booking: input.booking,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      description: input.description,
    });

    return savedWallet;
  }

  private async lockWallet(
    manager: EntityManager,
    walletId: string,
  ): Promise<WalletEntity> {
    const wallet = await manager.getRepository(WalletEntity).findOne({
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví');
    }

    return wallet;
  }

  private createTransaction(
    manager: EntityManager,
    input: {
      wallet: WalletEntity;
      type: WalletTransactionType;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      booking?: BookingEntity | null;
      referenceId?: string | null;
      referenceType?: string | null;
      description?: string | null;
    },
  ): Promise<WalletTransactionEntity> {
    const transactionRepository = manager.getRepository(
      WalletTransactionEntity,
    );
    const transaction = transactionRepository.create({
      wallet: input.wallet,
      type: input.type,
      amount: input.amount,
      balanceBefore: input.balanceBefore,
      balanceAfter: input.balanceAfter,
      booking: input.booking,
      referenceId: input.referenceId ?? input.booking?.id ?? null,
      referenceType: input.referenceType ?? (input.booking ? 'BOOKING' : null),
      description: input.description,
    });

    return transactionRepository.save(transaction);
  }

  private async getTransactionsByWalletId(
    walletId: string,
    opts: WalletTransactionQueryOpts = {},
  ): Promise<WalletTransactionListResponse> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 10));
    const skip = (page - 1) * limit;

    const qb = this.dataSource
      .getRepository(WalletTransactionEntity)
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.wallet', 'wallet')
      .leftJoinAndSelect('tx.booking', 'booking')
      .where('tx.wallet = :walletId', { walletId })
      .orderBy('tx.createdAt', 'DESC');

    if (opts.fromDate) {
      qb.andWhere('tx.createdAt >= :fromDate', {
        fromDate: new Date(opts.fromDate),
      });
    }
    if (opts.toDate) {
      // toDate bao gồm cả ngày đó (lấy đến cuối ngày)
      const to = new Date(opts.toDate);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('tx.createdAt <= :toDate', { toDate: to });
    }
    if (opts.type) {
      qb.andWhere('tx.type = :type', { type: opts.type });
    }

    const total = await qb.getCount();
    const transactions = await qb.clone().skip(skip).take(limit).getMany();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: transactions.map((tx) => this.mapTransaction(tx)),
    };
  }

  private async findTaskerByUserId(
    manager: EntityManager,
    userId: string,
  ): Promise<TaskerEntity> {
    const tasker = await manager.getRepository(TaskerEntity).findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!tasker) {
      throw new NotFoundException('Không tìm thấy hồ sơ tasker');
    }

    return tasker;
  }

  private async findCustomerByUserId(
    manager: EntityManager,
    userId: string,
  ): Promise<CustomerEntity> {
    const customer = await manager.getRepository(CustomerEntity).findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy hồ sơ customer');
    }

    return customer;
  }

  /**
   * Chuẩn hoá số tiền cho MỌI bút toán ví: VND không có đơn vị nhỏ hơn đồng, nên làm tròn
   * về số nguyên ngay tại tầng ví thay vì để từng module tự lo (trước đây chỉ module sự cố
   * `Math.floor`, các module khác có thể ghi số lẻ xu vào sổ và gây lệch khi đối soát).
   *
   * Làm tròn TRƯỚC rồi mới kiểm > 0, để một khoản < 0.5đ bị chặn thay vì lặng lẽ thành 0.
   */
  private normalizeAmount(amount: number): number {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Số tiền giao dịch không hợp lệ');
    }

    const normalizedAmount = Math.round(parsed);
    if (normalizedAmount <= 0) {
      throw new BadRequestException('Số tiền giao dịch không hợp lệ');
    }

    return normalizedAmount;
  }

  private mapWallet(wallet: WalletEntity): WalletResponse {
    return {
      id: wallet.id,
      ownerType: wallet.ownerType,
      balance: toNumber(wallet.balance),
      holdBalance: toNumber(wallet.holdBalance),
      taskerId: wallet.tasker?.id ?? null,
      customerId: wallet.customer?.id ?? null,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  private mapTransaction(
    transaction: WalletTransactionEntity,
  ): WalletTransactionResponse {
    return {
      id: transaction.id,
      walletId: transaction.wallet.id,
      bookingId: transaction.booking?.id ?? null,
      referenceId: transaction.referenceId,
      referenceType: transaction.referenceType,
      type: transaction.type,
      amount: toNumber(transaction.amount),
      balanceBefore: toNumber(transaction.balanceBefore),
      balanceAfter: toNumber(transaction.balanceAfter),
      description: transaction.description,
      createdAt: transaction.createdAt,
      booking: transaction.booking
        ? {
            id: transaction.booking.id,
            bookingCode: transaction.booking.bookingCode,
            totalPrice: toNumber(transaction.booking.totalPrice),
            discountAmount: toNumber(transaction.booking.discountAmount),
          }
        : null,
    };
  }
}
