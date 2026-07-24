import { BadRequestException } from '@nestjs/common';
import { assertValidCustomerDuration } from './customer-duration.helper';

describe('customer duration', () => {
  it.each([1, 1.25, 1.5, 1.75, 2])(
    'chấp nhận thời lượng %sh',
    (durationHours) => {
      expect(() => assertValidCustomerDuration(durationHours)).not.toThrow();
    },
  );

  it('giữ tương thích khi caller cũ không truyền durationHours', () => {
    expect(() => assertValidCustomerDuration(undefined)).not.toThrow();
  });

  it.each([0.5, 0.75])(
    'từ chối thời lượng dưới 1 giờ: %sh',
    (durationHours) => {
      expect(() => assertValidCustomerDuration(durationHours)).toThrow(
        new BadRequestException('Thời lượng dịch vụ tối thiểu là 1 giờ'),
      );
    },
  );

  it.each([1.1, 1.2, 1.3])(
    'từ chối thời lượng không nằm trên bước 15 phút: %sh',
    (durationHours) => {
      expect(() => assertValidCustomerDuration(durationHours)).toThrow(
        new BadRequestException(
          'Thời lượng dịch vụ phải tăng theo mỗi 15 phút',
        ),
      );
    },
  );
});
