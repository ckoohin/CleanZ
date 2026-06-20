import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import { User } from '../modules/users/entities/user.entity';
import { CustomerEntity } from '../modules/customer/entity/customer.entity';
import { TaskerEntity } from '../modules/tasker/entity/tasker.entity';
import { BookingEntity } from '../modules/booking/entity/booking.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { TaskerStatus } from '../common/enums/tasker-status.enum';
import { DocumentStatus } from '../common/enums/document-status.enum';
import { BookingStatus } from '../common/enums/booking-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { ServiceEntity } from 'src/modules/service/entity/service.entity';

const DEFAULT_PASSWORD = 'Password@123';

const FIRST_NAMES = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Phan',
  'Vũ',
  'Đặng',
  'Bùi',
  'Đỗ',
];
const MIDDLE_NAMES = ['Văn', 'Thị', 'Hữu', 'Đức', 'Ngọc', 'Minh', 'Thanh', 'Quang'];
const LAST_NAMES = [
  'An',
  'Bình',
  'Cường',
  'Dũng',
  'Em',
  'Phúc',
  'Giang',
  'Hà',
  'Khánh',
  'Linh',
  'Mai',
  'Nam',
  'Oanh',
  'Phương',
  'Quân',
  'Sơn',
  'Trang',
  'Uyên',
  'Vy',
  'Yến',
];

const HCMC_DISTRICTS = [
  'Quận 1',
  'Quận 3',
  'Quận 5',
  'Quận 7',
  'Quận 10',
  'Bình Thạnh',
  'Phú Nhuận',
  'Gò Vấp',
  'Tân Bình',
  'Thủ Đức',
];

const pick = <T>(arr: T[], i: number): T => arr[i % arr.length];
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const makeName = (i: number): string =>
  `${pick(FIRST_NAMES, i)} ${pick(MIDDLE_NAMES, i)} ${pick(LAST_NAMES, i)}`;

const makePhone = (i: number): string =>
  `0${String(900000000 + i).slice(0, 9)}`;

const seed = async (): Promise<void> => {
  await dataSource.initialize();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await dataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(User);
    const customerRepo = manager.getRepository(CustomerEntity);
    const taskerRepo = manager.getRepository(TaskerEntity);
    const serviceRepo = manager.getRepository(ServiceEntity);
    const bookingRepo = manager.getRepository(BookingEntity);

    // --- Service (needed so bookings reference a real serviceId) ---
    let service = await serviceRepo.findOne({
      where: { name: 'Dọn dẹp nhà theo giờ' },
    });
    if (!service) {
      service = await serviceRepo.save(
        serviceRepo.create({
          name: 'Dọn dẹp nhà theo giờ',
          description: 'Dịch vụ dọn dẹp nhà cửa tính theo giờ (dữ liệu seed)',
          baseDurationHours: 3,
          isActive: true,
        }),
      );
    }

    // --- 20 customers ---
    const customers: CustomerEntity[] = [];
    for (let i = 1; i <= 20; i++) {
      const email = `customer${i}@example.com`;
      let user = await userRepo.findOne({ where: { email } });
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            email,
            phone: makePhone(i),
            password: passwordHash,
            fullName: makeName(i),
            role: UserRole.CUSTOMER,
            provider: AuthProvider.LOCAL,
            isActive: true,
            isVerified: true,
          }),
        );
      }
      let customer = await customerRepo.findOne({
        where: { user: { id: user.id } },
        relations: { user: true },
      });
      if (!customer) {
        customer = await customerRepo.save(
          customerRepo.create({
            user,
            defaultPaymentMethod: PaymentMethod.CASH,
          }),
        );
      }
      customers.push(customer);
    }

    // --- 20 taskers ---
    const taskers: TaskerEntity[] = [];
    for (let i = 1; i <= 20; i++) {
      const email = `tasker${i}@example.com`;
      let user = await userRepo.findOne({ where: { email } });
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            email,
            phone: makePhone(100 + i),
            password: passwordHash,
            fullName: makeName(i + 3),
            role: UserRole.TASKER,
            provider: AuthProvider.LOCAL,
            isActive: true,
            isVerified: true,
          }),
        );
      }
      let tasker = await taskerRepo.findOne({
        where: { user: { id: user.id } },
        relations: { user: true },
      });
      if (!tasker) {
        tasker = await taskerRepo.save(
          taskerRepo.create({
            user,
            workingAddress: `${pick(HCMC_DISTRICTS, i)}, TP. Hồ Chí Minh`,
            bio: 'Tasker chuyên nghiệp (dữ liệu seed)',
            status: TaskerStatus.ACTIVE,
            docStatus: DocumentStatus.APPROVED,
            ratingAvg: randomInt(40, 50) / 10,
            totalCompletedJobs: randomInt(0, 120),
          }),
        );
      }
      taskers.push(tasker);
    }

    // --- 10 bookings ---
    const statuses: BookingStatus[] = [
      BookingStatus.POSTED,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
      BookingStatus.IN_PROGRESS,
      BookingStatus.CANCELLED,
    ];
    let createdBookings = 0;
    for (let i = 1; i <= 10; i++) {
      const bookingCode = `BKSEED${String(i).padStart(4, '0')}`;
      const exists = await bookingRepo.findOne({ where: { bookingCode } });
      if (exists) continue;

      const customer = pick(customers, i);
      const status = pick(statuses, i);
      const hasTasker = status !== BookingStatus.POSTED;
      const durationHours = randomInt(2, 4);
      const basePrice = durationHours * 100000;
      const addonPrice = i % 3 === 0 ? 50000 : 0;
      const totalPrice = basePrice + addonPrice;

      const day = new Date();
      day.setDate(day.getDate() + (i - 5));
      const dateStr = day.toISOString().slice(0, 10);
      const hour = 8 + (i % 8);
      const startTime = `${String(hour).padStart(2, '0')}:00:00`;
      const scheduledStart = new Date(`${dateStr}T${startTime}`);
      const scheduledEnd = new Date(
        scheduledStart.getTime() + durationHours * 3600000,
      );

      await bookingRepo.save(
        bookingRepo.create({
          bookingCode,
          customer,
          tasker: hasTasker ? pick(taskers, i) : null,
          serviceId: service.id,
          address: `${randomInt(1, 200)} Đường ${pick(HCMC_DISTRICTS, i)}, TP. Hồ Chí Minh`,
          note: i % 2 === 0 ? 'Nhà có thú cưng' : null,
          scheduledStart,
          scheduledEnd,
          scheduledStartDate: dateStr,
          scheduledStartTime: startTime,
          durationHours,
          status,
          basePrice,
          addonPrice,
          totalPrice,
          paymentMethod: PaymentMethod.CASH,
          paymentStatus:
            status === BookingStatus.COMPLETED
              ? PaymentStatus.PAID
              : PaymentStatus.PENDING,
          completedAt:
            status === BookingStatus.COMPLETED ? scheduledEnd : null,
        }),
      );
      createdBookings++;
    }

    console.log('Seed completed:');
    console.log(`  customers: ${customers.length}`);
    console.log(`  taskers:   ${taskers.length}`);
    console.log(`  bookings:  ${createdBookings} new (target 10)`);
    console.log(`  login password for all seeded accounts: ${DEFAULT_PASSWORD}`);
  });

  await dataSource.destroy();
};

void seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
