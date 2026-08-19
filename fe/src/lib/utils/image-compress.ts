/**
 * Nén ảnh ngay trên máy người dùng trước khi upload.
 *
 * Ảnh camera điện thoại thường 3–6MB; tasker đứng ở hiện trường với sóng yếu và có thể
 * phải gửi tới 10 tấm. Hạ về ~200–500KB làm việc upload khả thi, đồng thời không còn
 * chạm trần 5MB của POST /upload/image.
 */

export interface CompressImageOptions {
  /** Cạnh dài tối đa sau khi thu nhỏ (px). */
  maxDimension?: number;
  /** Ngưỡng dung lượng mong muốn (byte) — giảm chất lượng dần cho tới khi đạt. */
  maxSizeBytes?: number;
  /** Các mức chất lượng JPEG thử lần lượt. */
  qualitySteps?: number[];
}

const DEFAULTS: Required<CompressImageOptions> = {
  maxDimension: 1600,
  maxSizeBytes: 600 * 1024,
  qualitySteps: [0.7, 0.55, 0.45],
};

/** Kích thước đích giữ nguyên tỉ lệ; ảnh nhỏ hơn giới hạn thì không phóng to. */
export function scaleToFit(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };

  const ratio = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality),
  );
}

function replaceExtension(name: string): string {
  return `${name.replace(/\.[^.]+$/, "")}.jpg`;
}

/**
 * Trả về File đã nén. Mọi trục trặc (định dạng lạ, trình duyệt không hỗ trợ canvas,
 * decode lỗi) đều rơi về file gốc — không được chặn tasker nộp ảnh chỉ vì nén thất bại.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const { maxDimension, maxSizeBytes, qualitySteps } = {
    ...DEFAULTS,
    ...options,
  };

  if (!file.type.startsWith("image/")) return file;
  if (typeof document === "undefined") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    // `from-image` để ảnh chụp dọc không bị xoay ngang khi vẽ lên canvas.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const { width, height } = scaleToFit(
      bitmap.width,
      bitmap.height,
      maxDimension,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let best: Blob | null = null;
    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) continue;
      best = blob;
      if (blob.size <= maxSizeBytes) break;
    }

    // Ảnh gốc đã nhỏ hơn kết quả nén (ảnh chụp màn hình, PNG phẳng…) thì giữ nguyên.
    if (!best || best.size >= file.size) return file;

    return new File([best], replaceExtension(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
