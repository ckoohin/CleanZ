import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import {
  AdminActivityService,
  RecordAdminActivityInput,
} from '../services/admin-activity.service';
import {
  AdminActivitySnapshot,
  AdminActivitySnapshotService,
} from '../services/admin-activity-snapshot.service';
import { sanitizeAuditValue } from '../utils/admin-activity-sanitizer';

type AuditableRequest = Request & { user?: AuthUser };

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PATHS = [/^\/api\/v1\/auth(?:\/|$)/];

const RESOURCE_LABELS: Record<string, string> = {
  appeals: 'kháng cáo',
  'absence-reports': 'báo cáo khách vắng mặt',
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
    private readonly activityService: AdminActivityService,
    private readonly snapshotService: AdminActivitySnapshotService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request.user;
    const method = request.method.toUpperCase();

    if (user?.role !== UserRole.ADMIN || !MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const startedAt = Date.now();
    const path = request.originalUrl.split('?')[0].slice(0, 500);
    if (EXCLUDED_PATHS.some((pattern) => pattern.test(path))) {
      return next.handle();
    }
    const resource = this.resolveResource(path);
    const handler = `${context.getClass().name}.${context.getHandler().name}`;
    const baseInput = {
      actorUserId: user.id,
      actorEmail: user.email,
      action: `${this.resolveVerb(method, context.getHandler().name)} ${resource}`,
      resource,
      method,
      path,
      handler: handler.slice(0, 180),
      targetId: this.resolveTargetId(request.params),
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

  private persist(input: RecordAdminActivityInput): Observable<void> {
    return from(this.activityService.record(input)).pipe(
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
