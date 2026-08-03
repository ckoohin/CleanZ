import Redis from 'ioredis';

/**
 * Cô lập hàng đợi BullMQ giữa các bộ integration test.
 *
 * VẤN ĐỀ: tên hàng đợi (`notificationQueue`, …) là hằng số toàn cục và mọi suite đều trỏ
 * vào cùng một Redis. Suite A tạo job, đóng app; job vẫn nằm lại Redis. Suite B khởi động,
 * worker của nó nhặt đúng job đó và ghi `notifications` cho user thuộc DB của A — vi phạm
 * khoá ngoại. Biểu hiện là bộ test đỏ ngẫu nhiên, không tái hiện được theo ý muốn.
 *
 * CÁCH XỬ LÝ: mỗi suite chạy dưới một prefix Redis riêng, và dọn sạch prefix đó cả trước
 * lẫn sau khi chạy. Không tắt worker — đường thật vẫn được chạy, chỉ khác không gian tên,
 * nên test vẫn phủ đúng luồng production.
 *
 * Dọn cả trước lẫn sau: nếu một lượt chạy trước bị giết giữa chừng (Ctrl-C, hết giờ), rác
 * còn lại sẽ làm hỏng lượt kế tiếp mà không ai hiểu vì sao.
 */
export function useIsolatedQueuePrefix(suiteKey: string): string {
  const prefix = `bulltest_${suiteKey}`;
  process.env.BULL_PREFIX = prefix;
  return prefix;
}

/** Xoá mọi khoá Redis thuộc prefix của suite. An toàn khi Redis không sẵn sàng. */
export async function purgeQueuePrefix(prefix: string): Promise<number> {
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    // Không để test treo chờ Redis nếu môi trường thiếu nó.
    retryStrategy: () => null,
  });

  try {
    await redis.connect();
    let cursor = '0';
    let removed = 0;
    do {
      // SCAN thay vì KEYS: KEYS khoá toàn bộ Redis, và máy dev có thể dùng chung instance
      // này cho việc khác.
      const [next, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${prefix}:*`,
        'COUNT',
        500,
      );
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
        removed += keys.length;
      }
    } while (cursor !== '0');
    return removed;
  } catch {
    // Không có Redis thì cũng không có rác để dọn — không phải lỗi của test.
    return 0;
  } finally {
    redis.disconnect();
  }
}
