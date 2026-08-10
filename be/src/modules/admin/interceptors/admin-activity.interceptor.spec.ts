import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { AdminActivityStatus } from '../entities/admin-activity-log.entity';
import { RecordAdminActivityInput } from '../services/admin-activity.service';
import { AuditContext } from '../audit/audit-context';
import { AuditActionOptions } from '../audit/audit-action.decorator';
import { AdminActivityInterceptor } from './admin-activity.interceptor';

/**
 * Interceptor là thứ DUY NHẤT chạy cho mọi thao tác của admin — 71 endpoint khai
 * báo `@AuditAction` đều phụ thuộc vào nó, và các endpoint chưa khai báo cũng
 * sống nhờ lưới nền của nó. Nó hỏng theo kiểu im lặng: nghiệp vụ vẫn chạy đúng,
 * không request nào lỗi, chỉ có nhật ký thiếu hoặc sai — và điều đó chỉ lộ ra
 * vào đúng lúc cần truy vết một vụ việc, tức là lúc đã quá muộn.
 */
describe('AdminActivityInterceptor', () => {
  const ADMIN = {
    id: 'admin-1',
    email: 'admin@cleanz.vn',
    role: UserRole.ADMIN,
  };

  type Ctx = {
    method?: string;
    url?: string;
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    user?: unknown;
    statusCode?: number;
    handlerName?: string;
    type?: string;
  };

  function makeContext(ctx: Ctx = {}) {
    // `auditCorrelationId` phải nằm trong kiểu: interceptor GHI ngược vào request
    // để tầng service đọc lại, nên đây là phần giao kèo chứ không phải phụ trợ.
    const request: Record<string, unknown> & {
      auditCorrelationId?: string;
    } = {
      method: ctx.method ?? 'POST',
      originalUrl: ctx.url ?? '/api/v1/admin/finance/transactions/adjustment',
      params: ctx.params ?? {},
      body: ctx.body ?? {},
      query: {},
      user: 'user' in ctx ? ctx.user : ADMIN,
    };
    const response = { statusCode: ctx.statusCode ?? 200 };

    // Tên hàm handler là dữ liệu thật của interceptor: nó vào `handler`, vào mã
    // `GENERIC.*`, và `resolveVerb` đoán nhãn tiếng Việt từ chính tên này.
    const handler = {
      [ctx.handlerName ?? 'createAdjustment']: () => undefined,
    }[ctx.handlerName ?? 'createAdjustment'];

    return {
      context: {
        getType: () => ctx.type ?? 'http',
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
        getClass: () => ({ name: 'TestController' }),
        getHandler: () => handler,
      } as unknown as ExecutionContext,
      request,
    };
  }

  function makeInterceptor(declared?: AuditActionOptions) {
    const recorded: RecordAdminActivityInput[] = [];
    const recorder = {
      enqueueDetached: (payload: RecordAdminActivityInput) => {
        recorded.push(payload);
        return Promise.resolve();
      },
    };
    const snapshot = {
      captureBefore: () => Promise.resolve(null),
      buildSuccessChanges: () => Promise.resolve(null),
      buildAttemptChanges: () => null,
    };
    const reflector = { get: () => declared } as unknown as Reflector;

    const interceptor = new AdminActivityInterceptor(
      recorder as never,
      snapshot as never,
      reflector,
    );

    return { interceptor, recorded, recorder };
  }

  /** Handler thành công, trả payload bọc trong `{ data }` như `successResponse`. */
  const okHandler = (data: unknown = { id: 'tx-1' }) => ({
    handle: () => of({ success: true, data }),
  });

  const failHandler = (error: unknown) => ({
    handle: () => throwError(() => error),
  });

  // ─── Bộ lọc: cái gì KHÔNG được ghi ────────────────────────────────────────

  it('bỏ qua request không phải HTTP', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext({ type: 'ws' });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded).toHaveLength(0);
  });

  // Đây là nhật ký THAO TÁC ADMIN. Ghi cả hành vi của khách/Tasker sẽ biến nó
  // thành nhật ký truy cập chung và chôn vùi thứ thực sự cần theo dõi.
  it.each([UserRole.CUSTOMER, UserRole.TASKER])(
    'bỏ qua khi actor là %s',
    async (role) => {
      const { interceptor, recorded } = makeInterceptor();
      const { context } = makeContext({ user: { ...ADMIN, role } });

      await lastValueFrom(interceptor.intercept(context, okHandler()));

      expect(recorded).toHaveLength(0);
    },
  );

  it('bỏ qua khi request chưa xác thực', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext({ user: undefined });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded).toHaveLength(0);
  });

  /**
   * Không khai báo thì GET bị bỏ qua — nếu không, mỗi lần admin mở một trang
   * danh sách lại sinh một dòng nhật ký vô giá trị, và tỉ lệ nhiễu trên tín hiệu
   * đủ cao để không ai còn đọc nhật ký nữa.
   */
  it('bỏ qua GET không khai báo', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext({ method: 'GET', handlerName: 'list' });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded).toHaveLength(0);
  });

  // Gắn decorator lên GET là đường DUY NHẤT để audit một hành động đọc dữ liệu
  // nhạy cảm (export, xem giấy tờ, xem ví của một khách).
  it('GHI khi GET có khai báo READ_SENSITIVE', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'READ.EXPORT_INCIDENTS',
      severity: AuditSeverity.READ_SENSITIVE,
    });
    const { context } = makeContext({ method: 'GET', handlerName: 'export' });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded).toHaveLength(1);
    expect(recorded[0].severity).toBe(AuditSeverity.READ_SENSITIVE);
  });

  // Nhật ký chứa mật khẩu/OTP còn nguy hiểm hơn không có nhật ký.
  it('bỏ qua toàn bộ nhánh /auth', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext({ url: '/api/v1/auth/login' });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded).toHaveLength(0);
  });

  // ─── Lưới nền: endpoint chưa khai báo vẫn phải được ghi ────────────────────

  it('ghi endpoint chưa khai báo với mã GENERIC dựng từ Class.method', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext({ handlerName: 'updateSomething' });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded).toHaveLength(1);
    expect(recorded[0].actionCode).toBe(
      'GENERIC.TestController.updateSomething',
    );
    expect(recorded[0].severity).toBe(AuditSeverity.NORMAL);
  });

  // ─── Metadata từ decorator ────────────────────────────────────────────────

  it('lấy mã, mức độ, loại đối tượng, lý do và danh sách id từ khai báo', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'SUPPORT.TICKET_BULK_ASSIGN',
      severity: AuditSeverity.HIGH,
      targetType: 'SUPPORT_TICKET',
      reasonField: 'note',
      affectedIdsField: 'ticketIds',
    });
    const { context } = makeContext({
      body: {
        note: '  Gán lại cho ca trực đêm  ',
        ticketIds: ['t-1', 't-2', 't-3'],
      },
    });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded[0]).toMatchObject({
      actionCode: 'SUPPORT.TICKET_BULK_ASSIGN',
      severity: AuditSeverity.HIGH,
      targetType: 'SUPPORT_TICKET',
      // Lý do được cắt khoảng trắng — nó sẽ hiện nguyên văn trên giao diện.
      reason: 'Gán lại cho ca trực đêm',
      affectedIds: ['t-1', 't-2', 't-3'],
    });
  });

  it('lấy targetId từ route param', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext({ params: { id: 'booking-9' } });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(recorded[0].targetId).toBe('booking-9');
  });

  /**
   * Extractor nhận payload đã bóc lớp `{ data }` của `successResponse`, để chỗ
   * khai báo không phải biết gì về quy ước response của tầng HTTP.
   */
  it('rút business_data từ body và từ payload đã bóc lớp data', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'FINANCE.WALLET_MANUAL_ADJUSTMENT',
      severity: AuditSeverity.CRITICAL,
      extract: ({ body, result }) => ({
        walletId: body.walletId,
        balanceAfter: result?.balanceAfter ?? null,
      }),
    });
    const { context } = makeContext({ body: { walletId: 'w-1' } });

    await lastValueFrom(
      interceptor.intercept(
        context,
        okHandler({ id: 'tx-1', balanceAfter: 8_601_000 }),
      ),
    );

    expect(recorded[0].businessData).toEqual({
      walletId: 'w-1',
      balanceAfter: 8_601_000,
    });
  });

  it('che dữ liệu nhạy cảm lọt vào business_data', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'IAM.USER_CREATE',
      severity: AuditSeverity.CRITICAL,
      extract: ({ body }) => ({ email: body.email, password: body.password }),
    });
    const { context } = makeContext({
      body: { email: 'a@b.vn', password: 'sieu-mat' },
    });

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    const businessData = recorded[0].businessData as Record<string, unknown>;
    expect(businessData.password).not.toBe('sieu-mat');
  });

  /**
   * Extractor là code do người khai báo tự viết, chạy trên dữ liệu thật. Một lỗi
   * ở đó chỉ được phép làm mất phần `business_data` — không được làm hỏng nghiệp
   * vụ, và cũng không được nuốt luôn cả dòng nhật ký.
   */
  it('extractor ném lỗi thì vẫn ghi log, chỉ mất business_data', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'FINANCE.WALLET_MANUAL_ADJUSTMENT',
      severity: AuditSeverity.CRITICAL,
      extract: () => {
        throw new Error('extractor hỏng');
      },
    });
    const { context } = makeContext();

    const result = await lastValueFrom(
      interceptor.intercept(context, okHandler()),
    );

    expect(result).toMatchObject({ success: true });
    expect(recorded).toHaveLength(1);
    expect(recorded[0].businessData).toBeNull();
  });

  // ─── Ngữ cảnh và khoá truy vết ────────────────────────────────────────────

  it('gắn correlationId lên request để tầng service đóng dấu bản ghi hệ quả', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context, request } = makeContext();

    await lastValueFrom(interceptor.intercept(context, okHandler()));

    expect(request.auditCorrelationId).toEqual(expect.any(String));
    expect(recorded[0].correlationId).toBe(request.auditCorrelationId);
  });

  it('mỗi request nhận một correlationId riêng', async () => {
    const { interceptor, recorded } = makeInterceptor();

    await lastValueFrom(
      interceptor.intercept(makeContext().context, okHandler()),
    );
    await lastValueFrom(
      interceptor.intercept(makeContext().context, okHandler()),
    );

    expect(recorded[0].correlationId).not.toBe(recorded[1].correlationId);
  });

  it('mở ngữ cảnh audit để service đọc được trong lúc handler chạy', async () => {
    const { interceptor } = makeInterceptor();
    const { context, request } = makeContext();
    let seen: string | null = null;

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => {
          seen = AuditContext.correlationId();
          return of({ data: {} });
        },
      }),
    );

    expect(seen).toBe(request.auditCorrelationId);
  });

  // ─── Chống ghi trùng với tầng service ─────────────────────────────────────

  /**
   * Các lệnh chuyển tiền thật tự ghi nhật ký trong transaction của mình. Không có
   * cờ này thì mỗi lệnh sinh ra HAI bản ghi cho cùng một sự kiện.
   */
  it('không ghi khi service đã ghi trong transaction', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'FINANCE.WALLET_MANUAL_ADJUSTMENT',
      severity: AuditSeverity.CRITICAL,
    });
    const { context } = makeContext();

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => {
          AuditContext.markRecordedInTransaction();
          return of({ data: {} });
        },
      }),
    );

    expect(recorded).toHaveLength(0);
  });

  /**
   * Transaction đã commit (tiền ĐÃ chuyển) rồi mới lỗi ở đoạn dựng response. Ghi
   * thêm một dòng "thất bại" sẽ tạo hai bản ghi mâu thuẫn về cùng một sự kiện, và
   * người đọc không có cách nào biết bản nào đúng.
   */
  it('không ghi bản ghi thất bại khi lỗi xảy ra SAU commit', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'INCIDENT.COMPENSATE',
      severity: AuditSeverity.CRITICAL,
    });
    const { context } = makeContext();
    const boom = new Error('lỗi khi dựng response');

    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => {
            AuditContext.markRecordedInTransaction();
            return throwError(() => boom);
          },
        }),
      ),
    ).rejects.toBe(boom);

    expect(recorded).toHaveLength(0);
  });

  // ─── Nhánh thất bại ───────────────────────────────────────────────────────

  it('ghi WARNING cho lỗi 4xx và ném lại lỗi nguyên vẹn', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext();
    const error = new BadRequestException('Số dư không đủ');

    await expect(
      lastValueFrom(interceptor.intercept(context, failHandler(error))),
    ).rejects.toBe(error);

    expect(recorded[0]).toMatchObject({
      status: AdminActivityStatus.WARNING,
      statusCode: 400,
      errorMessage: 'Số dư không đủ',
    });
  });

  it('ghi DANGER cho lỗi hệ thống và không rò chi tiết lỗi', async () => {
    const { interceptor, recorded } = makeInterceptor();
    const { context } = makeContext();
    const error = new Error('connect ECONNREFUSED 10.0.0.5:5432');

    await expect(
      lastValueFrom(interceptor.intercept(context, failHandler(error))),
    ).rejects.toBe(error);

    expect(recorded[0]).toMatchObject({
      status: AdminActivityStatus.DANGER,
      statusCode: 500,
    });
    // Thông điệp lỗi hệ thống hay chứa host/cổng/đường dẫn nội bộ; nhật ký này
    // hiển thị cho mọi admin nên phải là câu chung chung.
    expect(recorded[0].errorMessage).not.toContain('ECONNREFUSED');
  });

  /**
   * Một lần THỬ điều chỉnh ví 50 triệu bị chặn cũng đáng theo dõi ngang một lần
   * thành công — có khi hơn.
   */
  it('giữ business_data rút từ body ở nhánh thất bại', async () => {
    const { interceptor, recorded } = makeInterceptor({
      code: 'FINANCE.WALLET_MANUAL_ADJUSTMENT',
      severity: AuditSeverity.CRITICAL,
      extract: ({ body, result }) => ({
        requestedAmount: body.amount,
        transactionId: result?.id ?? null,
      }),
    });
    const { context } = makeContext({ body: { amount: -50_000_000 } });

    await expect(
      lastValueFrom(
        interceptor.intercept(
          context,
          failHandler(new BadRequestException('Số dư không đủ')),
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(recorded[0].businessData).toEqual({
      requestedAmount: -50_000_000,
      transactionId: null,
    });
  });

  // ─── Ghi log là best-effort với nhánh interceptor ─────────────────────────

  /**
   * Đường này chỉ đưa payload vào outbox; hỏng thì thử lại được ở worker. Đánh
   * đổi có chủ đích: chặn cả request vì không ghi nổi một dòng nhật ký là cái giá
   * quá đắt cho lớp nền. Nhóm chuyển tiền thật đi đường khác, ghi trong transaction.
   */
  it('lỗi khi đẩy vào outbox không làm hỏng request', async () => {
    const { interceptor, recorder } = makeInterceptor();
    recorder.enqueueDetached = () => Promise.reject(new Error('DB sập'));
    const { context } = makeContext();

    const result = await lastValueFrom(
      interceptor.intercept(context, okHandler()),
    );

    expect(result).toMatchObject({ success: true });
  });
});
