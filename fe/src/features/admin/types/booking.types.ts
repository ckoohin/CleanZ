export interface CreateAdminBookingDto {
  customerId: string;
  serviceId: string;
  addressId?: string;
  scheduledDate: string;
  scheduledTime: string;
  paymentMethod: string;
  voucherCode?: string;
  taskerId?: string;
  note?: string;
  reason: string;
}

export interface AvailableTaskersQueryDto {
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface AssignTaskerDto {
  taskerId: string;
  note?: string;
}

export interface ChangeBookingStatusDto {
  status: string;
  reason: string;
}
