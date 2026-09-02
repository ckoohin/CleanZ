import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toNumber } from 'src/common/helpers/number.helper';
import {
  BankStatementDirection,
  BankStatementEntryStatus,
} from 'src/common/enums/bank-statement-entry.enum';
import { BankStatementEntryEntity } from '../entity/bank-statement-entry.entity';
import { IncidentEntity } from '../entity/incident.entity';
import {
  BankStatementParseError,
  parseBankStatementCsv,
} from '../domain/bank-statement-csv';
import { vietnamNow } from 'src/common/helpers/vietnam-time.helper';

export interface BankStatementImportResult {
  /** Số dòng đọc được từ file. */
  parsed: number;
  /** Số dòng thực sự thêm mới. */
  inserted: number;
  /** Dòng đã có sẵn trong hệ thống (trùng mã giao dịch) — bỏ qua, KHÔNG ghi đè. */
  duplicated: number;
  errors: BankStatementParseError[];
}

export interface BankStatementEntryView {
  id: string;
  bankRef: string;
  txnAt: Date;
  direction: BankStatementDirection;
  amount: number;
  counterpartyAccount: string | null;
  counterpartyName: string | null;
  description: string | null;
  status: BankStatementEntryStatus;
  note: string | null;
  matchedIncident: { id: string; incidentCode: string | null } | null;
  matchedAt: Date | null;
}

/** Gợi ý khớp, kèm LÝ DO để admin không phải tin một con số xếp hạng vô danh. */
export interface BankStatementSuggestion extends BankStatementEntryView {
  reasons: string[];
  score: number;
}

/** Trần kích thước file sao kê nhận trong một lần import (ký tự). */
const MAX_CSV_CHARS = 2_000_000;

@Injectable()
export class BankStatementService {
  constructor(
    @InjectRepository(BankStatementEntryEntity)
    private readonly repo: Repository<BankStatementEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private static toView(e: BankStatementEntryEntity): BankStatementEntryView {
    return {
      id: e.id,
      bankRef: e.bankRef,
      txnAt: e.txnAt,
      direction: e.direction,
      amount: toNumber(e.amount),
      counterpartyAccount: e.counterpartyAccount ?? null,
      counterpartyName: e.counterpartyName ?? null,
      description: e.description ?? null,
      status: e.status,
      note: e.note ?? null,
      matchedIncident: e.matchedIncident
        ? {
            id: e.matchedIncident.id,
            incidentCode: e.matchedIncident.incidentCode ?? null,
          }
        : null,
      matchedAt: e.matchedAt ?? null,
    };
  }

  /**
   * Nhập một file sao kê.
   *
   * Dòng trùng mã giao dịch bị BỎ QUA chứ không ghi đè: sao kê là bản ghi của ngân hàng,
   * đã vào hệ thống thì không có lý do gì để một lần import sau sửa nó — mà nếu ghi đè thì
   * một dòng đã khớp với sự cố sẽ âm thầm mất liên kết.
   */
  async import(
    adminUserId: string,
    csv: string,
  ): Promise<BankStatementImportResult> {
    return asyncHandleOperation(async () => {
      if (!csv || !csv.trim()) {
        throw new UnprocessableEntityException({
          code: 'EMPTY_STATEMENT_FILE',
          message: 'File sao kê rỗng',
        });
      }
      if (csv.length > MAX_CSV_CHARS) {
        throw new UnprocessableEntityException({
          code: 'STATEMENT_FILE_TOO_LARGE',
          message: 'File sao kê quá lớn — hãy tách theo từng kỳ nhỏ hơn',
        });
      }

      const { rows, errors } = parseBankStatementCsv(csv);
      if (rows.length === 0) {
        return { parsed: 0, inserted: 0, duplicated: 0, errors };
      }

      const result = await this.repo
        .createQueryBuilder()
        .insert()
        .values(
          rows.map((r) => ({
            bankRef: r.bankRef,
            txnAt: r.txnAt,
            direction: r.direction,
            amount: r.amount,
            counterpartyAccount: r.counterpartyAccount,
            counterpartyName: r.counterpartyName,
            description: r.description,
            rawLine: r.rawLine,
            status: BankStatementEntryStatus.UNMATCHED,
            importedByAdmin: { id: adminUserId },
          })),
        )
        // Trùng `bank_ref` thì bỏ qua — nhờ vậy import lại đúng file cũ là thao tác an toàn.
        .orIgnore()
        .execute();

      const inserted = result.identifiers.filter(Boolean).length;
      return {
        parsed: rows.length,
        inserted,
        duplicated: rows.length - inserted,
        errors,
      };
    }, 'Lỗi khi nhập sao kê ngân hàng');
  }

  async list(query: {
    status?: BankStatementEntryStatus;
    keyword?: string;
    limit?: number;
  }): Promise<BankStatementEntryView[]> {
    return asyncHandleOperation(async () => {
      const qb = this.repo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.matchedIncident', 'inc')
        .orderBy('e.txn_at', 'DESC')
        .limit(Math.min(query.limit ?? 100, 500));

      if (query.status) {
        qb.andWhere('e.status = :status', { status: query.status });
      }
      const kw = query.keyword?.trim();
      if (kw) {
        qb.andWhere(
          '(e.bank_ref ILIKE :kw OR e.description ILIKE :kw OR e.counterparty_name ILIKE :kw OR e.counterparty_account ILIKE :kw)',
          { kw: `%${kw}%` },
        );
      }
      const entries = await qb.getMany();
      return entries.map((e) => BankStatementService.toView(e));
    }, 'Lỗi khi lấy danh sách dòng sao kê');
  }

  /**
   * Gợi ý dòng sao kê cho một sự cố đã chi thủ công.
   *
   * Chỉ GỢI Ý, không tự khớp: khớp sai là gán bằng chứng ngân hàng của khoản này cho khoản
   * khác, và cả hai cùng sai mà đối soát vẫn xanh. Việc xác nhận phải do người làm, có vết.
   */
  async suggestForIncident(
    incidentId: string,
  ): Promise<BankStatementSuggestion[]> {
    return asyncHandleOperation(async () => {
      const incident = await this.dataSource
        .getRepository(IncidentEntity)
        .findOne({ where: { id: incidentId } });
      if (!incident) {
        throw new NotFoundException({
          code: 'INCIDENT_NOT_FOUND',
          message: 'Không tìm thấy sự cố',
        });
      }
      if (incident.externalPayoutAt == null) {
        throw new ConflictException({
          code: 'NOT_MANUAL_PAYOUT',
          message: 'Sự cố này không có khoản chi ngoài để đối chiếu sao kê',
        });
      }

      const code = incident.incidentCode?.toUpperCase() ?? null;
      const expected =
        toNumber(incident.externalPayoutAmount) +
        toNumber(incident.externalPayoutLossAmount);
      const payoutAt = incident.externalPayoutAt.getTime();

      // Chỉ tiền RA, chưa gắn ở đâu. Khoanh vùng ±30 ngày quanh mốc chi để danh sách gợi ý
      // không phình theo toàn bộ lịch sử sao kê.
      const entries = await this.repo
        .createQueryBuilder('e')
        .where('e.status = :status', {
          status: BankStatementEntryStatus.UNMATCHED,
        })
        .andWhere('e.direction = :dir', {
          dir: BankStatementDirection.DEBIT,
        })
        .andWhere('e.txn_at BETWEEN :from AND :to')
        .setParameters({
          from: new Date(payoutAt - 30 * 86_400_000),
          to: new Date(payoutAt + 30 * 86_400_000),
        })
        .orderBy('e.txn_at', 'DESC')
        .limit(200)
        .getMany();

      const suggestions = entries
        .map((e) => {
          const reasons: string[] = [];
          let score = 0;
          // Ngày tháng MỘT MÌNH không đủ để gợi ý: trong vài ngày quanh mốc chi, tài khoản
          // công ty có đủ thứ chi khác. Danh sách gợi ý mà cái gì cũng có thì người ta bấm
          // bừa, và khớp bừa chính là thứ cơ chế đối chiếu này sinh ra để chặn.
          let strongSignal = false;

          const desc = (e.description ?? '').toUpperCase();
          if (code && desc.includes(code)) {
            reasons.push(`Nội dung có mã sự cố ${code}`);
            score += 100;
            strongSignal = true;
          }
          const amount = toNumber(e.amount);
          if (expected > 0 && amount === expected) {
            reasons.push('Số tiền khớp đúng khoản đã chi');
            score += 50;
            strongSignal = true;
          } else if (expected > 0 && Math.abs(amount - expected) <= 1000) {
            reasons.push('Số tiền lệch không quá 1.000đ (phí chuyển khoản)');
            score += 20;
            strongSignal = true;
          }
          const days = Math.abs(e.txnAt.getTime() - payoutAt) / 86_400_000;
          if (days <= 1) {
            reasons.push('Cùng ngày với thao tác chi trả');
            score += 15;
          } else if (days <= 3) {
            reasons.push('Trong vòng 3 ngày quanh thao tác chi trả');
            score += 5;
          }

          return {
            ...BankStatementService.toView(e),
            reasons,
            score,
            strongSignal,
          };
        })
        .filter((s) => s.strongSignal)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ strongSignal: _strongSignal, ...s }) => s);

      return suggestions;
    }, 'Lỗi khi gợi ý dòng sao kê');
  }

  /**
   * Gắn một dòng sao kê vào sự cố — đây là hành động biến "admin nói đã chuyển" thành
   * "ngân hàng xác nhận đã chuyển".
   */
  async match(
    adminUserId: string,
    entryId: string,
    incidentId: string,
  ): Promise<BankStatementEntryView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const entry = await manager
          .getRepository(BankStatementEntryEntity)
          .createQueryBuilder('e')
          .leftJoinAndSelect('e.matchedIncident', 'inc')
          .setLock('pessimistic_write', undefined, ['e'])
          .where('e.id = :id', { id: entryId })
          .getOne();
        if (!entry) {
          throw new NotFoundException({
            code: 'BANK_ENTRY_NOT_FOUND',
            message: 'Không tìm thấy dòng sao kê',
          });
        }

        // Bấm lại đúng liên kết cũ là idempotent; gắn sang sự cố khác thì phải gỡ trước,
        // để không có dòng tiền nào lặng lẽ đổi chủ.
        if (entry.status === BankStatementEntryStatus.MATCHED) {
          if (entry.matchedIncident?.id === incidentId) return;
          throw new ConflictException({
            code: 'BANK_ENTRY_ALREADY_MATCHED',
            message: `Dòng sao kê này đã gắn với sự cố ${
              entry.matchedIncident?.incidentCode ?? entry.matchedIncident?.id
            } — gỡ khớp trước nếu gắn nhầm`,
          });
        }
        if (entry.status === BankStatementEntryStatus.IGNORED) {
          throw new ConflictException({
            code: 'BANK_ENTRY_IGNORED',
            message: 'Dòng sao kê đã được đánh dấu bỏ qua',
          });
        }
        if (entry.direction !== BankStatementDirection.DEBIT) {
          throw new UnprocessableEntityException({
            code: 'BANK_ENTRY_NOT_DEBIT',
            message:
              'Chỉ dòng tiền RA khỏi tài khoản công ty mới là bằng chứng cho khoản chi bồi thường',
          });
        }

        const incident = await manager
          .getRepository(IncidentEntity)
          .findOne({ where: { id: incidentId } });
        if (!incident) {
          throw new NotFoundException({
            code: 'INCIDENT_NOT_FOUND',
            message: 'Không tìm thấy sự cố',
          });
        }
        if (incident.externalPayoutAt == null) {
          throw new ConflictException({
            code: 'NOT_MANUAL_PAYOUT',
            message:
              'Sự cố này được chi qua ví — không có khoản chi ngoài nào để đối chiếu',
          });
        }

        entry.status = BankStatementEntryStatus.MATCHED;
        entry.matchedIncident = { id: incidentId } as IncidentEntity;
        entry.matchedAt = vietnamNow();
        entry.matchedByAdmin = { id: adminUserId } as never;
        await manager.getRepository(BankStatementEntryEntity).save(entry);
      });

      return this.findOne(entryId);
    }, 'Lỗi khi khớp dòng sao kê');
  }

  /** Gỡ khớp khi phát hiện gắn nhầm. Bắt buộc lý do — đây là sửa một bằng chứng tài chính. */
  async unmatch(
    adminUserId: string,
    entryId: string,
    reason: string,
  ): Promise<BankStatementEntryView> {
    return asyncHandleOperation(async () => {
      const trimmed = reason?.trim() ?? '';
      if (trimmed.length < 10) {
        throw new UnprocessableEntityException({
          code: 'UNMATCH_REASON_REQUIRED',
          message: 'Lý do gỡ khớp phải có ít nhất 10 ký tự',
        });
      }
      const entry = await this.repo.findOne({ where: { id: entryId } });
      if (!entry) {
        throw new NotFoundException({
          code: 'BANK_ENTRY_NOT_FOUND',
          message: 'Không tìm thấy dòng sao kê',
        });
      }
      if (entry.status !== BankStatementEntryStatus.MATCHED) {
        throw new ConflictException({
          code: 'BANK_ENTRY_NOT_MATCHED',
          message: 'Dòng sao kê này chưa được khớp với sự cố nào',
        });
      }

      entry.status = BankStatementEntryStatus.UNMATCHED;
      entry.matchedIncident = null;
      entry.matchedAt = null;
      entry.matchedByAdmin = { id: adminUserId } as never;
      entry.note = trimmed;
      await this.repo.save(entry);
      return this.findOne(entryId);
    }, 'Lỗi khi gỡ khớp dòng sao kê');
  }

  /** Đánh dấu dòng không liên quan bồi thường, để hàng đợi chưa khớp không phình mãi. */
  async ignore(
    adminUserId: string,
    entryId: string,
    reason: string,
  ): Promise<BankStatementEntryView> {
    return asyncHandleOperation(async () => {
      const trimmed = reason?.trim() ?? '';
      if (trimmed.length < 10) {
        throw new UnprocessableEntityException({
          code: 'IGNORE_REASON_REQUIRED',
          message: 'Lý do bỏ qua phải có ít nhất 10 ký tự',
        });
      }
      const entry = await this.repo.findOne({ where: { id: entryId } });
      if (!entry) {
        throw new NotFoundException({
          code: 'BANK_ENTRY_NOT_FOUND',
          message: 'Không tìm thấy dòng sao kê',
        });
      }
      if (entry.status === BankStatementEntryStatus.MATCHED) {
        throw new ConflictException({
          code: 'BANK_ENTRY_ALREADY_MATCHED',
          message:
            'Dòng đang là bằng chứng cho một sự cố — gỡ khớp trước khi bỏ qua',
        });
      }

      entry.status = BankStatementEntryStatus.IGNORED;
      entry.note = trimmed;
      entry.matchedByAdmin = { id: adminUserId } as never;
      await this.repo.save(entry);
      return this.findOne(entryId);
    }, 'Lỗi khi bỏ qua dòng sao kê');
  }

  /** Các dòng sao kê đang là bằng chứng cho một sự cố. */
  async listForIncident(incidentId: string): Promise<BankStatementEntryView[]> {
    return asyncHandleOperation(async () => {
      const entries = await this.repo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.matchedIncident', 'inc')
        .where('inc.id = :id', { id: incidentId })
        .andWhere('e.status = :status', {
          status: BankStatementEntryStatus.MATCHED,
        })
        .orderBy('e.txn_at', 'ASC')
        .getMany();
      return entries.map((e) => BankStatementService.toView(e));
    }, 'Lỗi khi lấy dòng sao kê của sự cố');
  }

  private async findOne(entryId: string): Promise<BankStatementEntryView> {
    const entry = await this.repo.findOne({
      where: { id: entryId },
      relations: ['matchedIncident'],
    });
    if (!entry) {
      throw new NotFoundException({
        code: 'BANK_ENTRY_NOT_FOUND',
        message: 'Không tìm thấy dòng sao kê',
      });
    }
    return BankStatementService.toView(entry);
  }
}
