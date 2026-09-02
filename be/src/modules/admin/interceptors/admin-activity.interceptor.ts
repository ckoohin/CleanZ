import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import type { AuthUser } from 'src/modules/auth/types/AuthRequest';
import {
  catchError,
  from,
  map,
  mergeMap,
  Observable,
  of,
  throwError,
} from 'rxjs';
import { AdminActivityStatus } from '../entities/admin-activity-log.entity';
import { RecordAdminActivityInput } from '../services/admin-activity.service';
import { AuditRecorder } from '../audit/audit-recorder.service';
import {
  AdminActivitySnapshot,
  AdminActivitySnapshotService,
} from '../services/admin-activity-snapshot.service';
import { sanitizeAuditValue } from '../utils/admin-activity-sanitizer';
import {
  AUDIT_ACTION_KEY,
  AuditActionOptions,
} from '../audit/audit-action.decorator';
import { GENERIC_ACTION_CODE_PREFIX } from '../audit/audit-action-codes';
import { AUDIT_ACTION_LABELS } from '../audit/audit-action-labels';
import { AuditContext } from '../audit/audit-context';

/**
 * `auditCorrelationId` được gắn vào request để tầng service đọc lại và ghi kèm
 * vào các bảng hệ quả (`wallet_transactions`, `booking_status_logs`…), nhờ đó một
 * thao tác admin và mọi thay đổi dữ liệu nó gây ra chia sẻ chung một khoá.
 */
export type AuditableRequest = Request & {
  user?: AuthUser;
  auditCorrelationId?: string;
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PATHS = [/^\/api\/v1\/auth(?:\/|$)/];

const RESOURCE_LABELS: Record<string, string> = {
  appeals: 'kháng cáo',
  'absence-reports': 'báo cáo khách vắng mặt',
  'bank-statement': 'sao kê ngân hàng',
  blog: 'bài viết',
  bookings: 'booking',
  categories: 'danh mục',
  'coverage-areas': 'khu vực phục vụ',
  customers: 'khách hàng',
  finance: 'tài chính',
  incidents: 'sự cố',
  notifications: 'thông báo',
  policy: 'chính sách',
  pricing: 'cấu hình giá',
  reviews: 'đánh giá',
  'service-packages': 'gói dịch vụ',
  services: 'dịch vụ',
  settings: 'cấu hình hệ thống',
  'system-config': 'cấu hình hệ thống',
  'sub-services': 'dịch vụ con',
  'support-tickets': 'phiếu hỗ trợ',
  taskers: 'Tasker',
  users: 'người dùng',
  vouchers: 'voucher',
  wallets: 'ví',
  withdrawals: 'yêu cầu rút tiền',
  workflows: 'quy trình',
};

@Injectable()
export class AdminActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminActivityInterceptor.name);

  constructor(
    private readonly recorder: AuditRecorder,
    private readonly snapshotService: AdminActivitySnapshotService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user;
    const method = request.method.toUpperCase();

    if (user?.role !== UserRole.ADMIN) {
      return next.handle();
    }

    const declared = this.reflector.get<AuditActionOptions | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // Handler có khai báo thì luôn ghi — đó là cách duy nhất audit được một hành
    // động ĐỌC. Không khai báo thì giữ nguyên lưới nền cũ: chỉ các method GHI, vì
    // ghi log mọi lần admin mở một trang danh sách chỉ tạo nhiễu.
    if (!declared && !MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const path = request.originalUrl.split('?')[0].slice(0, 500);
    if (EXCLUDED_PATHS.some((pattern) => pattern.test(path))) {
      return next.handle();
    }

    const startedAt = Date.now();
    const resource = this.resolveResource(path);
    const handler = `${context.getClass().name}.${context.getHandler().name}`;
    const correlationId = request.auditCorrelationId ?? randomUUID();
    request.auditCorrelationId = correlationId;
    AuditContext.enter({
      correlationId,
      actorUserId: user.id,
      actorEmail: user.email,
      method,
      path,
      handler: handler.slice(0, 180),
      resource,
      startedAt,
    });

    const baseInput = {
      actorUserId: user.id,
      actorEmail: user.email,
      action: this.resolveActionLabel(
        declared,
        method,
        context.getHandler().name,
        resource,
      ),
      actionCode: declared?.code ?? `${GENERIC_ACTION_CODE_PREFIX}${handler}`,
      severity: declared?.severity ?? AuditSeverity.NORMAL,
      resource,
      method,
      path,
      handler: handler.slice(0, 180),
      targetId: this.resolveTargetId(request.params),
      targetType: declared?.targetType ?? null,
      affectedIds: null,
      reason: this.resolveReason(request.body, declared),
      correlationId,
      businessData: null,
      changes: this.buildChanges(request),
    };
    let successRecorded = false;

    return from(this.captureBefore(path, request.params)).pipe(
      mergeMap((before) =>
        next.handle().pipe(
          mergeMap((result: unknown) => {
            if (successRecorded) {
              return of(result);
            }
            successRecorded = true;
            // Service đã ghi nhật ký cùng transaction nghiệp vụ (các lệnh chuyển
            // tiền thật). Ghi thêm ở đây chỉ tạo bản ghi trùng cho cùng một việc.
            if (AuditContext.wasRecordedInTransaction()) {
              return of(result);
            }
            return from(
              this.buildSuccessChanges({
                path,
                params: request.params,
                body: request.body,
                result,
                before,
                fallback: baseInput.changes,
              }),
            ).pipe(
              mergeMap((changes) =>
                this.persist({
                  ...baseInput,
                  changes,
                  businessData: this.runExtract(declared, request, result),
                  affectedIds: this.resolveAffectedIds(declared, request),
                  status: AdminActivityStatus.SUCCESS,
                  statusCode: response.statusCode,
                  errorMessage: null,
                  durationMs: Date.now() - startedAt,
                }),
              ),
              map(() => result),
            );
          }),
          catchError((error: unknown) => {
            // Transaction nghiệp vụ đã commit và tự ghi nhật ký, rồi mới có lỗi ở
            // đoạn sau (dựng response, đọc lại bản ghi để trả về). Tiền ĐÃ chuyển.
            // Ghi thêm một dòng "thất bại" ở đây sẽ tạo ra hai bản ghi mâu thuẫn
            // về cùng một sự kiện, và người đọc không có cách nào biết bản nào
            // đúng. Lỗi sau commit là lỗi của tầng trình bày, không phải của
            // nghiệp vụ — nó thuộc log ứng dụng, không thuộc nhật ký kiểm toán.
            if (AuditContext.wasRecordedInTransaction()) {
              return throwError(() => error);
            }

            const statusCode =
              error instanceof HttpException ? error.getStatus() : 500;
            const changes =
              this.snapshotService.buildAttemptChanges({
                body: request.body,
                before,
              }) ?? baseInput.changes;
            return this.persist({
              ...baseInput,
              changes,
              // Thao tác THẤT BẠI vẫn giữ nguyên `businessData` rút từ body: một lần
              // thử điều chỉnh ví 50 triệu bị chặn cũng đáng xem như một lần thành công.
              businessData: this.runExtract(declared, request, null),
              status:
                statusCode >= 500
                  ? AdminActivityStatus.DANGER
                  : AdminActivityStatus.WARNING,
              statusCode,
              errorMessage: this.safeErrorMessage(error, statusCode),
              durationMs: Date.now() - startedAt,
            }).pipe(mergeMap(() => throwError(() => error)));
          }),
        ),
      ),
    );
  }

  private async captureBefore(
    path: string,
    params: Record<string, unknown> | undefined,
  ): Promise<AdminActivitySnapshot | null> {
    try {
      return await this.snapshotService.captureBefore(path, params);
    } catch (error: unknown) {
      this.logger.warn(
        `Không thể lấy dữ liệu cũ cho audit log: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  private async buildSuccessChanges(input: {
    path: string;
    params: Record<string, unknown> | undefined;
    body: unknown;
    result: unknown;
    before: AdminActivitySnapshot | null;
    fallback: Record<string, unknown> | null;
  }): Promise<Record<string, unknown> | null> {
    try {
      return (
        (await this.snapshotService.buildSuccessChanges(input)) ??
        this.withTargetLabel(input.fallback, input.result)
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Không thể so sánh dữ liệu audit log: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.withTargetLabel(input.fallback, input.result);
    }
  }

  /**
   * Đưa vào `audit_outbox` chứ không ghi thẳng `admin_activity_logs`.
   *
   * Ghi thẳng đồng nghĩa với việc dựng nội dung log (đọc snapshot, diff, sanitize)
   * và ghi DB đều nằm trên đường trả response — hỏng bước nào thì mất trắng dòng
   * nhật ký, mà `catchError` bên dưới lại nuốt luôn nên không ai hay. Qua outbox
   * thì phần dễ hỏng chuyển sang worker: thử lại được, và thất bại vĩnh viễn thì
   * còn nguyên bằng chứng trong bảng để đối chiếu.
   */
  private persist(
    input: RecordAdminActivityInput & { correlationId: string },
  ): Observable<void> {
    return from(this.recorder.enqueueDetached(input)).pipe(
      catchError((error: unknown) => {
        this.logger.error(
          'Không thể ghi admin activity log',
          error instanceof Error ? error.stack : undefined,
        );
        return of(undefined);
      }),
    );
  }

  private buildChanges(
    request: AuditableRequest,
  ): Record<string, unknown> | null {
    const changes: Record<string, unknown> = {};
    const body = request.body as unknown;
    const params = request.params as Record<string, unknown> | undefined;
    const query = request.query as Record<string, unknown> | undefined;

    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      changes.body = sanitizeAuditValue(body);
    }
    if (params && Object.keys(params).length > 0) {
      changes.params = sanitizeAuditValue(params);
    }
    if (query && Object.keys(query).length > 0) {
      changes.query = sanitizeAuditValue(query);
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private withTargetLabel(
    changes: Record<string, unknown> | null,
    result: unknown,
  ): Record<string, unknown> | null {
    const targetLabel = this.extractTargetLabel(result);
    if (!targetLabel) return changes;
    return { ...(changes ?? {}), targetLabel };
  }

  private extractTargetLabel(result: unknown): string | null {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return null;
    }
    const response = result as Record<string, unknown>;
    const payload =
      response.data &&
      typeof response.data === 'object' &&
      !Array.isArray(response.data)
        ? (response.data as Record<string, unknown>)
        : response;
    const value = [
      payload.name,
      payload.title,
      payload.packageCode,
      payload.bookingCode,
      payload.ticketCode,
      payload.code,
    ].find(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    );

    return value ? value.trim().slice(0, 160) : null;
  }

  private runExtract(
    declared: AuditActionOptions | undefined,
    request: AuditableRequest,
    result: unknown,
  ): Record<string, unknown> | null {
    if (!declared?.extract) return null;
    try {
      const extracted = declared.extract({
        body: (request.body as Record<string, unknown>) ?? {},
        params: (request.params as Record<string, unknown>) ?? {},
        query: (request.query as Record<string, unknown>) ?? {},
        result: this.resultPayload(result),
      });
      if (!extracted || Object.keys(extracted).length === 0) return null;
      return sanitizeAuditValue(extracted) as Record<string, unknown>;
    } catch (error: unknown) {
      // Extractor hỏng chỉ được phép làm mất phần business_data, tuyệt đối không
      // được làm hỏng nghiệp vụ hay nuốt luôn cả dòng nhật ký.
      this.logger.warn(
        `Không thể rút business_data cho ${declared.code}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Bóc lớp bao `successResponse` (`{ data, message }`) để extractor nhận thẳng
   * payload nghiệp vụ, thay vì phải tự biết về quy ước response của tầng HTTP.
   */
  private resultPayload(result: unknown): Record<string, unknown> | null {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return null;
    }
    const response = result as Record<string, unknown>;
    const data = response.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return response;
  }

  /**
   * Thao tác hàng loạt (gán ticket theo lô) không có `:id` trên route nên
   * `targetId` luôn null — danh sách id là manh mối duy nhất về việc những bản ghi
   * nào đã bị đụng tới.
   *
   * Đọc từ REQUEST chứ không từ response: các handler hàng loạt hiện trả về số
   * đếm (`{ assigned, skipped }`), không trả id. Bắt chúng đổi kiểu trả về chỉ để
   * phục vụ nhật ký là để đuôi vẫy chó — trong khi danh sách id vốn đã nằm sẵn
   * trong body request mà admin gửi lên.
   */
  private resolveAffectedIds(
    declared: AuditActionOptions | undefined,
    request: AuditableRequest,
  ): string[] | null {
    if (!declared?.affectedIdsField) return null;
    const body = request.body as Record<string, unknown> | undefined;
    const candidate = body?.[declared.affectedIdsField];
    if (!Array.isArray(candidate)) return null;
    const ids = candidate.filter(
      (item): item is string => typeof item === 'string',
    );
    return ids.length > 0 ? ids.slice(0, 500) : null;
  }

  private resolveReason(
    body: unknown,
    declared: AuditActionOptions | undefined,
  ): string | null {
    if (!declared?.reasonField) return null;
    const record = body as Record<string, unknown> | undefined;
    const value = record?.[declared.reasonField];
    return typeof value === 'string' && value.trim()
      ? value.trim().slice(0, 2000)
      : null;
  }

  private resolveTargetId(params: Request['params']): string | null {
    const firstId = Object.entries(params ?? {}).find(([key, value]) => {
      return /(^id$|id$)/i.test(key) && typeof value === 'string';
    });
    return firstId ? String(firstId[1]).slice(0, 100) : null;
  }

  private resolveResource(path: string): string {
    const segments = path
      .replace(/^\/api\/v1\/?/, '')
      .split('/')
      .filter(Boolean);
    let key = segments[0] ?? 'hệ thống';
    if (key === 'admin') {
      key = segments[1] ?? 'hệ thống';
    } else if (key === 'blog' && segments[1] === 'admin') {
      key = 'blog';
    }
    return RESOURCE_LABELS[key] ?? key.replace(/-/g, ' ');
  }

  /**
   * Nhãn hiển thị lấy từ registry khi handler đã khai báo mã. Chỉ những handler
   * chưa khai báo mới rơi về cách đoán từ tên hàm — cách đó vừa sai nghĩa
   * (`unlockReporter` khớp `/unlock/` → "Khôi phục") vừa đổi theo mỗi lần
   * refactor tên method, kể cả với bản ghi cũ đang hiển thị lại.
   */
  private resolveActionLabel(
    declared: AuditActionOptions | undefined,
    method: string,
    handlerName: string,
    resource: string,
  ): string {
    const declaredLabel = declared
      ? AUDIT_ACTION_LABELS[declared.code]
      : undefined;
    if (declaredLabel) return declaredLabel.slice(0, 120);

    return `${this.resolveVerb(method, handlerName)} ${resource}`.slice(0, 120);
  }

  private resolveVerb(method: string, handlerName: string): string {
    const name = handlerName.toLowerCase();
    const handlerVerbs: Array<[RegExp, string]> = [
      [/restore|reinstate|unlock/, 'Khôi phục'],
      [/cancel/, 'Hủy'],
      [/delete|remove/, 'Xóa'],
      [/reject|deny/, 'Từ chối'],
      [/approve|accept|verify/, 'Phê duyệt'],
      [/assign/, 'Gán'],
      [/reset/, 'Đặt lại'],
      [/resend|broadcast|send/, 'Gửi'],
      [/complete|finalize/, 'Hoàn tất'],
      [/reverse|refund/, 'Đảo giao dịch'],
      [/create|add|seed|upload/, 'Tạo mới'],
      [/update|change|adjust|edit|reorder|toggle/, 'Cập nhật'],
    ];
    const matched = handlerVerbs.find(([pattern]) => pattern.test(name));
    if (matched) {
      return matched[1];
    }
    if (method === 'DELETE') return 'Xóa';
    if (method === 'PATCH' || method === 'PUT') return 'Cập nhật';
    return 'Thực hiện';
  }

  private safeErrorMessage(error: unknown, statusCode: number): string {
    if (statusCode >= 500) {
      return 'Lỗi hệ thống khi xử lý thao tác';
    }
    if (!(error instanceof HttpException)) {
      return 'Thao tác không thành công';
    }

    const response = error.getResponse();
    if (typeof response === 'string') {
      return response.slice(0, 500);
    }
    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.map(String).join(', ').slice(0, 500);
    }
    return typeof message === 'string'
      ? message.slice(0, 500)
      : 'Thao tác không thành công';
  }
}
