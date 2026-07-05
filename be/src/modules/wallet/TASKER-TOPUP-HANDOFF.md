# HANDOFF — Mô hình 1 ví + Nạp tiền PayPal (Tasker)

> Trạng thái: **ĐÃ CODE XONG BACKEND** (build + lint pass). FE còn việc phải làm (§8).
> Thay thế thiết kế 2 túi trong `TASKER-TOPUP-SPEC.md` — chốt cuối là **MÔ HÌNH 1 VÍ**.

## 1. Quyết định cuối (chốt)

- **Bỏ hệ ký quỹ 2 túi.** Tasker giờ chỉ có **1 ví** duy nhất (`WalletEntity.balance`) — nạp được, rút được, dùng chung.
- **Điều kiện nhận đơn tiền mặt:** ví phải có `>= max(số dư tối thiểu, hoa hồng đơn đó)`. Số dư tối thiểu để trong `system_configs` key `TASKER_MIN_WALLET_BALANCE` (mặc định **50.000đ**). Dùng `max` để ví không bao giờ âm khi trừ hoa hồng lúc hoàn thành đơn.
- **Nạp tiền qua PayPal.** PayPal **không hỗ trợ VND** ⇒ quy đổi VND→USD theo tỷ giá cấu hình, tính USD trên PayPal, cộng lại VND vào ví. Lưu `amount_vnd`, `amount_usd`, `fx_rate` để đối soát.
- **Tiền ký quỹ cũ** của tasker được **migration dồn hết vào ví** (kèm bút toán ADJUSTMENT truy vết).

## 2. Chia 2 giai đoạn

- **G1 — Mô hình 1 ví** (tự chạy, không cần PayPal): đổi luật nhận đơn + nguồn trừ hoa hồng sang 1 ví, xoá hệ ký quỹ, migration dồn tiền + seed config.
- **G2 — Nạp tiền PayPal**: entity `wallet_topups`, cổng PayPal, service + endpoints.

---

## 3. Thay đổi Backend (theo file)

### G1
- `modules/system-config/system-config.keys.ts` — thêm key `TASKER_MIN_WALLET_BALANCE` + hằng `TASKER_MIN_WALLET_BALANCE_DEFAULT = 50000`.
- `modules/system-config/system-config.service.ts` — thêm `getOptionalNumber(manager, key, default)` (đọc số có fallback).
- `modules/wallet/wallet.service.ts` — **chủ lực**:
  - Inject `SystemConfigService`.
  - `assertCanCoverCashCommission(manager, taskerId, commissionAmount)` — kiểm tra ví `>= max(min, fee)`.
  - `deductCashCommission(manager, taskerId, booking, commissionAmount)` — trừ ví qua `debitWallet(PLATFORM_FEE)`.
  - Bỏ 3 field ký quỹ khỏi `WalletResponse` + `mapWallet`.
- `modules/wallet/wallet.module.ts` — import `SystemConfigModule`; bỏ `TaskerDepositService` + entity ký quỹ.
- `modules/wallet/wallet.controller.ts` — **xoá 3 endpoint ký quỹ** (xem §5).
- **ĐÃ XOÁ:** `tasker-deposit.service.ts`, `entity/tasker-deposit-transaction.entity.ts`, `common/enums/tasker-deposit-transaction-type.enum.ts`.
- `modules/booking/services/tasker-booking.service.ts` — 2 call site đổi `taskerDepositService.*` → `walletService.*`; bỏ injection.
- `modules/admin/repositories/admin-booking.repository.ts` — 3 call site đổi sang `walletService.*`; query "tasker khả dụng" bỏ cột cọc (chỉ còn `wallet.balance >= fee`); response `financialCapacity` bỏ `depositBalance`.
- `modules/tasker/tasker.service.ts` — bỏ `depositAmount`/`currentDepositBalance` khỏi `stats`.
- `modules/tasker/entity/tasker.entity.ts` — xoá cột `deposit_amount`, `current_deposit_balance`, `deposit_topup_due`.
- `modules/incident/services/incident-decision.service.ts` — cap "Tasker chịu" giờ so với **số dư ví** (không phải cọc).
- `modules/incident/services/incident-admin.service.ts` + `dto/incident-response.dto.ts` — view admin đổi `currentDepositBalance/availableDeposit` → `walletBalance/availableFunds`, nạp từ ví.

### G2
- `common/enums/topup-status.enum.ts`, `common/enums/topup-provider.enum.ts` — enum mới.
- `modules/wallet/entity/wallet-topup.entity.ts` — bảng `wallet_topups`.
- `modules/wallet/gateways/payment-gateway.interface.ts` — interface `PaymentGateway` + token `PAYMENT_GATEWAY`.
- `modules/wallet/gateways/paypal.gateway.ts` — PayPal REST (OAuth, create/get/capture order, verify webhook) qua `fetch`, đọc env qua `ConfigService`.
- `modules/wallet/wallet-topup.service.ts` — tạo đơn, verify-by-API, webhook, **cộng ví idempotent** (lock hàng topup + check status; unique `provider_order_id`).
- `modules/wallet/dto/create-topup.dto.ts`, `dto/topup-list-query.dto.ts`.
- `modules/wallet/wallet.controller.ts` — thêm 5 endpoint topup.
- `modules/wallet/wallet.module.ts` — đăng ký `WalletTopupEntity`, `WalletTopupService`, `{ provide: PAYMENT_GATEWAY, useClass: PayPalGateway }`.

---

## 4. Database — migrations

Chạy tự động khi boot (`migrationsRun: true`), hoặc thủ công `npm run migration:run`.

- `1782500000000-WalletSingleModelAndTopups.ts` — **1 file gộp cả 2 phần**:
  - **A. Mô hình 1 ví:** dồn `current_deposit_balance` → `wallets.balance` (+ bút toán ADJUSTMENT `reference_type='DEPOSIT_MIGRATION'`), drop 3 cột cọc + bảng `tasker_deposit_transactions` + enum, seed `TASKER_MIN_WALLET_BALANCE=50000`. Idempotent (guard cột tồn tại).
  - **B. Nạp tiền:** tạo enum `topup_provider`/`topup_status` + bảng `wallet_topups` + index (unique `provider_order_id`).

> ⚠️ DB dùng migration, KHÔNG synchronize. Xem memory `project-db-migration-workflow` nếu gặp lỗi "relation ... already exists".

---

## 5. API

**Endpoint mới (topup):**
| Method & Path | Auth | Mô tả |
| --- | --- | --- |
| `POST /wallet/tasker/me/topups` | TASKER | Tạo đơn nạp → trả `{ topupId, approveUrl, amountVnd, amountUsd, ... }`. Body: `{ amountVnd: number }`. FE redirect user tới `approveUrl`. |
| `GET /wallet/tasker/me/topups` | TASKER | Lịch sử đơn nạp (paginated: `page`,`limit`,`status`). |
| `GET /wallet/tasker/me/topups/:id` | TASKER | Chi tiết 1 đơn — **tự verify với PayPal** và cộng ví nếu đã trả (FE poll cái này sau khi user quay lại). |
| `POST /wallet/topups/webhook/paypal` | Public | Webhook PayPal (verify chữ ký, cộng ví idempotent). |
| `GET /wallet/admin/topups` | ADMIN | Đối soát toàn bộ đơn nạp (paginated). |

**Endpoint cộng tiền mặt tại trụ sở (admin nạp tay — KHÔNG qua PayPal):**
| Method & Path | Auth | Mô tả |
| --- | --- | --- |
| `POST /wallet/admin/tasker/:taskerId/credit` | ADMIN | Ghi nhận tasker nộp tiền mặt tại trụ sở → cộng thẳng vào ví. Body: `{ amount: number(1.000–2.000.000/lần), reason: string(bắt buộc), referenceCode?: string }`. Tự tạo ví nếu tasker chưa có (đúng case "lần đầu"). Ghi bút toán `ADJUSTMENT`/`reference_type='OFFICE_DEPOSIT'`. |

> **Vì sao admin ĐƯỢC cộng tay ở đây** (khác với topup PayPal của tasker): tiền mặt vào quỹ công ty ngoài hệ thống nên phải có người ghi nhận. Đây là ngoại lệ hợp lệ; mọi lần cộng đều để lại vết audit (xem dưới).

**Đảm bảo lịch sử — ai cộng/trừ, khi nào, bao nhiêu (đã kiểm chứng):**
Mọi thay đổi số dư ví (cộng HAY trừ, mọi loại) **bắt buộc** đi qua `WalletService.applyBalanceChange` → luôn ghi 1 dòng `wallet_transactions` **chỉ-insert (immutable, không update/xoá)**. Không có đường nào đổi `wallets.balance` mà không để lại vết.

Mỗi dòng ghi đủ:
| Câu hỏi | Cột |
| --- | --- |
| **Bao nhiêu / cộng hay trừ** | `amount`, `type`, `balance_before`, `balance_after` (trừ = có `PLATFORM_FEE/WITHDRAW`, số dư sau < trước) |
| **Khi nào** | `created_at` (`@CreateDateColumn`, có index `idx_wallet_transactions_created_at`) |
| **Ai / vì sao** | Cộng tay: `reference_id` = **UUID admin thực hiện**, `reference_type='OFFICE_DEPOSIT'`, `description` = lý do + số phiếu thu + **email admin**. Topup: `reference_id`=topupId, `reference_type='TOPUP'`. Phí đơn: `booking_id` + `reference_type='BOOKING'`. |

Ví dụ dòng cộng tay thật (từ test): `type=ADJUSTMENT, amount=400000, balance_before=0, balance_after=400000, reference_type=OFFICE_DEPOSIT, reference_id=<admin uuid>, description="Nộp tiền mặt tại trụ sở: … (phiếu thu PT-2026-000123) — ghi nhận bởi admin <email>"`.

> ⚠️ **Hạn chế cần biết:** "ai thực hiện" hiện lưu **gián tiếp** trong `reference_id` (chỉ với giao dịch admin cộng tay) + text `description`, **chưa** có cột `performed_by_user_id` first-class dùng chung cho mọi loại giao dịch. Truy vết được, nhưng nếu sau này cần báo cáo "mọi thao tác của admin X" chuẩn chỉnh thì nên thêm cột đó.

### ❓ Câu hỏi để ngỏ — Maker-checker cho cộng tiền tay
**Quyết định hiện tại (MVP):** cộng tay **1 admin, hiệu lực ngay** — CHƯA làm maker-checker. Chấp nhận rủi ro vì: (a) đã có audit log immutable ở trên; (b) tiền không tự rời hệ thống — rút tiền còn 1 cổng duyệt riêng (module `withdrawal`); (c) đã siết hạn mức `max=2.000.000đ/lần` (nộp nhiều hơn → chia nhiều lần, mỗi lần đều có audit).

**Rủi ro còn lại:** số dư ví rút được → 1 admin xấu tự cộng khống rồi rút. Maker-checker (người A tạo yêu cầu → người B duyệt mới vào ví) là chốt đúng cho việc này.

**Khi nào NÊN nâng lên maker-checker:** (1) có > 2 admin, HOẶC (2) tiền cộng tay/tháng lớn, HOẶC (3) có yêu cầu kiểm toán/nhà đầu tư.
**Cách nâng gọn (khi cần):** đổi `POST …/credit` thành "tạo yêu cầu `PENDING`" (chưa cộng ví) + thêm `POST …/credit/:id/approve` cho **admin KHÁC** duyệt → lúc approve mới gọi `creditWallet`.
**Trạng thái:** đã chọn giữ 1-admin + siết `max=2.000.000đ/lần` (làm ngày 2026-07-04). Dựng khung PENDING/APPROVED để dành khi team/tiền lớn hơn.

**Endpoint ĐÃ XOÁ (ký quỹ — FE phải gỡ, xem §8):**
- `GET /wallet/tasker/me/deposit/transactions`
- `GET /wallet/admin/taskers/:taskerId/deposit/transactions`
- `POST /wallet/admin/taskers/:taskerId/deposit/refund`

**Đổi shape response:**
- `GET /wallet/tasker/me` — bỏ `requiredDeposit`, `currentDepositBalance`, `depositTopupDue`.
- Tasker detail (admin) `stats` — bỏ `depositAmount`, `currentDepositBalance`.
- Incident admin view `tasker` — `currentDepositBalance/availableDeposit` → `walletBalance/availableFunds`.
- Admin "available taskers" `financialCapacity` — bỏ `depositBalance`, `availableAmount` = `walletBalance`.

---

## 6. ENV cần thêm (`be/.env`)

```
# PayPal (bắt buộc cho nạp tiền)
PAYPAL_MODE=sandbox               # sandbox | live
PAYPAL_CLIENT_ID=...              # bạn đã có
PAYPAL_SECRET=...                 # bạn đã có
PAYPAL_WEBHOOK_ID=...             # lấy sau khi tạo webhook (mục 7); thiếu thì webhook bị bỏ qua, vẫn nạp được qua verify-by-API

# Quy đổi & hạn mức (đều có default, không bắt buộc)
TASKER_TOPUP_VND_PER_USD=25000    # tỷ giá VND/USD (default 25000)
TASKER_TOPUP_MIN_VND=10000        # default 10000
TASKER_TOPUP_MAX_VND=50000000     # default 50000000

# URL redirect sau thanh toán (default suy ra từ FRONTEND_URL)
TOPUP_RETURN_URL=http://localhost:3020/tasker/wallet/topup/success
TOPUP_CANCEL_URL=http://localhost:3020/tasker/wallet/topup/cancel
```

Số dư ví tối thiểu để nhận đơn (50.000đ) nằm trong DB (`system_configs`), sửa qua SQL/admin — không phải env.

---

## 7. Cài PayPal (sandbox) & test

1. https://developer.paypal.com → **Apps & Credentials** (Sandbox) → lấy `Client ID` + `Secret` → điền env.
2. **Test không cần webhook (đủ cho MVP):**
   - `POST /wallet/tasker/me/topups` `{ "amountVnd": 100000 }` → nhận `approveUrl`.
   - Mở `approveUrl`, đăng nhập **sandbox buyer account** (tạo ở mục *Testing Tools → Sandbox Accounts*), bấm thanh toán.
   - Quay lại gọi `GET /wallet/tasker/me/topups/:id` → BE tự capture + cộng ví → `status: PAID`. Kiểm tra `GET /wallet/tasker/me` thấy balance tăng.
3. **Bật webhook (production-grade):** Apps & Credentials → app → **Add Webhook** → URL `https://<domain>/api/v1/wallet/topups/webhook/paypal`, chọn event `Checkout order approved` + `Payment capture completed` → copy **Webhook ID** vào `PAYPAL_WEBHOOK_ID`. Local test cần tunnel (ngrok) vì PayPal phải gọi vào được.

### Test G1 (không cần PayPal)
- Set ví tasker < 50k → thử nhận đơn tiền mặt ⇒ bị chặn ("Số dư ví không đủ...").
- Nạp ví lên ≥ 50k (SQL, hoặc topup) → nhận đơn được → hoàn thành đơn ⇒ ví bị trừ đúng hoa hồng (`PLATFORM_FEE` trong `GET /wallet/tasker/me/transactions`).

---

## 8. FE — việc còn phải làm (chưa động vào)

### 8a. Sửa chỗ gãy do bỏ ký quỹ (không crash build vì field optional, nhưng hiển thị sai/NaN)
| File | Việc |
| --- | --- |
| `features/tasker/types/tasker-wallet.types.ts:7-9` | Bỏ `requiredDeposit`, `currentDepositBalance`, `depositTopupDue`. |
| `app/(protected)/(tasker)/tasker/earnings/page.tsx:157-175` | Bỏ khối UI "ký quỹ" (progress `currentDepositBalance/requiredDeposit`). Thay bằng khối số dư ví + nút **Nạp tiền**. |
| `features/admin/modules/tasker/types/admin-tasker.types.ts:64-65` | Bỏ `depositAmount`, `currentDepositBalance` khỏi `stats`. |
| `features/admin/modules/tasker/_components/Tasker360View.tsx:871,877` | Bỏ 2 ô hiển thị cọc. |
| `features/incident/shared/incident.types.ts:91-92` | `currentDepositBalance/availableDeposit` → `walletBalance/availableFunds`. |
| `features/incident/admin/_components/IncidentDetailDrawer.tsx:109-110` | Đổi nhãn "Cọc..." → "Số dư ví (Tasker)", đọc `walletBalance`. |

### 8b. Gỡ gọi 3 endpoint ký quỹ đã xoá (nếu FE có gọi `deposit/transactions`, `deposit/refund`).

### 8c. Xây UI nạp tiền mới (ví tasker) — ✅ ĐÃ LÀM
- **BE:** `returnUrl`/`cancelUrl` (`wallet-topup.service.ts`) gắn thêm `?topupId=...` để trang redirect biết đơn nào mà poll (`appendTopupId`). Ghi đè bằng env `TOPUP_RETURN_URL`/`TOPUP_CANCEL_URL` nếu cần.
- **FE (feature `tasker`):**
  - `types/tasker-wallet.types.ts` — bỏ field cọc; thêm `TaskerTopup`/`CreateTaskerTopupPayload`/`CreateTaskerTopupResult`/`TaskerTopupStatus`.
  - `services/tasker-wallet.service.ts` — `createTopup()` → `POST /wallet/tasker/me/topups`; `getTopup()` → `GET /wallet/tasker/me/topups/:id` (BE tự verify + cộng ví). Bỏ `getDepositTransactions`.
  - `hooks/useTaskerWallet.ts` — `useCreateTaskerTopup()` + `useTaskerTopupStatus(id)` (poll 2.5s khi `PENDING`, tự dừng + invalidate ví/lịch sử khi `PAID`).
  - `app/(protected)/(tasker)/tasker/earnings/page.tsx` — viết lại: header "Ví của tôi", thẻ số dư gradient, 2 nút **Nạp / Rút** (mobile-first), `TopupDialog` (min 10k, nút nhanh, redirect `approveUrl`) + `WithdrawalDialog` + lịch sử giao dịch.
  - `app/(protected)/(tasker)/tasker/wallet/topup/success/page.tsx` — đọc `topupId`, poll tới `PAID` → hiện thành công + số tiền; xử lý `FAILED/EXPIRED/CANCELLED` và thiếu `topupId`. Bọc `Suspense` (Next 16 `useSearchParams`).
  - `app/(protected)/(tasker)/tasker/wallet/topup/cancel/page.tsx` — trang huỷ, không trừ tiền, nút thử lại.
- Kiểm chứng: BE build PASS, `tsc --noEmit` không lỗi mới (chỉ lỗi generated `test/admin/page.js` có sẵn), eslint sạch trên các file mới.

### 8c-cũ. (tuỳ chọn, chưa làm)
- Trang lịch sử đơn nạp `GET /wallet/tasker/me/topups`; bảng admin `GET /wallet/admin/topups`.

### 8d. (Admin) Nút "Ghi nhận nộp tiền mặt tại trụ sở" — ✅ ĐÃ LÀM
- **BE:** `getTaskerDetail` (`tasker.service.ts`) nay trả thêm `stats.walletBalance` (bỏ `depositAmount`/`currentDepositBalance`).
- **FE (module `admin/modules/tasker`):**
  - `types/admin-tasker.types.ts` — `AdminTaskerStats.walletBalance` (bỏ 2 field cọc) + `AdminCreditWalletPayload`/`AdminWalletResult`.
  - `services/admin-tasker.service.ts` — `creditTaskerWallet()` → `POST /wallet/admin/tasker/:id/credit`.
  - `hooks/admin-tasker.hooks.ts` — `useCreditTaskerWallet()` (toast + invalidate detail/list).
  - `_components/TaskerCreditWalletDialog.tsx` — form `{ amount (nút nhanh 50k/100k/400k/500k, giới hạn 2tr), reason (bắt buộc), referenceCode? }`, xem trước số dư mới.
  - `_components/Tasker360View.tsx` — tab **Bảng lương**: thẻ "Số dư ví hiện tại" + nút **Ghi nhận nộp tiền mặt** (thay 2 thẻ cọc chết).
- Chỉ ADMIN. Kiểm chứng: `tsc --noEmit` 0 lỗi, eslint sạch, BE build PASS.

> Còn lại của §8a (chưa làm): `incident.types.ts`/`IncidentDetailDrawer.tsx` vẫn đọc field cọc cũ → hiển thị 0, cần đổi sang `walletBalance`. (`tasker/earnings/page.tsx` đã xong ở §8c.)

---

## 9. Giới hạn đã biết / việc sau

- **Không "giữ" (hold) hoa hồng** khi nhận đơn: nếu tasker nhận đơn rồi rút tiền trước khi hoàn thành, lúc trừ hoa hồng có thể thiếu → `debitWallet` ném "Số dư ví không đủ" (chặn hoàn thành). MVP chấp nhận; sau này nên `holdBalance` phần hoa hồng lúc nhận đơn.
- **Tỷ giá VND/USD cấu hình tĩnh** (`TASKER_TOPUP_VND_PER_USD`). Muốn chuẩn nên lấy tỷ giá realtime.
- **Chưa cron đơn EXPIRED**: đơn PENDING quá hạn không tự huỷ (BullMQ `queue` đã có, có thể thêm job quét). Verify-by-API vẫn xử lý đúng khi user quay lại.
- **Chưa gửi notification** khi nạp thành công (có `NotificationGateway` sẵn để nối thêm).
- `wallet_transaction_id` trên `wallet_topups` để trống (audit link dựa `reference_id=topup.id` trên `wallet_transactions`).

---

## 10. Kiểm chứng đã chạy
- `npm run build` (be) — **PASS**.
- `npx eslint` trên toàn bộ file đã sửa — **PASS**.
- **Migration gộp `migration:run` — PASS** (tạo `wallet_topups`, enum, seed `TASKER_MIN_WALLET_BALANCE=50000`).
- **Topup PayPal sandbox THẬT — PASS**: tasker mới (chưa ví) → tự tạo ví + đơn `PENDING` + `approveUrl`; poll khi chưa trả tiền vẫn `PENDING` (không cộng non). Credit path (giả lập PayPal `COMPLETED`) → cộng ví **đúng 1 lần, idempotent** (poll 2 lần không cộng đôi).
- **Cộng tiền mặt admin (`adminCreditTaskerWallet`) — PASS**: tasker mới (chưa ví) → tạo ví + cộng 400.000đ, bút toán `ADJUSTMENT/OFFICE_DEPOSIT`, audit đủ (admin uuid ở `reference_id` + email & phiếu thu trong `description`).
- (Tất cả test dùng tasker throwaway, đã dọn sạch, không đụng seed data.)
