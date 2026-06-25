/**
 * Contract dùng chung giữa Admin và Tasker cho luồng "yêu cầu bổ sung / từ chối" KYC.
 *
 * Admin gắn cờ từng PHẦN (giấy tờ hoặc trường thông tin) cần nộp lại, kèm lý do riêng
 * cho từng phần. Toàn bộ được serialize thành JSON và lưu vào `docNote` (string) ở backend
 * — KHÔNG cần đổi schema. Tasker parse lại để hiển thị chỉ báo "cần nộp lại" ngay tại
 * từng giấy tờ / trường, thay vì chỉ một banner chung trên đầu.
 */

export interface MissingItem {
  id: string;
  label: string;
  category: "Giấy tờ" | "Thông tin cá nhân" | "Thanh toán" | "Nghề nghiệp";
  description?: string;
}

/** Danh sách chuẩn các phần admin có thể yêu cầu tasker bổ sung. Source of truth cho id → label. */
export const MISSING_ITEM_OPTIONS: MissingItem[] = [
  // Giấy tờ
  { id: "citizenCard", label: "Ảnh CCCD (2 mặt)", category: "Giấy tờ", description: "Cần rõ nét, không bị mờ" },
  { id: "idWithSelfie", label: "Ảnh selfie cầm CCCD", category: "Giấy tờ", description: "Nhìn thẳng, rõ mặt" },
  { id: "criminalRecord", label: "Lý lịch tư pháp", category: "Giấy tờ", description: "Còn hiệu lực trong 6 tháng" },
  { id: "healthCertificate", label: "Giấy khám sức khoẻ", category: "Giấy tờ", description: "Còn hiệu lực trong 12 tháng" },
  { id: "certificate", label: "Chứng chỉ nghề nghiệp", category: "Giấy tờ", description: "Liên quan đến dịch vụ đăng ký" },
  // Thông tin cá nhân
  { id: "phone", label: "Số điện thoại", category: "Thông tin cá nhân" },
  { id: "address", label: "Địa chỉ hiện tại", category: "Thông tin cá nhân" },
  // Thanh toán
  { id: "bankInfo", label: "Thông tin ngân hàng", category: "Thanh toán", description: "Tên ngân hàng, số tài khoản, chủ tài khoản" },
  // Nghề nghiệp
  { id: "experience", label: "Kinh nghiệm & kỹ năng", category: "Nghề nghiệp" },
  { id: "skills", label: "Kỹ năng cụ thể", category: "Nghề nghiệp" },
  { id: "bio", label: "Giới thiệu bản thân", category: "Nghề nghiệp" },
];

/** id → label, để fallback khi serialize không kèm sẵn itemLabels. */
export const PART_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  MISSING_ITEM_OPTIONS.map((o) => [o.id, o.label]),
);

// ─── Serialize / Deserialize ────────────────────────────────────────────────

export interface AdminNotesData {
  v: 2;
  /** id của các phần cần nộp lại (vd: "citizenCard", "phone"). */
  items: string[];
  /** Nhãn hiển thị tương ứng với items (cùng thứ tự). */
  itemLabels: string[];
  /** Lý do riêng cho từng phần: id → lý do. Có thể thiếu với note cũ. */
  itemNotes?: Record<string, string>;
  /** Ghi chú chung (tuỳ chọn / lý do từ chối tổng quát). */
  note: string;
}

/**
 * @param items   danh sách id phần cần nộp lại
 * @param note    ghi chú chung (tuỳ chọn)
 * @param itemNotes lý do riêng theo từng phần (id → lý do); chỉ giữ lại các id nằm trong `items`
 */
export function serializeAdminNotes(
  items: string[],
  note: string,
  itemNotes?: Record<string, string>,
): string {
  const itemLabels = items.map(
    (id) => MISSING_ITEM_OPTIONS.find((o) => o.id === id)?.label ?? id,
  );

  let cleanItemNotes: Record<string, string> | undefined;
  if (itemNotes) {
    const entries = items
      .map((id) => [id, itemNotes[id]?.trim() ?? ""] as const)
      .filter(([, v]) => v.length > 0);
    if (entries.length > 0) cleanItemNotes = Object.fromEntries(entries);
  }

  return JSON.stringify({
    v: 2,
    items,
    itemLabels,
    ...(cleanItemNotes ? { itemNotes: cleanItemNotes } : {}),
    note,
  } satisfies AdminNotesData);
}

export function parseAdminNotes(raw: string | undefined): AdminNotesData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // docNote là free-text persist trong DB → validate đủ shape trước khi tin tưởng,
    // tránh buildReviewParts ném lỗi khi gặp payload hỏng (vd: {"v":2} thiếu items).
    if (parsed && parsed.v === 2 && Array.isArray(parsed.items)) {
      return parsed as AdminNotesData;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Helpers cho hiển thị inline phía Tasker ───────────────────────────────────

export interface ReviewPart {
  id: string;
  label: string;
  /** Lý do riêng cho phần này (nếu admin có ghi). */
  note?: string;
}

/** Trả về danh sách các phần cần nộp lại (kèm lý do từng phần) từ chuỗi adminNotes. */
export function buildReviewParts(adminNotes: string | undefined): ReviewPart[] {
  const parsed = parseAdminNotes(adminNotes);
  if (!parsed) return [];
  return parsed.items.map((id, i) => ({
    id,
    label: parsed.itemLabels?.[i] ?? PART_LABEL_BY_ID[id] ?? id,
    note: parsed.itemNotes?.[id]?.trim() || undefined,
  }));
}

/** Map id → ReviewPart, để tra cứu nhanh khi render từng giấy tờ / trường. */
export function getReviewPartMap(
  adminNotes: string | undefined,
): Record<string, ReviewPart> {
  return Object.fromEntries(buildReviewParts(adminNotes).map((p) => [p.id, p]));
}

/** Ghi chú chung (note) của lần review gần nhất, nếu có. */
export function getReviewGeneralNote(adminNotes: string | undefined): string {
  return parseAdminNotes(adminNotes)?.note?.trim() ?? "";
}
