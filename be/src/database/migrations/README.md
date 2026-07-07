# Migrations — Baseline Reset (P0.1)

## Bối cảnh
Trước đây schema gốc được tạo bằng `synchronize` (không có migration baseline), nên `migration:run`
trên **DB rỗng** fail ngay (ALTER bảng chưa tồn tại; thứ tự AutoMigration chồng chéo). Không deploy
production được.

## Giải pháp
`1782000000000-BaselineSchema.ts` = **toàn bộ schema hiện tại** (63 bảng, 45 enum) sinh từ
`pg_dump --schema-only` DB dev (nguồn chuẩn), đã loại bảng `migrations` + sequence + meta-command psql.
Chạy **đầu tiên** trên DB rỗng để dựng schema.

Toàn bộ migration cũ (47 file) được chuyển vào `_archive/` (ngoài glob `*.ts` → không chạy lại).
Nội dung của chúng đã nằm trong baseline.

## Quy tắc từ nay
- **Fresh DB (production):** `npm run migration:run` → chạy baseline → đủ schema. Migration incremental
  mới (timestamp > 1782000000000) chạy tiếp sau.
- **DB dev/đang có schema:** baseline đã được đánh dấu applied trong bảng `migrations` (không chạy lại).
- **Tạo migration mới:** `npm run migration:generate` như bình thường; timestamp tự > baseline.
- **KHÔNG** sửa/ xoá baseline. Nếu cần rebase schema lần nữa: dump lại từ DB chuẩn, thay baseline,
  archive các incremental đã gộp.
- `_archive/` giữ lịch sử cũ để tham chiếu; không đưa lại vào glob.

## Kiểm chứng
Fresh DB → `runMigrations` → baseline → 64 bảng (63 + bảng `migrations`), không lỗi. CI nên có bước
"tạo DB rỗng → migrate → boot app" để chặn hồi quy.
