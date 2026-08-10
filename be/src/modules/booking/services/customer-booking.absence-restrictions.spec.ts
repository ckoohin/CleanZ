import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { CustomerDebtEntity } from 'src/modules/wallet/entity/customer-debt.entity';
import { BookingAbsenceReportEntity } from '../entity/booking-absence-report.entity';
import { CustomerBookingService } from './customer-booking.service';

function makeService(): CustomerBookingService {
  const blank = {} as never;
  return new CustomerBookingService(
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
  );
}

function makeManager(outstandingDebt: number, approvedCount: number) {
  return {
    getRepository: (entity: { name?: string }) => {
      if (entity?.name === CustomerEntity.name) {
        const qb: Record<string, unknown> = {};
        for (const method of ['setLock', 'where']) qb[method] = () => qb;
        qb.getOneOrFail = () => Promise.resolve({ id: 'customer-1' });
        return { createQueryBuilder: () => qb };
      }
      if (entity?.name === CustomerDebtEntity.name) {
        const qb: Record<string, unknown> = {};
        for (const method of ['select', 'where', 'andWhere']) {
          qb[method] = () => qb;
        }
        qb.getRawOne = () =>
          Promise.resolve({ total: String(outstandingDebt) });
        return { createQueryBuilder: () => qb };
      }
      if (entity?.name === BookingAbsenceReportEntity.name) {
        return { count: () => Promise.resolve(approvedCount) };
      }
      throw new Error(`Unexpected repository ${entity?.name}`);
    },
  } as never;
}

const assertAllowed = (
  service: CustomerBookingService,
  manager: ReturnType<typeof makeManager>,
  paymentMethod: PaymentMethod,
): Promise<void> =>
  (
    service as unknown as {
      assertAbsenceBookingAllowed: (
        manager: ReturnType<typeof makeManager>,
        customerId: string,
        paymentMethod: PaymentMethod,
      ) => Promise<void>;
    }
  ).assertAbsenceBookingAllowed(manager, 'customer-1', paymentMethod);

const getRestrictions = (
  service: CustomerBookingService,
  manager: ReturnType<typeof makeManager>,
) =>
  (
    service as unknown as {
      getAbsenceRestrictionsForCustomer: (
        manager: ReturnType<typeof makeManager>,
        customerId: string,
      ) => Promise<{
        outstandingDebt: number;
        hasApprovedAbsence: boolean;
        allBookingsBlocked: boolean;
        cashBlocked: boolean;
      }>;
    }
  ).getAbsenceRestrictionsForCustomer(manager, 'customer-1');

describe('CustomerBookingService absence restrictions', () => {
  const service = makeService();

  it.each([PaymentMethod.CASH, PaymentMethod.WALLET, PaymentMethod.ONLINE])(
    'còn nợ thì chặn mọi đơn %s và trả đúng mã/số nợ',
    async (paymentMethod) => {
      try {
        await assertAllowed(service, makeManager(70_000, 1), paymentMethod);
        throw new Error('Expected restriction error');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toEqual(
          expect.objectContaining({
            code: 'CUSTOMER_ABSENCE_DEBT_OUTSTANDING',
            outstandingDebt: 70_000,
          }),
        );
      }
    },
  );

  it('đã tất toán nợ thì cho phép CASH dù từng có báo cáo APPROVED', async () => {
    const manager = makeManager(0, 1);
    await expect(
      assertAllowed(service, manager, PaymentMethod.CASH),
    ).resolves.toBeUndefined();
    await expect(
      assertAllowed(service, manager, PaymentMethod.WALLET),
    ).resolves.toBeUndefined();
    await expect(
      assertAllowed(service, manager, PaymentMethod.ONLINE),
    ).resolves.toBeUndefined();
    await expect(getRestrictions(service, manager)).resolves.toEqual({
      outstandingDebt: 0,
      hasApprovedAbsence: true,
      allBookingsBlocked: false,
      cashBlocked: false,
    });
  });

  it('không nợ và chưa có APPROVED thì cho phép mọi phương thức', async () => {
    const manager = makeManager(0, 0);
    await expect(
      assertAllowed(service, manager, PaymentMethod.CASH),
    ).resolves.toBeUndefined();
  });
});
