/**
 * Seed dữ liệu dev: admin, customers, taskers, catalog dịch vụ, ví, bookings.
 *
 * Chạy:  node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-dev-data.ts
 *
 * Script XOÁ sạch các bảng nghiệp vụ bên dưới rồi seed lại — chỉ dùng cho DB dev.
 */
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import AppDataSource from '../data-source';

import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { TaskerStatus } from '../../common/enums/tasker-status.enum';
import { TaskerDocumentType } from '../../common/enums/type-docs-tasker.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { WalletOwnerType } from '../../common/enums/wallet-owner-type.enum';

import { User } from '../../modules/users/entities/user.entity';
import { CustomerEntity } from '../../modules/customer/entity/customer.entity';
import { CustomerAddressEntity } from '../../modules/customer/entity/customer-address.entity';
import { TaskerEntity } from '../../modules/tasker/entity/tasker.entity';
import { WalletEntity } from '../../modules/wallet/entity/wallet.entity';
import { ServicePackageEntity } from '../../modules/service/entity/service-package.entity';
import { SubServiceEntity } from '../../modules/service/entity/sub-service.entity';
import { PackageSubServiceEntity } from '../../modules/service/entity/package-sub-service.entity';
import { ServiceDurationEntity } from '../../modules/service/entity/service-duration.entity';
import { ServiceAddonEntity } from '../../modules/service/entity/service-addon.entity';
import {
  PricingTierEntity,
  PricingMode,
} from '../../modules/pricing/entity/pricing-tier.entity';
import { BookingEntity } from '../../modules/booking/entity/booking.entity';
import { BookingSubServiceEntity } from '../../modules/booking/entity/booking-sub-service.entity';

const PASSWORD = 'Password@123';

/** Bảng bị xoá trước khi seed (thứ tự không quan trọng vì dùng CASCADE). */
const TABLES_TO_RESET = [
  'booking_sub_services',
  'booking_addons',
  'booking_status_logs',
  'bookings',
  'wallet_transactions',
  'wallets',
  'customer_addresses',
  'customers',
  'taskers',
  'package_sub_services',
  'service_sub_services',
  'service_durations',
  'service_addons',
  'pricing_tiers',
  'sub_services',
  'service_packages',
  'notifications',
  'tokens',
  'users',
];

const HCM_DISTRICTS = [
  { district: 'Quận 1', ward: 'Phường Bến Nghé', lat: 10.7797, lng: 106.6996 },
  {
    district: 'Quận 3',
    ward: 'Phường Võ Thị Sáu',
    lat: 10.7803,
    lng: 106.6822,
  },
  { district: 'Quận 7', ward: 'Phường Tân Phú', lat: 10.7297, lng: 106.7215 },
  { district: 'Quận 10', ward: 'Phường 12', lat: 10.7729, lng: 106.6675 },
  { district: 'Bình Thạnh', ward: 'Phường 25', lat: 10.8039, lng: 106.7108 },
  { district: 'Gò Vấp', ward: 'Phường 10', lat: 10.8386, lng: 106.665 },
  { district: 'Phú Nhuận', ward: 'Phường 8', lat: 10.7987, lng: 106.6797 },
  {
    district: 'Thủ Đức',
    ward: 'Phường Linh Trung',
    lat: 10.8595,
    lng: 106.7716,
  },
];

const CUSTOMER_NAMES = [
  'Nguyễn Thị Lan Anh',
  'Trần Minh Khoa',
  'Lê Thị Hồng Nhung',
  'Phạm Quốc Bảo',
  'Võ Thị Mai Trâm',
  'Đặng Hoàng Nam',
  'Bùi Thị Kim Ngân',
  'Hoàng Văn Đạt',
  'Đỗ Thị Thu Hà',
  'Ngô Gia Huy',
];

const TASKER_NAMES = [
  'Nguyễn Văn Tuấn',
  'Trần Thị Bích Thuỷ',
  'Lê Hoàng Long',
  'Phạm Thị Ngọc Diệp',
  'Vũ Đình Phong',
  'Huỳnh Thị Cẩm Tú',
];

const daysAgo = (d: number, hour = 9): Date => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, 0, 0, 0);
  return t;
};

const daysAhead = (d: number, hour = 9): Date => daysAgo(-d, hour);

const pick = <T>(arr: T[], i: number): T => arr[i % arr.length];

async function seed(ds: DataSource): Promise<void> {
  const m = ds.manager;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log('→ Xoá dữ liệu cũ...');
  await ds.query(
    `TRUNCATE TABLE ${TABLES_TO_RESET.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );

  // ─── Users ────────────────────────────────────────────────────────────────
  console.log('→ Seed users...');
  const admin = await m.save(
    m.create(User, {
      email: 'admin@cleanz.vn',
      phone: '0900000001',
      password: passwordHash,
      fullName: 'Quản trị viên CleanZ',
      role: UserRole.ADMIN,
      provider: AuthProvider.LOCAL,
      isActive: true,
      isVerified: true,
    }),
  );

  const customerUsers = await m.save(
    CUSTOMER_NAMES.map((name, i) =>
      m.create(User, {
        email: `customer${i + 1}@cleanz.vn`,
        phone: `090100000${i + 1}`.slice(0, 11),
        password: passwordHash,
        fullName: name,
        role: UserRole.CUSTOMER,
        provider: AuthProvider.LOCAL,
        isActive: true,
        isVerified: true,
      }),
    ),
  );

  const taskerUsers = await m.save(
    TASKER_NAMES.map((name, i) =>
      m.create(User, {
        email: `tasker${i + 1}@cleanz.vn`,
        phone: `090200000${i + 1}`.slice(0, 11),
        password: passwordHash,
        fullName: name,
        role: UserRole.TASKER,
        provider: AuthProvider.LOCAL,
        isActive: true,
        isVerified: true,
      }),
    ),
  );

  // ─── Customers + địa chỉ ──────────────────────────────────────────────────
  console.log('→ Seed customers + địa chỉ...');
  const customers = await m.save(
    customerUsers.map((u, i) =>
      m.create(CustomerEntity, {
        user: u,
        defaultPaymentMethod:
          i % 3 === 0 ? PaymentMethod.WALLET : PaymentMethod.CASH,
        totalBookings: 0,
        totalCancelled: 0,
      }),
    ),
  );

  const addresses = await m.save(
    customers.map((c, i) => {
      const loc = pick(HCM_DISTRICTS, i);
      return m.create(CustomerAddressEntity, {
        customer: c,
        label: 'Nhà riêng',
        fullAddress: `${12 + i * 3} Đường số ${i + 1}, ${loc.ward}, ${loc.district}, TP.HCM`,
        wardDetail: loc.ward,
        latitude: loc.lat,
        longitude: loc.lng,
        isDefault: true,
        hasPet: i % 4 === 0,
        contactName: customerUsers[i].fullName,
        contactPhone: customerUsers[i].phone,
      });
    }),
  );

  // ─── Taskers ──────────────────────────────────────────────────────────────
  console.log('→ Seed taskers...');
  const taskers = await m.save(
    taskerUsers.map((u, i) => {
      const loc = pick(HCM_DISTRICTS, i);
      // 4 tasker ACTIVE (đã duyệt), 1 PENDING (chờ duyệt), 1 SUSPENDED.
      const status =
        i === 4
          ? TaskerStatus.PENDING
          : i === 5
            ? TaskerStatus.SUSPENDED
            : TaskerStatus.ACTIVE;
      const approved = status === TaskerStatus.ACTIVE;
      return m.create(TaskerEntity, {
        user: u,
        workingAddress: `${loc.ward}, ${loc.district}, TP.HCM`,
        bio: 'Nhân viên vệ sinh chuyên nghiệp, cẩn thận, đúng giờ.',
        experience: `${2 + i} năm kinh nghiệm dọn dẹp nhà ở và văn phòng`,
        skills: 'Dọn dẹp nhà, Tổng vệ sinh, Vệ sinh máy lạnh',
        status,
        ratingAvg: [4.9, 4.7, 4.8, 5.0, 5.0, 4.2][i],
        totalCompletedJobs: [128, 76, 94, 41, 0, 12][i],
        totalWorkingHours: [312.5, 190.0, 240.5, 98.0, 0, 30.0][i],
        docType: TaskerDocumentType.CITIZEN_ID,
        docIdNumber: `0790${String(2000 + i).padStart(8, '0')}`.slice(0, 12),
        docStatus: approved ? DocumentStatus.APPROVED : DocumentStatus.PENDING,
        docReviewedAt: approved ? daysAgo(60) : null,
        docReviewedBy: approved ? admin.id : null,
        banReason:
          status === TaskerStatus.SUSPENDED
            ? 'Nhiều lần huỷ đơn sát giờ'
            : null,
        bankName: 'Vietcombank',
        bankAccountNumber: `00710002${1000 + i}`,
        bankAccountName: u.fullName.toUpperCase(),
      });
    }),
  );
  const activeTaskers = taskers.filter((t) => t.status === TaskerStatus.ACTIVE);

  // ─── Ví ───────────────────────────────────────────────────────────────────
  console.log('→ Seed ví...');
  await m.save(
    m.create(WalletEntity, {
      ownerType: WalletOwnerType.SYSTEM,
      balance: 0,
      holdBalance: 0,
    }),
  );
  await m.save(
    customers.map((c, i) =>
      m.create(WalletEntity, {
        ownerType: WalletOwnerType.CUSTOMER,
        customer: c,
        balance: [
          500000, 0, 1200000, 250000, 0, 2000000, 750000, 0, 340000, 1500000,
        ][i],
        holdBalance: 0,
      }),
    ),
  );
  await m.save(
    taskers.map((t, i) =>
      m.create(WalletEntity, {
        ownerType: WalletOwnerType.TASKER,
        tasker: t,
        balance: [1850000, 920000, 1340000, 460000, 0, 120000][i],
        holdBalance: 0,
      }),
    ),
  );

  // ─── Catalog dịch vụ ──────────────────────────────────────────────────────
  console.log('→ Seed catalog dịch vụ...');
  const [pkgHourly, pkgDeep, pkgAc] = await m.save([
    m.create(ServicePackageEntity, {
      name: 'Dọn dẹp nhà theo giờ',
      packageCode: 'HOME_HOURLY',
      sortOrder: 1,
      isActive: true,
      pricingMode: PricingMode.HOURLY,
      maxHours: 8,
      baseHourlyRate: 60000,
      premiumHourlyRate: 80000,
      petSurcharge: 30000,
      waitingSurcharge: 20000,
      peakRatePercent: 20,
      policyDescription: 'Huỷ miễn phí trước 2 giờ so với giờ hẹn.',
    }),
    m.create(ServicePackageEntity, {
      name: 'Tổng vệ sinh',
      packageCode: 'DEEP_CLEAN',
      sortOrder: 2,
      isActive: true,
      pricingMode: PricingMode.AREA_HOURLY,
      maxHours: 8,
      baseHourlyRate: 90000,
      petSurcharge: 50000,
      peakRatePercent: 15,
      policyDescription: 'Áp dụng cho nhà/căn hộ cần vệ sinh sâu sau xây dựng.',
    }),
    m.create(ServicePackageEntity, {
      name: 'Vệ sinh máy lạnh',
      packageCode: 'AC_CLEAN',
      sortOrder: 3,
      isActive: true,
      pricingMode: PricingMode.FIXED,
      maxHours: 4,
      policyDescription: 'Giá cố định theo số lượng máy.',
    }),
  ]);

  const subServices = await m.save([
    m.create(SubServiceEntity, {
      subServiceCode: 'SRV-LIVING',
      name: 'Dọn phòng khách',
      shortDescription: 'Quét, lau sàn, sắp xếp gọn gàng phòng khách',
      durationHours: 1,
      pricingType: 'FIXED',
      isActive: true,
    }),
    m.create(SubServiceEntity, {
      subServiceCode: 'SRV-KITCHEN',
      name: 'Dọn bếp',
      shortDescription: 'Lau bếp, bồn rửa, hút mùi',
      durationHours: 1,
      pricingType: 'FIXED',
      isActive: true,
    }),
    m.create(SubServiceEntity, {
      subServiceCode: 'SRV-BATH',
      name: 'Vệ sinh nhà tắm',
      shortDescription: 'Cọ rửa bồn cầu, lavabo, sàn nhà tắm',
      durationHours: 1,
      pricingType: 'FIXED',
      isActive: true,
    }),
    m.create(SubServiceEntity, {
      subServiceCode: 'SRV-WINDOW',
      name: 'Lau kính',
      shortDescription: 'Lau kính cửa sổ, ban công',
      durationHours: 1.5,
      pricingType: 'FIXED',
      isActive: true,
    }),
    m.create(SubServiceEntity, {
      subServiceCode: 'SRV-SOFA',
      name: 'Giặt sofa - thảm',
      shortDescription: 'Hút bụi và giặt sofa, thảm bằng máy chuyên dụng',
      durationHours: 2,
      pricingType: 'FIXED',
      isActive: true,
    }),
    m.create(SubServiceEntity, {
      subServiceCode: 'SRV-AC-WALL',
      name: 'Máy lạnh treo tường',
      shortDescription: 'Vệ sinh dàn lạnh, dàn nóng máy treo tường',
      durationHours: 1,
      pricingType: 'UNIT',
      isActive: true,
    }),
  ]);
  const [sLiving, sKitchen, sBath, sWindow, sSofa, sAcWall] = subServices;

  await m.save([
    m.create(PackageSubServiceEntity, {
      packageId: pkgHourly.id,
      subServiceId: sLiving.id,
      isDefault: true,
      sortOrder: 1,
    }),
    m.create(PackageSubServiceEntity, {
      packageId: pkgHourly.id,
      subServiceId: sKitchen.id,
      isDefault: true,
      sortOrder: 2,
    }),
    m.create(PackageSubServiceEntity, {
      packageId: pkgHourly.id,
      subServiceId: sBath.id,
      sortOrder: 3,
    }),
    m.create(PackageSubServiceEntity, {
      packageId: pkgDeep.id,
      subServiceId: sWindow.id,
      isDefault: true,
      sortOrder: 1,
    }),
    m.create(PackageSubServiceEntity, {
      packageId: pkgDeep.id,
      subServiceId: sSofa.id,
      sortOrder: 2,
    }),
    m.create(PackageSubServiceEntity, {
      packageId: pkgAc.id,
      subServiceId: sAcWall.id,
      isRequired: true,
      isDefault: true,
      sortOrder: 1,
    }),
  ]);

  await m.save([
    m.create(PricingTierEntity, {
      packageId: pkgHourly.id,
      name: 'Ca tiêu chuẩn',
      description: 'Dọn dẹp nhà ở thông thường',
      pricingMode: PricingMode.HOURLY,
      pricePerHour: 60000,
      minHours: 2,
      maxHours: 8,
      defaultHours: 3,
      sortOrder: 1,
    }),
    m.create(PricingTierEntity, {
      packageId: pkgDeep.id,
      name: 'Nhà 30 - 60m²',
      pricingMode: PricingMode.AREA_HOURLY,
      areaMinM2: 30,
      areaMaxM2: 60,
      pricePerM2: 2000,
      minHours: 3,
      maxHours: 8,
      defaultHours: 4,
      sortOrder: 1,
    }),
    m.create(PricingTierEntity, {
      packageId: pkgDeep.id,
      name: 'Nhà 60 - 120m²',
      pricingMode: PricingMode.AREA_HOURLY,
      areaMinM2: 60,
      areaMaxM2: 120,
      pricePerM2: 1800,
      minHours: 4,
      maxHours: 8,
      defaultHours: 5,
      sortOrder: 2,
    }),
    m.create(PricingTierEntity, {
      packageId: pkgAc.id,
      name: 'Máy lạnh dưới 2HP',
      pricingMode: PricingMode.FIXED,
      fixedPrice: 250000,
      minHours: 1,
      maxHours: 4,
      defaultHours: 1,
      sortOrder: 1,
    }),
  ]);

  await m.save([
    m.create(ServiceDurationEntity, {
      packageId: pkgHourly.id,
      durationHours: 2,
      title: '2 giờ',
      description: 'Căn hộ nhỏ, 1 phòng ngủ',
      suggestedArea: 40,
    }),
    m.create(ServiceDurationEntity, {
      packageId: pkgHourly.id,
      durationHours: 3,
      title: '3 giờ',
      description: 'Căn hộ 2 phòng ngủ',
      suggestedArea: 70,
      isPopular: true,
    }),
    m.create(ServiceDurationEntity, {
      packageId: pkgHourly.id,
      durationHours: 4,
      title: '4 giờ',
      description: 'Nhà phố, nhà nhiều tầng',
      suggestedArea: 100,
    }),
    m.create(ServiceDurationEntity, {
      packageId: pkgDeep.id,
      durationHours: 4,
      title: '4 giờ',
      suggestedArea: 60,
      isPopular: true,
    }),
    m.create(ServiceDurationEntity, {
      packageId: pkgDeep.id,
      durationHours: 6,
      title: '6 giờ',
      suggestedArea: 120,
      taskerCount: 2,
    }),
  ]);

  const addons = await m.save([
    m.create(ServiceAddonEntity, {
      packageId: pkgHourly.id,
      name: 'Ủi quần áo',
      description: 'Ủi tối đa 15 món',
      price: 50000,
      durationMinutes: 30,
      maxQuantity: 1,
      sortOrder: 1,
    }),
    m.create(ServiceAddonEntity, {
      packageId: pkgHourly.id,
      name: 'Vệ sinh tủ lạnh',
      price: 80000,
      durationMinutes: 30,
      maxQuantity: 2,
      sortOrder: 2,
    }),
    m.create(ServiceAddonEntity, {
      packageId: pkgHourly.id,
      name: 'Vệ sinh máy giặt',
      price: 100000,
      durationMinutes: 45,
      maxQuantity: 1,
      sortOrder: 3,
    }),
    m.create(ServiceAddonEntity, {
      packageId: pkgDeep.id,
      name: 'Diệt khuẩn phòng',
      price: 150000,
      durationMinutes: 40,
      maxQuantity: 3,
      sortOrder: 1,
    }),
  ]);

  // ─── Bookings ─────────────────────────────────────────────────────────────
  console.log('→ Seed bookings...');
  type Plan = {
    status: BookingStatus;
    /** âm = tương lai */
    dayOffset: number;
    hour: number;
    withTasker: boolean;
    paid: boolean;
  };

  const plans: Plan[] = [
    // Đã hoàn tất (lịch sử ~2 tháng)
    ...[58, 52, 45, 40, 35, 31, 27, 22, 18, 14, 10, 7, 5, 3].map((d, i) => ({
      status: BookingStatus.COMPLETED,
      dayOffset: d,
      hour: 8 + (i % 8),
      withTasker: true,
      paid: true,
    })),
    // Đã huỷ
    ...[44, 29, 12].map((d, i) => ({
      status: BookingStatus.CANCELLED,
      dayOffset: d,
      hour: 9 + i,
      withTasker: i === 0,
      paid: false,
    })),
    // Hết hạn (không ai nhận)
    {
      status: BookingStatus.EXPIRED,
      dayOffset: 20,
      hour: 15,
      withTasker: false,
      paid: false,
    },
    // Đang diễn ra hôm nay
    {
      status: BookingStatus.IN_PROGRESS,
      dayOffset: 0,
      hour: 8,
      withTasker: true,
      paid: false,
    },
    {
      status: BookingStatus.CHECKED_IN,
      dayOffset: 0,
      hour: 10,
      withTasker: true,
      paid: false,
    },
    {
      status: BookingStatus.TASKER_ON_THE_WAY,
      dayOffset: 0,
      hour: 13,
      withTasker: true,
      paid: false,
    },
    // Sắp tới — đã có tasker nhận
    ...[1, 2, 4, 6].map((d, i) => ({
      status: BookingStatus.CONFIRMED,
      dayOffset: -d,
      hour: 9 + i,
      withTasker: true,
      paid: false,
    })),
    // Đang chờ tasker nhận
    ...[1, 2, 3, 5, 8].map((d, i) => ({
      status: BookingStatus.POSTED,
      dayOffset: -d,
      hour: 14 + (i % 4),
      withTasker: false,
      paid: false,
    })),
  ];

  const packages = [pkgHourly, pkgDeep, pkgAc];
  const bookings: BookingEntity[] = [];
  const bookingSubs: BookingSubServiceEntity[] = [];

  plans.forEach((plan, i) => {
    const customer = pick(customers, i);
    const address = addresses[customers.indexOf(customer)];
    const loc = pick(HCM_DISTRICTS, customers.indexOf(customer));
    const pkg = pick(packages, i);
    const tasker = plan.withTasker ? pick(activeTaskers, i) : null;

    const start =
      plan.dayOffset >= 0
        ? daysAgo(plan.dayOffset, plan.hour)
        : daysAhead(-plan.dayOffset, plan.hour);
    const durationHours = pkg.packageCode === 'AC_CLEAN' ? 1 : [2, 3, 4][i % 3];
    const end = new Date(start.getTime() + durationHours * 3600_000);

    let basePrice: number;
    let areaM2: number | null = null;
    if (pkg.packageCode === 'HOME_HOURLY') {
      basePrice = 60000 * durationHours;
    } else if (pkg.packageCode === 'DEEP_CLEAN') {
      areaM2 = [45, 60, 80, 110][i % 4];
      basePrice = 1800 * areaM2;
    } else {
      basePrice = 250000;
    }

    const pkgAddons = addons.filter((a) => a.packageId === pkg.id);
    const useAddon = i % 3 === 0 && pkgAddons.length > 0;
    const addon = useAddon ? pick(pkgAddons, i) : null;
    const addonPrice = addon ? Number(addon.price) : 0;
    const petFee = address.hasPet ? Number(pkg.petSurcharge) : 0;
    const discountAmount = i % 5 === 0 ? 30000 : 0;
    const totalPrice = basePrice + addonPrice + petFee - discountAmount;

    const seq = String(i + 1).padStart(4, '0');
    const codeDate = `${String(start.getFullYear()).slice(2)}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}`;

    const booking = m.create(BookingEntity, {
      bookingCode: `BK${codeDate}${seq}`,
      customer,
      tasker,
      packageId: pkg.id,
      address: address.fullAddress,
      district: loc.district,
      addressRef: address,
      latitude: loc.lat,
      longitude: loc.lng,
      note: i % 4 === 0 ? 'Nhà có trẻ nhỏ, vui lòng bấm chuông nhẹ.' : null,
      scheduledStart: start,
      scheduledEnd: end,
      scheduledStartDate: start.toISOString().slice(0, 10),
      scheduledStartTime: `${String(plan.hour).padStart(2, '0')}:00:00`,
      scheduledEndDate: end.toISOString().slice(0, 10),
      scheduledEndTime: `${String(end.getHours()).padStart(2, '0')}:00:00`,
      durationHours,
      areaM2,
      addonIds: addon ? [addon.id] : null,
      status: plan.status,
      basePrice,
      addonPrice,
      petFee,
      discountAmount,
      totalPrice,
      // Seed insert thẳng vào DB, không đi qua service nên không có bút toán ký quỹ.
      // Dùng CASH để dữ liệu mẫu không tạo ra đơn WALLET "đã trả" mà ví lại không hụt.
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: plan.paid ? PaymentStatus.PAID : PaymentStatus.PENDING,
      checkedInAt:
        plan.status === BookingStatus.COMPLETED ||
        plan.status === BookingStatus.IN_PROGRESS ||
        plan.status === BookingStatus.CHECKED_IN
          ? start
          : null,
      completedAt: plan.status === BookingStatus.COMPLETED ? end : null,
      cancelledAt:
        plan.status === BookingStatus.CANCELLED
          ? new Date(start.getTime() - 3600_000)
          : null,
      createdAt: new Date(start.getTime() - 3 * 24 * 3600_000),
    });
    bookings.push(booking);
  });

  const savedBookings = await m.save(bookings);

  savedBookings.forEach((b, i) => {
    const pkg = packages.find((p) => p.id === b.packageId)!;
    const subs =
      pkg.packageCode === 'HOME_HOURLY'
        ? [sLiving, sKitchen]
        : pkg.packageCode === 'DEEP_CLEAN'
          ? [sWindow, sSofa]
          : [sAcWall];
    subs.forEach((s, j) => {
      bookingSubs.push(
        m.create(BookingSubServiceEntity, {
          bookingId: b.id,
          subServiceId: s.id,
          price: j === 0 ? Number(b.basePrice) : 0,
          durationHours: Number(s.durationHours ?? 1),
          quantity: 1,
          isDefault: true,
          isSelected: true,
        }),
      );
    });
    void i;
  });
  await m.save(bookingSubs);

  // Cập nhật thống kê customer cho khớp bookings.
  for (const c of customers) {
    const mine = savedBookings.filter((b) => b.customer?.id === c.id);
    c.totalBookings = mine.length;
    c.totalCancelled = mine.filter(
      (b) => b.status === BookingStatus.CANCELLED,
    ).length;
  }
  await m.save(customers);

  console.log('\n✅ Seed xong:');
  console.table({
    admin: 1,
    customers: customers.length,
    taskers: `${taskers.length} (${activeTaskers.length} ACTIVE)`,
    'service packages': packages.length,
    'sub services': subServices.length,
    addons: addons.length,
    bookings: savedBookings.length,
    wallets: 1 + customers.length + taskers.length,
  });
  console.log(`\n🔑 Mật khẩu cho MỌI tài khoản: ${PASSWORD}`);
  console.log(
    '   admin@cleanz.vn | customer1..10@cleanz.vn | tasker1..6@cleanz.vn\n',
  );
}

AppDataSource.initialize()
  .then(async (ds) => {
    await seed(ds);
    await ds.destroy();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed thất bại:', err);
    process.exit(1);
  });
