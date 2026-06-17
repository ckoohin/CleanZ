import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { CustomerEntity } from '../customer/entity/customer.entity';
import { TaskerEntity } from '../tasker/entity/tasker.entity';
import { MailService } from '../mail/mail.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserRole } from 'src/common/enums/user-role.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { DocumentStatus } from 'src/common/enums/document-status.enum';

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.CUSTOMER,
    isActive: true,
    isVerified: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }) as UserEntity;

describe('UsersService', () => {
  let service: UsersService;
  let mockQb: Record<string, jest.Mock>;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockCustomerRepo: Record<string, jest.Mock>;
  let mockTaskerRepo: Record<string, jest.Mock>;
  let mockJwtService: Record<string, jest.Mock>;
  let mockConfigService: Record<string, jest.Mock>;
  let mockMailService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockQb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockUserRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue(undefined),
    };

    mockCustomerRepo = { findOne: jest.fn().mockResolvedValue(null) };
    mockTaskerRepo = { findOne: jest.fn().mockResolvedValue(null) };
    mockJwtService = { sign: jest.fn().mockReturnValue('mock-reset-token') };
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const values: Record<string, string> = {
          JWT_RESET_PASSWORD_SECRET: 'reset-secret',
          JWT_RESET_PASSWORD_EXPIRES_IN: '15m',
          FRONTEND_URL: 'http://localhost:3000',
        };
        return values[key] ?? 'mock-value';
      }),
    };
    mockMailService = { sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        { provide: getRepositoryToken(CustomerEntity), useValue: mockCustomerRepo },
        { provide: getRepositoryToken(TaskerEntity), useValue: mockTaskerRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated result with correct metadata', async () => {
      const users = [makeUser()];
      mockQb.getManyAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAll({ page: 1, limit: 10 } as QueryUsersDto);

      expect(result.data).toEqual({ data: users, total: 1, page: 1, limit: 10 });
      expect(mockUserRepo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQb.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('applies keyword filter on email and fullName', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ keyword: 'john' } as QueryUsersDto);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.objectContaining({ kw: '%john%' }),
      );
    });

    it('applies role filter when role is provided', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ role: UserRole.TASKER } as QueryUsersDto);

      expect(mockQb.andWhere).toHaveBeenCalledWith('user.role = :role', { role: UserRole.TASKER });
    });

    it('applies isActive filter when provided', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ isActive: false } as QueryUsersDto);

      expect(mockQb.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', { isActive: false });
    });

    it('skips role filter when role is undefined', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as QueryUsersDto);

      const calls = mockQb.andWhere.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls.some((c: unknown) => String(c).includes('role'))).toBe(false);
    });

    it('returns empty data when no users match', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({} as QueryUsersDto);

      expect(result.data).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    });

    it('skips correct number of records for page 2', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 2, limit: 5 } as QueryUsersDto);

      expect(mockQb.skip).toHaveBeenCalledWith(5);
      expect(mockQb.take).toHaveBeenCalledWith(5);
    });

    it('caps limit at 100 even if a higher value reaches the service', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ limit: 200 } as QueryUsersDto);

      expect(mockQb.take).toHaveBeenCalledWith(100);
    });
  });

  // ── findOneWithProfile ────────────────────────────────────────────────────

  describe('findOneWithProfile', () => {
    it('returns user with null profiles for an ADMIN user', async () => {
      const user = makeUser({ role: UserRole.ADMIN });
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockCustomerRepo.findOne.mockResolvedValue(null);
      mockTaskerRepo.findOne.mockResolvedValue(null);

      const result = await service.findOneWithProfile('user-1');

      expect(result.data).toMatchObject({ ...user, customerProfile: null, taskerProfile: null });
    });

    it('returns customerProfile when user has a linked customer record', async () => {
      const user = makeUser({ role: UserRole.CUSTOMER });
      const customer = {
        id: 'cust-1',
        defaultPaymentMethod: PaymentMethod.CASH,
        totalBookings: 3,
        totalCancelled: 1,
      };
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockCustomerRepo.findOne.mockResolvedValue(customer);
      mockTaskerRepo.findOne.mockResolvedValue(null);

      const result = await service.findOneWithProfile('user-1');

      expect(result.data.customerProfile).toEqual({
        id: 'cust-1',
        defaultPaymentMethod: PaymentMethod.CASH,
        totalBookings: 3,
        totalCancelled: 1,
      });
      expect(result.data.taskerProfile).toBeNull();
    });

    it('returns taskerProfile when user has a linked tasker record', async () => {
      const user = makeUser({ role: UserRole.TASKER });
      const tasker = {
        id: 'task-1',
        status: TaskerStatus.ACTIVE,
        docStatus: DocumentStatus.APPROVED,
        ratingAvg: 4.8,
        totalCompletedJobs: 12,
      };
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockCustomerRepo.findOne.mockResolvedValue(null);
      mockTaskerRepo.findOne.mockResolvedValue(tasker);

      const result = await service.findOneWithProfile('user-1');

      expect(result.data.taskerProfile).toEqual({
        id: 'task-1',
        status: TaskerStatus.ACTIVE,
        docStatus: DocumentStatus.APPROVED,
        ratingAvg: 4.8,
        totalCompletedJobs: 12,
      });
    });

    it('throws 404 for non-existent id', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOneWithProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── softRemove ────────────────────────────────────────────────────────────

  describe('softRemove', () => {
    it('soft-deletes user successfully', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(makeUser());

      const result = await service.softRemove('user-1', 'admin-99');

      expect(mockUserRepo.softDelete).toHaveBeenCalledWith('user-1');
      expect(result.data).toBeNull();
    });

    it('throws 403 when requestingUserId === target id', async () => {
      await expect(service.softRemove('user-1', 'user-1')).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.FORBIDDEN }),
      );
      expect(mockUserRepo.softDelete).not.toHaveBeenCalled();
    });

    it('throws 404 when user not found', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(service.softRemove('bad-id', 'admin-99')).rejects.toThrow(NotFoundException);
    });
  });

  // ── restore ───────────────────────────────────────────────────────────────

  describe('restore', () => {
    it('restores a soft-deleted user', async () => {
      const deletedUser = makeUser({ deletedAt: new Date('2025-06-01') });
      const restoredUser = makeUser({ deletedAt: undefined });
      mockUserRepo.findOne.mockResolvedValue(deletedUser);
      mockUserRepo.findOneBy.mockResolvedValue(restoredUser);

      const result = await service.restore('user-1');

      expect(mockUserRepo.restore).toHaveBeenCalledWith('user-1');
      expect(result.data).toEqual({ user: restoredUser });
    });

    it('throws 400 when user is not deleted (deletedAt is null)', async () => {
      mockUserRepo.findOne.mockResolvedValue(makeUser({ deletedAt: undefined }));

      await expect(service.restore('user-1')).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.BAD_REQUEST }),
      );
      expect(mockUserRepo.restore).not.toHaveBeenCalled();
    });

    it('throws 404 when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.restore('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── toggleUserActiveStatus ────────────────────────────────────────────────

  describe('toggleUserActiveStatus', () => {
    it('deactivates a user successfully', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(makeUser());

      await service.toggleUserActiveStatus('user-1', false, 'admin-99');

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { isActive: false });
    });

    it('throws 403 when admin tries to deactivate themselves', async () => {
      await expect(
        service.toggleUserActiveStatus('admin-1', false, 'admin-1'),
      ).rejects.toThrow(expect.objectContaining({ status: HttpStatus.FORBIDDEN }));
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('allows admin to re-activate themselves (isActive=true skips guard)', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(makeUser({ id: 'admin-1', isActive: false }));

      await service.toggleUserActiveStatus('admin-1', true, 'admin-1');

      expect(mockUserRepo.update).toHaveBeenCalledWith('admin-1', { isActive: true });
    });

    it('throws 404 when user not found', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.toggleUserActiveStatus('bad-id', false, 'admin-99'),
      ).rejects.toThrow(NotFoundException);
    });

    it('works without requestingUserId (legacy 2-arg call from admin.controller)', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(makeUser());

      await service.toggleUserActiveStatus('user-1', false);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { isActive: false });
    });
  });

  // ── sendPasswordResetEmail ────────────────────────────────────────────────

  describe('sendPasswordResetEmail', () => {
    it('signs JWT and calls mailService.sendResetPasswordEmail', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(makeUser({ email: 'user@test.com', fullName: 'Test' }));

      await service.sendPasswordResetEmail('user-1');

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', email: 'user@test.com' }),
        expect.objectContaining({ secret: 'reset-secret' }),
      );
      expect(mockMailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        'user@test.com',
        'Test',
        expect.stringContaining('mock-reset-token'),
      );
    });

    it('throws 404 when user not found', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(service.sendPasswordResetEmail('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockMailService.sendResetPasswordEmail).not.toHaveBeenCalled();
    });
  });
});
