import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toNumber } from 'src/common/helpers/number.helper';
import { TASKER_PRESENCE_STATUS } from 'src/common/enums/tasker-presence-status.enum';
import { TaskerEquipmentStatus } from 'src/common/enums/tasker-equipment-status.enum';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import {
  buildTaskerScheduleWindow,
  formatTaskerScheduleTime,
  NearbyTaskerScheduleWindow,
  TaskerScheduleAvailability,
  TaskerScheduleWindow,
} from 'src/modules/booking/helpers/tasker-schedule-availability.helper';
import { TaskerScheduleAvailabilityService } from 'src/modules/booking/services/tasker-schedule-availability.service';
import { isTaskerPremiumEligible } from 'src/modules/booking/helpers/premium-eligibility.helper';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { CustomerEntity } from '../entity/customer.entity';
import { CustomerFavoriteTaskerEntity } from '../entity/customer-favorite-tasker.entity';
import { FavoriteTaskerAvailabilityQueryDto } from '../dto/favorite-tasker-availability-query.dto';

export interface FavoriteTaskerItem {
  taskerId: string;
  fullName: string | null;
  avatarUrl: string | null;
  ratingAvg: number;
  totalCompletedJobs: number;
  equipmentStatus: TaskerEquipmentStatus;
  /** Đủ tư cách nhận đơn Cao cấp tại thời điểm hỏi. */
  isPremiumEligible: boolean;
  presenceStatus: TASKER_PRESENCE_STATUS;
  /** Số đơn tasker này đã hoàn thành cho chính khách. */
  completedJobsForCustomer: number;
  note: string | null;
  createdAt: string;
}

export interface FavoriteTaskerAvailabilityItem extends FavoriteTaskerItem {
  availability: {
    status: TaskerScheduleAvailability['status'];
    isAvailable: boolean;
    reason: TaskerScheduleAvailability['reason'];
    message: string | null;
    conflict: TaskerScheduleWindow | null;
    nearby: NearbyTaskerScheduleWindow | null;
  };
}

export interface FavoriteTaskerContact {
  taskerId: string;
  fullName: string | null;
  phone: string | null;
}

@Injectable()
export class FavoriteTaskerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly taskerScheduleAvailabilityService: TaskerScheduleAvailabilityService,
  ) {}

  async list(userId: string): Promise<FavoriteTaskerItem[]> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomer(userId);
      const favorites = await this.findFavorites(customer.id);
      return this.mapFavoriteItems(customer.id, favorites);
    }, 'Không thể lấy danh sách thợ yêu thích');
  }

  async listAvailability(
    userId: string,
    query: FavoriteTaskerAvailabilityQueryDto,
  ): Promise<FavoriteTaskerAvailabilityItem[]> {
    return asyncHandleOperation(async () => {
      const manager = this.dataSource.manager;
      const customer = await this.findCustomer(userId);
      const favorites = await this.findFavorites(customer.id);
      if (favorites.length === 0) return [];

      const requested = buildTaskerScheduleWindow(
        query.scheduledDate,
        query.scheduledTime,
        query.durationHours,
      );
      if (!requested) {
        throw new BadRequestException(
          'Ngày, giờ hoặc thời lượng đặt lịch không hợp lệ',
        );
      }

      const [items, availabilityByTasker] = await Promise.all([
        this.mapFavoriteItems(customer.id, favorites),
        this.taskerScheduleAvailabilityService.getForTaskers(
          manager,
          favorites.map((favorite) => favorite.taskerId),
          requested,
        ),
      ]);

      return items.map((item) => ({
        ...item,
        availability: this.toPublicAvailability(
          availabilityByTasker.get(item.taskerId),
        ),
      }));
    }, 'Không thể kiểm tra lịch của thợ yêu thích');
  }

  async getContact(
    userId: string,
    taskerId: string,
  ): Promise<FavoriteTaskerContact> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomer(userId);
      const favorite = await this.dataSource
        .getRepository(CustomerFavoriteTaskerEntity)
        .findOne({
          where: { customerId: customer.id, taskerId },
          relations: ['tasker', 'tasker.user'],
        });

      if (!favorite?.tasker?.user) {
        throw new NotFoundException(
          'Không tìm thấy Tasker trong danh sách yêu thích của bạn',
        );
      }

      return {
        taskerId,
        fullName: favorite.tasker.user.fullName ?? null,
        phone: favorite.tasker.user.phone ?? null,
      };
    }, 'Không thể lấy thông tin liên hệ của Tasker');
  }

  async add(
    userId: string,
    taskerId: string,
    note?: string,
  ): Promise<{ taskerId: string }> {
    return asyncHandleOperation(async () => {
      const manager = this.dataSource.manager;
      const customer = await this.findCustomer(userId);

      const tasker = await manager
        .getRepository(TaskerEntity)
        .findOne({ where: { id: taskerId } });
      if (!tasker) {
        throw new NotFoundException('Không tìm thấy tasker');
      }

      // Chỉ được lưu thợ đã từng làm cho mình — vừa chống spam danh sách, vừa
      // đảm bảo lựa chọn "yêu thích" có cơ sở thực tế chứ không phải chỉ định khống.
      const completedCount = await manager.getRepository(BookingEntity).count({
        where: {
          customer: { id: customer.id },
          tasker: { id: taskerId },
          status: BookingStatus.COMPLETED,
        },
      });
      if (completedCount === 0) {
        throw new BadRequestException(
          'Chỉ có thể thêm thợ đã từng hoàn thành đơn cho bạn',
        );
      }

      const repository = manager.getRepository(CustomerFavoriteTaskerEntity);
      const existing = await repository.findOne({
        where: { customerId: customer.id, taskerId },
      });
      if (existing) {
        throw new ConflictException('Thợ này đã có trong danh sách yêu thích');
      }

      await repository.save(
        repository.create({
          customerId: customer.id,
          taskerId,
          note: note?.trim() || null,
        }),
      );

      return { taskerId };
    }, 'Không thể thêm thợ yêu thích');
  }

  async remove(
    userId: string,
    taskerId: string,
  ): Promise<{ taskerId: string }> {
    return asyncHandleOperation(async () => {
      const customer = await this.findCustomer(userId);
      const result = await this.dataSource
        .getRepository(CustomerFavoriteTaskerEntity)
        .delete({ customerId: customer.id, taskerId });

      if (!result.affected) {
        throw new NotFoundException(
          'Thợ này không có trong danh sách yêu thích',
        );
      }

      return { taskerId };
    }, 'Không thể xóa thợ yêu thích');
  }

  private async findCustomer(userId: string): Promise<CustomerEntity> {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: userId } } });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy hồ sơ khách hàng');
    }

    return customer;
  }

  private findFavorites(
    customerId: string,
  ): Promise<CustomerFavoriteTaskerEntity[]> {
    return this.dataSource.getRepository(CustomerFavoriteTaskerEntity).find({
      where: { customerId },
      relations: ['tasker', 'tasker.user'],
      order: { createdAt: 'DESC' },
    });
  }

  private async mapFavoriteItems(
    customerId: string,
    favorites: CustomerFavoriteTaskerEntity[],
  ): Promise<FavoriteTaskerItem[]> {
    if (favorites.length === 0) return [];

    const completedCounts = await this.countCompletedJobsForCustomer(
      customerId,
      favorites.map((favorite) => favorite.taskerId),
    );

    return favorites.map((favorite) => {
      const tasker = favorite.tasker;
      return {
        taskerId: favorite.taskerId,
        fullName: tasker?.user?.fullName ?? null,
        avatarUrl: tasker?.user?.avatarUrl ?? null,
        ratingAvg: toNumber(tasker?.ratingAvg ?? 0),
        totalCompletedJobs: tasker?.totalCompletedJobs ?? 0,
        equipmentStatus: tasker?.equipmentStatus ?? TaskerEquipmentStatus.NONE,
        isPremiumEligible: tasker ? isTaskerPremiumEligible(tasker) : false,
        presenceStatus:
          tasker?.presenceStatus ?? TASKER_PRESENCE_STATUS.OFFLINE,
        completedJobsForCustomer: completedCounts.get(favorite.taskerId) ?? 0,
        note: favorite.note ?? null,
        createdAt: favorite.createdAt.toISOString(),
      };
    });
  }

  private toPublicAvailability(
    availability?: TaskerScheduleAvailability,
  ): FavoriteTaskerAvailabilityItem['availability'] {
    if (!availability) {
      return {
        status: 'AVAILABLE',
        isAvailable: true,
        reason: null,
        message: null,
        conflict: null,
        nearby: null,
      };
    }

    const conflict = availability.conflict
      ? this.withoutBookingCode(availability.conflict)
      : null;
    const nearby = availability.nearby
      ? {
          ...this.withoutBookingCode(availability.nearby),
          relation: availability.nearby.relation,
          gapMinutes: availability.nearby.gapMinutes,
        }
      : null;

    let message: string | null = null;
    if (availability.reason === 'MAX_CONCURRENT') {
      message =
        'Tasker đang nhận tối đa số đơn chưa hoàn thành và chưa thể nhận thêm.';
    } else if (conflict) {
      message = `Tasker đang bận từ ${formatTaskerScheduleTime(
        conflict.scheduledStartDate,
        conflict.scheduledStartTime,
      )} đến ${formatTaskerScheduleTime(
        conflict.scheduledEndDate,
        conflict.scheduledEndTime,
      )}.`;
    } else if (nearby?.relation === 'BEFORE') {
      message = `Ca gần nhất kết thúc trước lịch của bạn ${nearby.gapMinutes} phút. Tasker có thể đến muộn.`;
    } else if (nearby) {
      message = `Tasker có ca tiếp theo sau lịch của bạn ${nearby.gapMinutes} phút.`;
    }

    return {
      status: availability.status,
      isAvailable: availability.isAvailable,
      reason: availability.reason,
      message,
      conflict,
      nearby,
    };
  }

  private withoutBookingCode(
    window: TaskerScheduleWindow,
  ): TaskerScheduleWindow {
    return {
      scheduledStartDate: window.scheduledStartDate,
      scheduledStartTime: window.scheduledStartTime,
      scheduledEndDate: window.scheduledEndDate,
      scheduledEndTime: window.scheduledEndTime,
    };
  }

  /** Đếm gộp một lần cho cả danh sách, tránh N+1 query. */
  private async countCompletedJobsForCustomer(
    customerId: string,
    taskerIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .select('booking.tasker_id', 'taskerId')
      .addSelect('COUNT(*)', 'total')
      .where('booking.customer_id = :customerId', { customerId })
      .andWhere('booking.tasker_id IN (:...taskerIds)', { taskerIds })
      .andWhere('booking.status = :status', {
        status: BookingStatus.COMPLETED,
      })
      .groupBy('booking.tasker_id')
      .getRawMany<{ taskerId: string; total: string }>();

    return new Map(rows.map((row) => [row.taskerId, Number(row.total)]));
  }
}
