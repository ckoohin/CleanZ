import { BadRequestException } from '@nestjs/common';

export const CUSTOMER_MIN_DURATION_MINUTES = 60;
export const CUSTOMER_DURATION_STEP_MINUTES = 15;

/**
 * Customer được tự chọn thời lượng theo block 15 phút, bắt đầu từ 1 giờ.
 *
 * DTO vẫn để `durationHours` optional để giữ tương thích với các caller cũ
 * vốn lấy thời lượng mặc định từ cấu hình gói. Khi customer chủ động gửi giá
 * trị này, BE phải là source of truth thay vì chỉ dựa vào giới hạn trên FE.
 */
export function assertValidCustomerDuration(
  durationHours: number | undefined,
): void {
  if (durationHours === undefined) {
    return;
  }

  const rawMinutes = durationHours * 60;
  const durationMinutes = Math.round(rawMinutes);
  if (
    !Number.isFinite(rawMinutes) ||
    Math.abs(rawMinutes - durationMinutes) > Number.EPSILON
  ) {
    throw new BadRequestException('Thời lượng dịch vụ không hợp lệ');
  }

  if (durationMinutes < CUSTOMER_MIN_DURATION_MINUTES) {
    throw new BadRequestException('Thời lượng dịch vụ tối thiểu là 1 giờ');
  }

  if (durationMinutes % CUSTOMER_DURATION_STEP_MINUTES !== 0) {
    throw new BadRequestException(
      'Thời lượng dịch vụ phải tăng theo mỗi 15 phút',
    );
  }
}
