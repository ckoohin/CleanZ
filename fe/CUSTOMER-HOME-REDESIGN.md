# Customer Home — Redesign Spec

> Thiết kế lại trang chủ khách hàng (`fe/src/features/customer/pages/HomePage.tsx`, render tại route `(protected)/(customer)/customer/page.tsx`) cho hệ thống **chỉ còn 1 dịch vụ: Dọn dẹp** (nhiều gói / thời lượng).
> Phạm vi: **customer home khi đã đăng nhập**, cả **desktop (web)** và **responsive mobile**.
> Trạng thái: *draft — chờ duyệt trước khi code.*

---

## 1. Vấn đề của bản hiện tại

Trang home đang **mô tả sai hệ thống**:

| Thành phần hiện tại | Vấn đề |
| --- | --- |
| `MAIN_SERVICES` — grid 8 icon (Dọn dẹp, **Máy lạnh, Tổng vệ sinh, Giặt là, Diệt côn trùng, Sofa/Nệm, Tạp vụ**, Tất cả) | 7/8 dịch vụ **không còn tồn tại**. Cả 8 icon đều `href` về cùng `ROUTES.CUSTOMER.CATALOG` → điều hướng vô nghĩa, gây kỳ vọng sai. |
| `PROMOS` — 3 banner ảnh + mã `CLEAN30` / `AC199` / `SOFA50` | **Dữ liệu bịa hardcode**, không nối voucher thật; 2/3 mã nói về dịch vụ không tồn tại (máy lạnh, sofa). |
| Hero copy chung chung | Không phản ánh việc sản phẩm giờ là **chuyên dọn dẹp**. |
| `ActiveBookingWidget`, `RecentBookingSection`, `SavedAddressSection` | ✅ Dùng data thật (`useCustomerHome`) — **giữ lại**. |

**Mục tiêu redesign:** một trang home hiện đại, trung thực, "single-service first" — mọi thứ dẫn khách đến **đặt một buổi dọn dẹp**, dùng **data thật** (gói dịch vụ từ catalog, voucher từ API), và **không** hiển thị bất kỳ dịch vụ/khuyến mãi giả nào.

---

## 2. Nguyên tắc thiết kế

1. **Single-service, package-forward.** Không còn "grid danh mục dịch vụ". Thay bằng **hero đặt lịch** + **carousel/grid các GÓI dọn dẹp thật** (Dọn theo giờ, Tổng vệ sinh, Sau xây dựng, …).
2. **Data thật hoặc ẩn.** Section nào không có dữ liệu thật thì **ẩn hẳn** (đặc biệt: voucher rỗng ⇒ không render khối ưu đãi). Không mock.
3. **Đặt lịch trong ≤ 2 chạm.** Hero là CTA chính; mỗi package card là một lối tắt trực tiếp vào booking wizard.
4. **Kế thừa ngôn ngữ hình ảnh hiện có** (không phát minh token mới): `bg-card`, `border-border/40`, bo góc lớn `rounded-[2rem]`, `shadow-sm → hover:shadow-md`, accent `primary` (emerald), `framer-motion whileTap={{ scale: 0.9x }}`.
5. **Mobile-first, thumb-friendly.** Bố cục 1 cột trên mobile với horizontal snap-scroll cho các hàng; desktop mở rộng thành grid nhiều cột trong container căn giữa.

---

## 3. Kiến trúc thông tin (thứ tự section mới)

```
┌─ Sticky search header (giữ, tinh chỉnh copy)
│
├─ 1. HERO ĐẶT LỊCH            ← MỚI (thay grid 8 icon)
│     Lời chào + "Đặt dọn dẹp trong 60 giây" + CTA lớn + quick-pick địa chỉ
│
├─ 2. ACTIVE BOOKING WIDGET    ← giữ (chỉ hiện khi có đơn đang chạy)
│
├─ 3. CHỌN GÓI DỌN DẸP         ← MỚI (thay MAIN_SERVICES, dùng useCatalog)
│     Cards gói thật: tên · giá từ · thời lượng · khu vực
│
├─ 4. ƯU ĐÃI CỦA BẠN           ← MỚI (thay PROMOS, dùng useCustomerVouchers)
│     Voucher thật; ẩn cả section nếu rỗng
│
├─ 5. GẦN ĐÂY  +  ĐỊA CHỈ ĐÃ LƯU   ← giữ (2 cột desktop / stacked mobile)
│
└─ 6. TRUST STRIP (tùy chọn)   ← static branding, 3 điểm tin cậy dọn dẹp
```

---

## 4. Bố cục Desktop (web ≥ 1024px)

Container căn giữa (`Container`, giữ offset `sticky top-[64px]` của header hiện có).

```
┌───────────────────────────────────────────────────────────────┐
│  [ 🔍  Tìm gói dọn dẹp, mã đơn... ]              (sticky)       │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│   Xin chào, {tên} 👋                                            │
│   Nhà bạn cần dọn hôm nay?                                       │
│   ┌───────────────────────────────────────┐   ┌────────────┐   │
│   │ 📍 Giao tới: {địa chỉ mặc định ▾}      │   │  minh hoạ  │   │
│   │ [  Đặt dọn dẹp ngay  →  ]              │   │  (ảnh/SVG) │   │
│   │ Thợ có mặt sau 60 phút · Bảo hiểm 100tr │   └────────────┘   │
│   └───────────────────────────────────────┘                     │
│                                                                 │
│   ── Nếu có đơn đang chạy: [ ActiveBookingWidget ] ──            │
│                                                                 │
│   Chọn gói dọn dẹp                              Xem tất cả →     │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│   │Dọn theo│ │Tổng vệ │ │Sau xây │ │  ...   │   (grid 3–4 cột)  │
│   │  giờ   │ │  sinh  │ │ dựng   │ │        │                   │
│   │70k/giờ │ │từ 500k │ │15k/m²  │ │        │                   │
│   └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                 │
│   Ưu đãi của bạn                                (ẩn nếu rỗng)    │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐                     │
│   │ -30%      │ │ -50.000đ  │ │  ...      │   (scroll ngang)    │
│   │ CLEAN30   │ │ WELCOME   │ │           │                     │
│   └───────────┘ └───────────┘ └───────────┘                     │
│                                                                 │
│   ┌──────────────── 2 cột ────────────────┐                     │
│   │  Gần đây            │  Địa chỉ đã lưu   │                     │
│   │  [list bookings]    │  [grid addresses] │                     │
│   └───────────────────────────────────────┘                     │
│                                                                 │
│   [ Trust strip: Giá minh bạch · Thợ chuẩn · Bảo hiểm ] (tùy chọn)│
└───────────────────────────────────────────────────────────────┘
```

**Grid gói dịch vụ:** `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, gap `gap-5`, cards `rounded-[2rem]`.

---

## 5. Bố cục Mobile (< 768px)

1 cột, các hàng ngang dùng `overflow-x-auto snap-x snap-mandatory scrollbar-hide` (đã có sẵn trong code).

```
┌─────────────────────────┐
│ 🔍 Tìm gói dọn dẹp...    │ sticky
├─────────────────────────┤
│ Xin chào, {tên} 👋       │
│ Nhà bạn cần dọn hôm nay? │
│ ┌─────────────────────┐ │
│ │📍 {địa chỉ mặc định}│ │  hero card full-width
│ │[ Đặt dọn dẹp ngay → ]│ │
│ │ Thợ đến sau 60'      │ │
│ └─────────────────────┘ │
│                         │
│ [ Active booking ]      │  (nếu có)
│                         │
│ Chọn gói dọn dẹp    →   │
│ ┌────┐┌────┐┌────┐      │  snap-scroll ngang
│ │gói1││gói2││gói3│ ▸    │  card min-w ~72vw
│ └────┘└────┘└────┘      │
│                         │
│ Ưu đãi của bạn          │  (ẩn nếu rỗng)
│ ┌────┐┌────┐ ▸          │  snap-scroll ngang
│ └────┘└────┘            │
│                         │
│ Gần đây             →   │
│ [list]                  │
│                         │
│ Địa chỉ đã lưu      →   │
│ [grid 2 cột]            │
└─────────────────────────┘
   ↑ chừa `pb` cho bottom-nav
```

**Breakpoints:**
- `< 640` (sm): 1 cột; hero card full-width; gói & voucher = snap-scroll ngang (`min-w-[72vw]`).
- `640–1024` (md): gói grid 2 cột; Gần đây/Địa chỉ vẫn có thể xếp dọc hoặc 2 cột.
- `≥ 1024` (lg): gói grid 3 cột; Gần đây + Địa chỉ = 2 cột cạnh nhau; hero 2 cột (text | ảnh).
- `≥ 1280` (xl): gói grid 4 cột.

---

## 6. Đặc tả từng component

### 6.1 Sticky search header — *tinh chỉnh*
- Giữ nguyên cấu trúc sticky + backdrop-blur hiện có.
- **Đổi placeholder** `"Tìm dịch vụ, mã đơn..."` → `"Tìm gói dọn dẹp, mã đơn..."`.
- **Bỏ** dòng heading desktop cũ *"Xin chào, bạn cần dịch vụ gì hôm nay?"* (đã chuyển vào Hero mới ở §6.2, tránh trùng).

### 6.2 Hero đặt lịch — *MỚI, thay grid 8 icon*
- **Lời chào cá nhân hoá:** `Xin chào, {user.fullName || 'bạn'} 👋` (lấy từ `useAuth()`), phụ đề `Nhà bạn cần dọn hôm nay?`.
- **Quick-pick địa chỉ:** hàng `📍 Giao tới: {savedAddresses[0]?.label || 'Chọn địa chỉ'}` — bấm mở chọn địa chỉ (hoặc điều hướng `ROUTES.CUSTOMER.ADDRESSES` nếu chưa có). Dùng `savedAddresses` sẵn có từ `useCustomerHome`.
- **CTA chính:** nút lớn `Đặt dọn dẹp ngay →` → `ROUTES.CUSTOMER.BOOKING_WIZARD` (kèm `serviceId` của gói phổ biến nếu chỉ có 1 gói, hoặc để wizard tự chọn). Style: `bg-primary text-primary-foreground rounded-2xl h-12`, `whileTap scale 0.97`.
- **Trust line nhỏ:** `Thợ có mặt sau 60 phút · Bảo hiểm hư hỏng tới 100tr` (static, đúng với dọn dẹp).
- **Desktop:** 2 cột (nội dung | ảnh minh hoạ dọn dẹp). **Mobile:** 1 cột, ảnh ẩn hoặc thu nhỏ.

### 6.3 Active booking widget — *giữ nguyên*
- Không đổi logic; chỉ đảm bảo đặt **ngay dưới hero** để nổi bật khi có đơn đang chạy.

### 6.4 Chọn gói dọn dẹp — *MỚI, thay `MAIN_SERVICES`*
- **Nguồn data:** `useCatalog()` → `services: ServiceGridItem[]` (thật). Không hardcode.
- Mỗi card hiển thị: `name`, giá `từ {fmtCurrency(basePrice)}`, `⏱ {durationHours}h`, `📍 {coverageArea}`, badge `Phổ biến` nếu là gói đầu / có `hasPeakPrice` (tuỳ chọn).
- **Bấm card → booking wizard trực tiếp:** `router.push(\`${ROUTES.CUSTOMER.BOOKING_WIZARD}?serviceId=${id}\`)` (giống `CatalogPage.handleSelectService`).
- **Loading:** skeleton cards (tái dùng pattern skeleton `animate-pulse rounded-[2rem]`).
- **Empty/Error:** nếu `services.length === 0` → card dashed "Hiện chưa có gói dịch vụ, thử lại sau" + nút refetch. **Không** hiện icon giả.
- **Header section:** `Chọn gói dọn dẹp` + link `Xem tất cả →` (`ROUTES.CUSTOMER.CATALOG`).
- Layout: desktop grid (§4), mobile snap-scroll (§5).

### 6.5 Ưu đãi của bạn — *MỚI, thay `PROMOS` bịa*
- **Nguồn data:** `useCustomerVouchers()` → `AvailableVoucher[]` (endpoint `GET /customer/vouchers/available`).
- **Ẩn cả section nếu:** đang lỗi, hoặc trả về mảng rỗng. (Yêu cầu đã chốt: *"rỗng thì ẩn section"*.)
- Mỗi voucher card:
  - Giá trị: `type === 'PERCENT'` → `-{value}%` (kèm `tối đa {maxDiscount}` nếu có); `FIXED` → `-{fmtCurrency(value)}`.
  - `code` (badge), `name`, `Đơn tối thiểu {minOrderAmount}`, `HSD {endDate}`.
  - Trạng thái `canUse === false` → làm mờ + nhãn theo `disabledReason` (`NOT_STARTED` = "Sắp diễn ra", `EXHAUSTED` = "Đã hết", `PER_LIMIT_REACHED` = "Đã dùng").
  - Bấm voucher **khả dụng** → vào booking wizard (voucher sẽ chọn lại ở bước thanh toán); hoặc copy code + toast. *(Quyết định ở §9.)*
- Style thẻ: nền gradient nhẹ theo `primary`, **không** dùng ảnh Unsplash bịa.

### 6.6 Gần đây + Địa chỉ đã lưu — *giữ nguyên*
- Không đổi. Giữ `RecentBookingSection` + `SavedAddressSection` (data thật).

### 6.7 Trust strip — *tùy chọn, static*
- 3 điểm: `Giá minh bạch` · `Thợ được xác minh hồ sơ` · `Bảo hiểm hư hỏng tới 100tr`. Chỉ branding, không phải số liệu thống kê giả. Có thể bỏ nếu muốn tối giản.

---

## 7. Bảng Keep / Replace / Remove

| Thành phần | Hành động | Ghi chú |
| --- | --- | --- |
| `MAIN_SERVICES` (8 icon) | **REMOVE** | Thay bằng Hero (§6.2) + Package grid (§6.4) |
| `PROMOS` (3 banner bịa) | **REMOVE** | Thay bằng Voucher thật (§6.5) |
| Heading desktop "…cần dịch vụ gì hôm nay?" | **REPLACE** | Chuyển vào Hero mới |
| Placeholder search | **EDIT** | → "Tìm gói dọn dẹp, mã đơn..." |
| `ActiveBookingWidget` | **KEEP** | — |
| `RecentBookingSection` | **KEEP** | — |
| `SavedAddressSection` | **KEEP** | — |
| Package grid | **NEW** | `useCatalog()` |
| Voucher section | **NEW** | `useCustomerVouchers()` |
| Hero đặt lịch | **NEW** | — |

---

## 8. Token & Motion (kế thừa, không tạo mới)

- **Màu:** `primary` (emerald) cho CTA/accent; `bg-card` + `border-border/40` cho thẻ; `text-muted-foreground` cho phụ đề.
- **Bo góc:** thẻ lớn `rounded-[2rem]`, thẻ nhỏ/nút `rounded-2xl`, chip `rounded-full`.
- **Bóng:** `shadow-sm` → `hover:shadow-md`; CTA `shadow-md shadow-primary/25`.
- **Motion:** `framer-motion` — thẻ bấm được `whileTap={{ scale: 0.96 }}`; section fade-up khi vào view (tùy chọn, tái dùng `MotionFadeUp`).
- **Scroll ngang:** `overflow-x-auto scrollbar-hide snap-x snap-mandatory` (đã có util `scrollbar-hide`).
- **Dark mode:** giữ nguyên biến theme hiện có (`bg-background`, `bg-card`…), không hardcode màu.

---

## 9. Quyết định cần chốt (open questions)

1. **Hành vi khi bấm voucher:** (a) copy code + toast, hay (b) đi thẳng booking wizard? — *đề xuất: (a) copy code, vì áp voucher thực hiện ở bước thanh toán.*
2. **Ảnh hero:** dùng 1 ảnh minh hoạ dọn dẹp (asset nội bộ) hay illustration/SVG? — *đề xuất: asset nội bộ trong `public/`, tránh Unsplash hotlink như bản cũ.*
3. **Trust strip (§6.7):** giữ hay bỏ cho tối giản? — *đề xuất: giữ gọn 3 mục.*
4. **Gói "phổ biến":** tiêu chí gắn badge `Phổ biến`? Hiện `useCatalog` chưa trả cờ này ở cấp package (chỉ có `durations[].isPopular`). — *đề xuất: tạm lấy package đầu danh sách, hoặc bổ sung cờ ở BE sau.*

---

## 10. Ghi chú liên quan (ngoài phạm vi, nên xử lý riêng)

- **Public site home** (`fe/src/features/home/HomePage.tsx`, route `(site)/home`) **cũng mắc lỗi tương tự**: `CATEGORIES` liệt kê 6 dịch vụ không tồn tại, `STATS` số liệu (`2 Triệu+ giờ`, `100.000+ khách`) là bịa, `SERVICES` 6 gói hardcode. → Nên có một spec/PR riêng áp dụng cùng nguyên tắc "single-service, data thật". Spec này **chỉ** giải quyết customer home như yêu cầu.
```
