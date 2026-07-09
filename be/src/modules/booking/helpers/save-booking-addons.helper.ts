import { EntityManager } from 'typeorm';
import { BookingEntity } from '../entity/booking.entity';
import { BookingAddonEntity } from '../entity/booking-addon.entity';
import { ServiceAddonEntity } from 'src/modules/service/entity/service-addon.entity';

/**
 * Lưu snapshot tên/giá của các addon đã chọn tại thời điểm đặt booking,
 * để báo cáo doanh thu theo addon không bị sai khi addon sau này đổi giá/bị xoá.
 * Gọi trong cùng transaction đã tạo booking, ngay sau khi booking được save.
 */
export async function saveBookingAddons(
  manager: EntityManager,
  booking: BookingEntity,
  addons: ServiceAddonEntity[],
): Promise<void> {
  if (!addons.length) return;

  const bookingAddonRepository = manager.getRepository(BookingAddonEntity);
  const bookingAddons = addons.map((addon) =>
    bookingAddonRepository.create({
      booking,
      addonId: addon.id,
      name: addon.name,
      price: addon.price,
      priceUnit: addon.priceUnit,
    }),
  );
  await bookingAddonRepository.save(bookingAddons);
}
