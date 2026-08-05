import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import {
  parseLocalAnchor,
  previousPeriodStart,
  resolveReportWindow,
  vietnamLocalDay,
} from 'src/common/helpers/earnings-period.helper';
import {
  DTO_TO_PERIOD,
  type EarningsReportRunDetailQueryDto,
  type EarningsReportRunQueryDto,
  type SendEarningsReportDto,
} from '../dto/earnings-report.dto';
import { EarningsReportDeliveryEntity } from '../entity/earnings-report-delivery.entity';
import { EarningsReportRunEntity } from '../entity/earnings-report-run.entity';
import { EarningsReportDispatchService } from './earnings-report-dispatch.service';

@Injectable()
export class EarningsReportAdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly dispatchService: EarningsReportDispatchService,
  ) {}

  /**
   * Gửi thủ công. Không truyền `anchor` thì lấy kỳ **vừa kết thúc** — đây là thứ
   * admin muốn trong đa số trường hợp (kỳ hiện tại chưa chạy xong nên số liệu
   * chưa đầy đủ).
   */
  sendManually(adminUserId: string, dto: SendEarningsReportDto) {
    return asyncHandleOperation(async () => {
      const period = DTO_TO_PERIOD[dto.period];
      const anchorLocalMs = dto.anchor
        ? parseLocalAnchor(dto.anchor, vietnamLocalDay())
        : previousPeriodStart(period, vietnamLocalDay());
      const window = resolveReportWindow(period, anchorLocalMs);

      const run = await this.dispatchService.createAdminRun(
        period,
        window,
        adminUserId,
      );
      const queued = await this.dispatchService.enqueueForRun(
        run,
        period,
        window,
        dto.taskerIds,
      );

      return {
        runId: run.id,
        period,
        periodStartKey: window.periodStartKey,
        rangeLabel: window.rangeLabel,
        queuedTaskers: queued,
      };
    }, 'Không thể gửi bảng kê thu nhập');
  }

  listRuns(query: EarningsReportRunQueryDto) {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const qb = this.dataSource
        .getRepository(EarningsReportRunEntity)
        .createQueryBuilder('r')
        .orderBy('r.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (query.periodType) {
        qb.where('r.period_type = :periodType', {
          periodType: query.periodType,
        });
      }

      const [items, total] = await qb.getManyAndCount();
      return { items, total, page, limit };
    }, 'Không thể lấy danh sách lượt gửi bảng kê');
  }

  getRunDetail(runId: string, query: EarningsReportRunDetailQueryDto) {
    return asyncHandleOperation(async () => {
      const run = await this.dataSource
        .getRepository(EarningsReportRunEntity)
        .findOne({ where: { id: runId } });
      if (!run) throw new NotFoundException('Không tìm thấy lượt gửi bảng kê');

      const page = query.page ?? 1;
      const limit = query.limit ?? 50;
      const qb = this.dataSource
        .getRepository(EarningsReportDeliveryEntity)
        .createQueryBuilder('d')
        .where('d.run_id = :runId', { runId })
        .orderBy('d.created_at', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      if (query.status) {
        qb.andWhere('d.status = :status', { status: query.status });
      }

      const [deliveries, total] = await qb.getManyAndCount();

      return {
        run,
        deliveries: {
          items: deliveries,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }, 'Không thể lấy chi tiết lượt gửi bảng kê');
  }
}
