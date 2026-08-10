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

## Runbook: chạy migration trên `cleanz-postgres-1`

Các lệnh dưới đây phải chạy từ thư mục gốc của repository:

```bash
cd /home/luuhanh/workspace/CleanZ
```

Runbook này chỉ áp dụng migration vào PostgreSQL chạy trong container
`cleanz-postgres-1`. Nó không áp dụng migration vào Supabase hoặc database mà
backend production đang kết nối.

### 1. Kiểm tra database backend đang sử dụng

Không chạy migration trước khi biết chính xác database đích:

```bash
docker compose exec -T backend node -e \
  'const e=process.env; console.log({ DB_HOST:e.DB_HOST, DB_PORT:e.DB_PORT, DB_DATABASE:e.DB_DATABASE })'
```

- `DB_HOST: postgres`: backend đang dùng PostgreSQL trong Docker Compose.
- Host Supabase hoặc host khác: backend không dùng `cleanz-postgres-1`.

Các lệnh ở bước 3 và 4 vẫn ép `DB_HOST=postgres`, vì vậy chúng chỉ tác động
đến `cleanz-postgres-1`.

### 2. Khởi động và kiểm tra PostgreSQL Docker

```bash
docker start cleanz-postgres-1

docker exec cleanz-postgres-1 sh -lc \
  'pg_isready -U "$DB_USERNAME" -d "$DB_DATABASE"'
```

Chỉ tiếp tục khi kết quả có `accepting connections`.

Nếu container không tồn tại, chỉ dùng `docker compose up -d postgres` khi
`docker-compose.yml` hiện tại thực sự có service `postgres`. Không dùng
`--remove-orphans`: ở một số branch, `cleanz-postgres-1` là orphan vì service
PostgreSQL không còn nằm trong file Compose hiện tại.

### 3. Xem migration pending

Máy host cần có dependencies trong `be/node_modules`. Nếu chưa có:

```bash
cd be
npm ci
cd ..
```

Sau đó kiểm tra migration:

```bash
docker compose run --rm --no-deps \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -v "$PWD/be:/usr/src/app" \
  -w /usr/src/app \
  backend npm run migration:show
```

- `[X]`: migration đã chạy.
- `[ ]`: migration đang pending.

Đọc tên và nội dung các migration `[ ]` trước khi tiếp tục. Nếu danh sách
không đúng dự kiến thì dừng, không chạy `migration:run`.

### 4. Chạy migration pending

```bash
docker compose run --rm --no-deps \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -v "$PWD/be:/usr/src/app" \
  -w /usr/src/app \
  backend npm run migration:run
```

TypeORM chạy từng migration trong transaction. Chỉ coi là thành công khi log
có tên migration, `has been executed successfully` và `COMMIT`.

### 5. Xác minh sau migration

Chạy lại đúng lệnh `migration:show` ở bước 3. Kết quả hợp lệ khi tất cả
migration đều là `[X]` và không còn dòng `[ ]`.

Kiểm tra container vẫn hoạt động:

```bash
docker inspect cleanz-postgres-1 \
  --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}'
```

Kết quả mong đợi là `running healthy`.

### Lưu ý an toàn

- Không chạy trực tiếp `npm run migration:run` trên host nếu `be/.env` đang
  trỏ tới Supabase hoặc production.
- Không sửa bảng thủ công để thay cho migration.
- Không chạy `migration:generate` trong quy trình deploy.
- Backup database trước khi chạy migration trên production.
- Không đưa mật khẩu database hoặc toàn bộ nội dung `.env` vào log.

## Nhật ký kiểm toán (audit) — 5 migration, không được gộp

| Timestamp | Nội dung |
|---|---|
| `1787800000000` | Cột ngữ nghĩa cho `admin_activity_logs` (`action_code`, `severity`, `reason`, `correlation_id`…) |
| `1787900000000` | `audit_correlation_id` trên 6 bảng hệ quả |
| `1788000000000` | Bảng `audit_outbox` |
| `1788100000000` | `audit_outbox.occurred_at` |
| `1788200000000` | Trigger append-only + `actor_type` trên 3 bảng lịch sử |

### `1788100000000` PHẢI giữ riêng, đừng gộp vào `1788000000000`

Cột `occurred_at` xuất hiện ở **cả hai** file: trong `CREATE TABLE` của
`1788000000000` (cho DB mới) và trong một `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
của `1788100000000` (cho DB đã chạy file trước).

Trùng lặp này là **có chủ đích**. `1788000000000` đã được ghi vào bảng `migrations`
ở môi trường dev trước khi cột được thêm, và **TypeORM bỏ qua trọn vẹn một
migration đã chạy** — thêm bao nhiêu câu lệnh vào đó cũng không bao giờ được thực
thi, kể cả câu lệnh idempotent. Gộp lại sẽ khiến mọi DB đã apply `1788000000000`
vĩnh viễn thiếu cột, và lỗi chỉ lộ ra khi ứng dụng ghi outbox lần đầu.

Bài học chung: *SQL idempotent* và *migration chạy lại được* là hai chuyện khác
nhau — cái sau không tồn tại. Cần sửa một migration đã phát hành thì luôn phải
thêm file mới.

### Trigger `audit_log_guard`

`1788200000000` gắn trigger chặn `UPDATE` trên `admin_activity_logs` và chặn
`DELETE` với bản ghi chưa quá 12 tháng. Hệ quả cần biết:

- Job dọn theo hạn (`AuditRetentionService`) vẫn xoá được phần đã quá hạn.
- Muốn sửa/xoá thủ công để vá dữ liệu thì phải `ALTER TABLE ... DISABLE TRIGGER`
  trước — ma sát này là cố ý.
- Hạn 12 tháng được viết cứng trong hàm trigger. Đổi hạn lưu trữ phải sửa **cả**
  hàm này lẫn `MIN_RETENTION_MONTHS` trong `audit-retention.service.ts`.
