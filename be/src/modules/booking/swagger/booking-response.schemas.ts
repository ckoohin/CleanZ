const nullableString = { type: 'string', nullable: true };
const money = { type: 'number', example: 180000 };

const serviceSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Dọn dẹp' },
    description: nullableString,
  },
};

const scheduleSchema = {
  type: 'object',
  properties: {
    scheduledStartDate: { type: 'string', example: '2026-06-20' },
    scheduledStartTime: { type: 'string', example: '14:00:00' },
    scheduledEndDate: { type: 'string', example: '2026-06-20' },
    scheduledEndTime: { type: 'string', example: '17:00:00' },
    durationHours: { type: 'number', example: 3 },
  },
};

const priceSchema = {
  type: 'object',
  properties: {
    basePrice: money,
    addonPrice: { type: 'number', example: 0 },
    peakFee: { type: 'number', example: 18000 },
    petFee: { type: 'number', example: 30000 },
    waitingFee: { type: 'number', example: 0 },
    discountAmount: { type: 'number', example: 20000 },
    subtotal: { type: 'number', example: 228000 },
    totalPrice: { type: 'number', example: 208000 },
  },
};

const distanceSchema = {
  type: 'object',
  nullable: true,
  properties: {
    meters: { type: 'number', example: 2400 },
    kilometers: { type: 'number', example: 2.4 },
  },
};

export const CUSTOMER_BOOKING_QUOTE_SCHEMA = {
  type: 'object',
  properties: {
    service: serviceSchema,
    address: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', nullable: true },
        fullAddress: { type: 'string' },
        hasPet: { type: 'boolean' },
      },
    },
    schedule: scheduleSchema,
    price: priceSchema,
    voucher: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid' },
        code: { type: 'string', example: 'WELCOME50' },
        name: { type: 'string' },
      },
    },
  },
};

export const CUSTOMER_BOOKING_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    bookingCode: { type: 'string', example: 'BK202606190001' },
    status: {
      type: 'string',
      enum: [
        'POSTED',
        'CONFIRMED',
        'TASKER_ON_THE_WAY',
        'CHECKED_IN',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED',
      ],
    },
    service: serviceSchema,
    address: { type: 'object' },
    schedule: scheduleSchema,
    price: priceSchema,
    payment: { type: 'object' },
    voucher: { type: 'object', nullable: true },
    tasker: { type: 'object', nullable: true },
    statusLogs: { type: 'array', items: { type: 'object' } },
    note: nullableString,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const CUSTOMER_ACTIVE_BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    booking: {
      ...CUSTOMER_BOOKING_DETAIL_SCHEMA,
      nullable: true,
    },
  },
};

export const TASKER_POSTED_BOOKING_LIST_SCHEMA = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 1 },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          bookingCode: { type: 'string' },
          status: { type: 'string', example: 'POSTED' },
          service: serviceSchema,
          area: {
            type: 'object',
            properties: { displayAddress: nullableString },
          },
          schedule: scheduleSchema,
          price: priceSchema,
          flags: {
            type: 'object',
            properties: { hasPet: { type: 'boolean' } },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

export const TASKER_POSTED_BOOKING_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    distance: distanceSchema,
    service: serviceSchema,
    price: priceSchema,
    schedule: scheduleSchema,
  },
};

export const TASKER_ACCEPT_BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    bookingCode: { type: 'string' },
    status: { type: 'string', example: 'CONFIRMED' },
    tasker: { type: 'object' },
    schedule: scheduleSchema,
  },
};

export const TASKER_ASSIGNED_BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    bookingCode: { type: 'string' },
    status: { type: 'string' },
    canContactCustomer: { type: 'boolean' },
    service: serviceSchema,
    distance: distanceSchema,
    area: { type: 'object' },
    address: { type: 'object' },
    schedule: scheduleSchema,
    price: priceSchema,
    payment: { type: 'object' },
    customer: { type: 'object' },
    note: nullableString,
    flags: { type: 'object' },
    checkedInAt: { type: 'string', format: 'date-time', nullable: true },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const EXPIRE_OVERDUE_BOOKINGS_SCHEMA = {
  type: 'object',
  properties: {
    expiredCount: { type: 'integer', example: 2 },
    bookingIds: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
    },
  },
};
