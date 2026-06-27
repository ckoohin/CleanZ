
export const TICKET_STATUS = [
  'NEW',
  'IN_PROGRESS',
  'PENDING',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];

export const TICKET_CATEGORY = [
  'SERVICE_QUALITY',
  'TASKER_BEHAVIOR',
  'SCHEDULING',
  'PROPERTY_DAMAGE',
  'PAYMENT_BILLING',
  'ACCOUNT_TECHNICAL',
  'APPEAL',
  'OTHER',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORY)[number];

export const TICKET_PRIORITY = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const;
export type TicketPriority = (typeof TICKET_PRIORITY)[number];

export const PENDING_REASON = [
  'WAIT_CUSTOMER',
  'WAIT_TASKER',
  'WAIT_INTERNAL',
] as const;
export type PendingReason = (typeof PENDING_REASON)[number];

export const RESOLUTION_TYPE = [
  'EXPLANATION',
  'RECLEAN',
  'VOUCHER',
  'REFUND',
  'COMPENSATION',
  'TASKER_PENALTY',
] as const;
export type ResolutionType = (typeof RESOLUTION_TYPE)[number];

export const TICKET_SOURCE = [
  'CUSTOMER_APP',
  'TASKER_APP',
  'TASKER_APPEAL',
  'ADMIN',
] as const;
export type TicketSource = (typeof TICKET_SOURCE)[number];

export const MONEY_RESOLUTION_TYPES: ResolutionType[] = [
  'REFUND',
  'COMPENSATION',
  'TASKER_PENALTY',
];

export const NO_BOOKING_CATEGORIES: TicketCategory[] = [
  'ACCOUNT_TECHNICAL',
  'APPEAL',
  'OTHER',
];
