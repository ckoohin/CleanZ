import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  TaskerDebtEntity,
  TaskerDebtSource,
  TaskerDebtStatus,
  debtOutstanding,
} from './entity/tasker-debt.entity';
import { TaskerDebtService } from './tasker-debt.service';

const DAY = 86_400_000;
const SRC = TaskerDebtSource.INCIDENT_COMPENSATION;

const makeDebt = (over: Partial<TaskerDebtEntity> = {}): TaskerDebtEntity =>
  ({
    id: 'debt-1',
    sourceRefId: 'inc-1',
    sourceCode: 'IC-1',
    source: SRC,
    originalAmount: 1_000_000,
    recoveredAmount: 200_000,
    writtenOffAmount: 0,
    status: TaskerDebtStatus.OUTSTANDING,
    createdAt: new Date(Date.now() - 100 * DAY),
    ...over,
  }) as TaskerDebtEntity;

function makeService(debt: TaskerDebtEntity | null) {
  const saved: TaskerDebtEntity[] = [];
  const removed: TaskerDebtEntity[] = [];
  const repo = {
    findOne: () => Promise.resolve(debt),
    save: (e: TaskerDebtEntity) => {
      saved.push(e);
      return Promise.resolve(e);
    },
    remove: (e: TaskerDebtEntity) => {
      removed.push(e);
      return Promise.resolve(e);
    },
    create: (data: Partial<TaskerDebtEntity>) => ({ ...data }),
    createQueryBuilder: () => {
      const qb: Record<string, unknown> = {};
      for (const m of ['setLock', 'where', 'andWhere', 'orderBy', 'select']) {
        qb[m] = () => qb;
      }
      qb.getOne = () => Promise.resolve(debt);
      qb.getMany = () => Promise.resolve(debt ? [debt] : []);
      return qb;
    },
  };
  const manager = { getRepository: () => repo } as never;
  const svc = new TaskerDebtService({} as never, {} as never);
  return { svc, manager, saved, removed };
}

describe('debtOutstanding — công thức nợ còn lại', () => {
  it('trừ cả phần đã thu lẫn phần đã xoá', () => {
    expect(
      debtOutstanding(
        makeDebt({ recoveredAmount: 200_000, writtenOffAmount: 300_000 }),
      ),
    ).toBe(500_000);
  });

  it('không trả về số âm', () => {
    expect(
      debtOutstanding(
        makeDebt({ recoveredAmount: 900_000, writtenOffAmount: 900_000 }),
      ),
    ).toBe(0);
  });
});

describe('TaskerDebtService.openDebt', () => {
  it('tạo khoản nợ mới với trạng thái còn nợ', async () => {
    const { svc, manager, saved } = makeService(null);
    await svc.openDebt(manager, {
      taskerId: 'tk-1',
      source: SRC,
      sourceRefId: 'inc-9',
      sourceCode: 'IC-9',
      amount: 500_000,
    });
    expect(saved[0].originalAmount).toBe(500_000);
    expect(saved[0].status).toBe(TaskerDebtStatus.OUTSTANDING);
  });

  /** Đảo bồi thường rồi chi lại: cùng nguồn phải cập nhật, không đẻ bản ghi thứ hai. */
  it('idempotent theo nguồn — gọi lại thì cập nhật số gốc', async () => {
    const existing = makeDebt({ originalAmount: 1_000_000 });
    const { svc, manager, saved } = makeService(existing);
    await svc.openDebt(manager, {
      taskerId: 'tk-1',
      source: SRC,
      sourceRefId: 'inc-1',
      amount: 400_000,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].originalAmount).toBe(400_000);
  });

  it('số nợ về 0 (đảo bồi thường) → xoá bản ghi nợ', async () => {
    const { svc, manager, removed } = makeService(makeDebt());
    const result = await svc.openDebt(manager, {
      taskerId: 'tk-1',
      source: SRC,
      sourceRefId: 'inc-1',
      amount: 0,
    });
    expect(result).toBeNull();
    expect(removed).toHaveLength(1);
  });
});

describe('TaskerDebtService.writeOff', () => {
  it('xoá đúng phần còn lại, tách khỏi số đã thu hồi thật', async () => {
    const debt = makeDebt();
    const { svc, manager } = makeService(debt);

    const out = await svc.writeOff(
      manager,
      SRC,
      'inc-1',
      'admin-1',
      'Tasker đã nghỉ việc, ví trống',
      90,
    );

    expect(out.writtenOff).toBe(800_000);
    expect(debt.writtenOffAmount).toBe(800_000);
    // Con số thu hồi THẬT không bị thổi phồng bằng khoản chưa từng nhận được.
    expect(debt.recoveredAmount).toBe(200_000);
    expect(debt.status).toBe(TaskerDebtStatus.WRITTEN_OFF);
    expect(debtOutstanding(debt)).toBe(0);
  });

  it('chặn lý do quá ngắn — đây là thao tác tự-phê-duyệt có ảnh hưởng tài chính', async () => {
    const { svc, manager } = makeService(makeDebt());
    await expect(
      svc.writeOff(manager, SRC, 'inc-1', 'admin-1', 'ngắn', 90),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('chặn khi không còn nợ', async () => {
    const { svc, manager } = makeService(
      makeDebt({ recoveredAmount: 1_000_000 }),
    );
    await expect(
      svc.writeOff(manager, SRC, 'inc-1', 'admin-1', 'Không còn nợ gì cả', 90),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  /** Tuổi tính trên chính khoản nợ, không suy từ hồ sơ nghiệp vụ sinh ra nó. */
  it('chặn khi khoản nợ chưa đủ tuổi cho thu hồi tự động chạy', async () => {
    const { svc, manager } = makeService(
      makeDebt({ createdAt: new Date(Date.now() - 10 * DAY) }),
    );
    await expect(
      svc.writeOff(
        manager,
        SRC,
        'inc-1',
        'admin-1',
        'Muốn xoá sớm cho gọn hàng đợi',
        90,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
