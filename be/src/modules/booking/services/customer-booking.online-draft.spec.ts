import { CreateBookingDto } from '../dto/create-booking.dto';
import {
  buildPayosDescription,
  isSameBookingRequest,
} from './customer-booking.service';

/**
 * Đơn nháp ONLINE: khách trả tiền TRƯỚC rồi booking mới được tạo. Mọi lỗi trong cửa
 * sổ đó đều là sự cố tiền bạc, nên các bất biến dưới đây phải được giữ.
 */
describe('đơn nháp ONLINE — tái dùng đơn nháp', () => {
  const base = {
    packageId: 'pkg-1',
    addressId: 'addr-1',
    scheduledDate: '2026-08-10',
    scheduledTime: '09:00',
    durationHours: 3,
    addonIds: ['a1', 'a2'],
    note: 'Lau kỹ ban công',
    paymentMethod: 'ONLINE',
  } as unknown as CreateBookingDto;

  const payloadOf = (dto: CreateBookingDto): unknown =>
    JSON.parse(JSON.stringify({ ...dto, quoteId: undefined }));

  it('cùng yêu cầu thì tái dùng, kể cả khi thứ tự khoá khác nhau', () => {
    // Payload đi qua JSONB nên thứ tự khoá không được phép ảnh hưởng kết quả.
    const shuffled = {
      paymentMethod: 'ONLINE',
      note: 'Lau kỹ ban công',
      addonIds: ['a1', 'a2'],
      durationHours: 3,
      scheduledTime: '09:00',
      scheduledDate: '2026-08-10',
      addressId: 'addr-1',
      packageId: 'pkg-1',
    } as unknown as CreateBookingDto;

    expect(isSameBookingRequest(payloadOf(shuffled), base)).toBe(true);
  });

  it('bỏ qua quoteId — nó đã bị tiêu khi tạo đơn nháp', () => {
    const withQuote = { ...base, quoteId: 'q-123' } as CreateBookingDto;
    expect(isSameBookingRequest(payloadOf(base), withQuote)).toBe(true);
  });

  it('KHÔNG tái dùng khi đổi ngày, dù giá y hệt', () => {
    // Chính là lỗi #1: hai đơn khác lịch vẫn có thể cùng giá. Nếu chỉ so totalPrice
    // thì khách trả tiền cho đơn thứ 7 mà nhận về đơn thứ 5.
    const otherDate = {
      ...base,
      scheduledDate: '2026-08-12',
    } as CreateBookingDto;
    expect(isSameBookingRequest(payloadOf(base), otherDate)).toBe(false);
  });

  it('KHÔNG tái dùng khi đổi địa chỉ', () => {
    const otherAddress = { ...base, addressId: 'addr-2' } as CreateBookingDto;
    expect(isSameBookingRequest(payloadOf(base), otherAddress)).toBe(false);
  });

  it('KHÔNG tái dùng khi chỉ đổi ghi chú — booking dựng từ payload cũ', () => {
    // Ghi chú không đổi giá nên hash giá sẽ trùng; vẫn phải ra đơn nháp mới vì
    // booking thật được dựng lại từ payload đã lưu.
    const otherNote = {
      ...base,
      note: 'Không cần lau ban công',
    } as CreateBookingDto;
    expect(isSameBookingRequest(payloadOf(base), otherNote)).toBe(false);
  });

  it('KHÔNG tái dùng khi đổi người làm được chỉ định', () => {
    const preferred = {
      ...base,
      preferredTaskerId: 'tk-9',
    } as CreateBookingDto;
    expect(isSameBookingRequest(payloadOf(base), preferred)).toBe(false);
  });

  it('KHÔNG tái dùng khi đổi số điện thoại liên hệ', () => {
    const contact = { ...base, contactPhone: '0900000000' } as CreateBookingDto;
    expect(isSameBookingRequest(payloadOf(base), contact)).toBe(false);
  });

  it('payload rỗng/hỏng thì không bao giờ tái dùng', () => {
    expect(isSameBookingRequest(null, base)).toBe(false);
    expect(isSameBookingRequest(undefined, base)).toBe(false);
  });
});

describe('đơn nháp ONLINE — nội dung chuyển khoản', () => {
  it('khớp đúng chuỗi PayOS ký vào QR', () => {
    expect(buildPayosDescription(123456789)).toBe('CleanZ 123456789');
  });

  it('không vượt 25 ký tự — giới hạn của PayOS', () => {
    expect(buildPayosDescription(999999999).length).toBeLessThanOrEqual(25);
  });
});
