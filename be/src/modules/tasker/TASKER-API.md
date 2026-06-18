# Tasker API — Tài liệu cho Frontend

**Base URL:** `http://localhost:3000/api/v1`  
**Auth:** Tất cả endpoint yêu cầu cookie `accessToken` (HTTP-only, được set tự động sau login).  
**Swagger UI:** `http://localhost:3000/api/v1/docs`

---

## Mục lục

- [Enums & Giá trị hợp lệ](#enums--giá-trị-hợp-lệ)
- [Response shape chung (TaskerProfile)](#response-shape-chung-taskerprofile)
- [Tasker — Tự quản lý hồ sơ](#tasker--tự-quản-lý-hồ-sơ)
- [Admin — Quản lý tasker](#admin--quản-lý-tasker)

---

## Enums & Giá trị hợp lệ

### `status` — Trạng thái tài khoản tasker

| Giá trị | Ý nghĩa |
|---|---|
| `PENDING` | Đang chờ duyệt hồ sơ |
| `TRAINING` | Đang trong giai đoạn đào tạo |
| `ACTIVE` | Đã được duyệt, đang hoạt động |
| `SUSPENDED` | Bị tạm khóa |
| `REJECTED` | Bị từ chối (có thể nộp lại) |
| `TERMINATED` | Chấm dứt hợp đồng vĩnh viễn |

### `approvalStatus` (= `document.status`) — Trạng thái hồ sơ KYC

| Giá trị | Ý nghĩa |
|---|---|
| `pending` | Hồ sơ đang chờ admin xét duyệt |
| `approved` | Hồ sơ đã được duyệt |
| `rejected` | Hồ sơ bị từ chối — lý do trong `adminNotes` |
| `need_info` | Admin yêu cầu bổ sung — nội dung cần bổ sung trong `adminNotes` |
| `expired` | Hồ sơ hết hạn |

> **Lưu ý:** `approvalStatus` là lowercase của `document.status` (uppercase).  
> Dùng `approvalStatus` để hiển thị badge trạng thái hồ sơ phía tasker.

### `presenceStatus` — Trạng thái online/offline

| Giá trị | Ý nghĩa |
|---|---|
| `ONLINE` | Tasker đang online, sẵn sàng nhận việc |
| `OFFLINE` | Tasker đang offline |

### `document.type` — Loại giấy tờ tuỳ thân

| Giá trị | Ý nghĩa |
|---|---|
| `CITIZEN_ID` | Căn cước công dân / CMND |
| `OTHER` | Loại giấy tờ khác |

---

## Response shape chung (TaskerProfile)

Hầu hết endpoint trả về object `TaskerProfile` với cấu trúc sau:

```json
{
  "id": "uuid-của-tasker-record",
  "userId": "uuid-của-user",
  "status": "ACTIVE",
  "presenceStatus": "OFFLINE",
  "approvalStatus": "approved",

  "fullName": "Nguyễn Văn A",
  "phone": "0987654321",
  "avatarUrl": "https://res.cloudinary.com/.../avatar.jpg",
  "workingAddress": "12 Nguyễn Trãi, Thanh Xuân, Hà Nội",
  "bio": "Tôi có 2 năm kinh nghiệm dọn dẹp căn hộ và nhà phố.",

  "bankName": "Vietcombank",
  "bankAccountNumber": "1234567890",
  "bankAccountName": "NGUYEN VAN A",

  "adminNotes": null,
  "banReason": null,

  "totalJobs": 42,
  "avgRating": 4.8,

  "hasCitizenCardImage": true,
  "hasCriminalRecordImage": true,
  "hasHealthCertificateImage": false,
  "hasCertificateImage": false,
  "hasIdWithSelfieImage": true,

  "bank": {
    "name": "Vietcombank",
    "accountNumber": "1234567890",
    "accountName": "NGUYEN VAN A"
  },

  "user": {
    "id": "uuid-của-user",
    "email": "nguyenvana@gmail.com",
    "fullName": "Nguyễn Văn A",
    "phone": "0987654321",
    "avatarUrl": "https://res.cloudinary.com/.../avatar.jpg",
    "isActive": true
  },

  "document": {
    "type": "CITIZEN_ID",
    "idNumber": "001203000123",
    "frontUrl": "https://res.cloudinary.com/.../front.jpg",
    "backUrl": "https://res.cloudinary.com/.../back.jpg",
    "criminalRecordUrl": "https://res.cloudinary.com/.../criminal.jpg",
    "healthCertificateUrl": null,
    "certificateUrl": null,
    "issuedDate": "2020-01-15",
    "expiredDate": "2035-01-15",
    "status": "APPROVED",
    "reviewedAt": "2026-06-10T08:30:00.000Z",
    "note": null
  },

  "stats": {
    "depositAmount": 400000,
    "currentDepositBalance": 400000,
    "ratingAvg": 4.8,
    "totalCompletedJobs": 42,
    "totalWorkingHours": 128.5,
    "totalPoints": 210
  },

  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-06-10T08:30:00.000Z"
}
```

### Khi có lỗi

```json
{
  "success": false,
  "message": "Mô tả lỗi"
}
```

---

## Tasker — Tự quản lý hồ sơ

> Yêu cầu role: **TASKER** (hoặc CUSTOMER cho endpoint nộp hồ sơ lần đầu)

---

### `POST /tasker/profile`

**Nộp/cập nhật hồ sơ đăng ký làm tasker**

- Nếu chưa có hồ sơ → tạo mới, `status = PENDING`
- Nếu hồ sơ đã bị `REJECTED` → cho nộp lại, reset về `PENDING`
- Hồ sơ đã `APPROVED` → **không** được nộp lại, trả `409`

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `avatar` | file (jpg/png, ≤5MB) | ✅ | Ảnh đại diện |
| `phone` | string | ✅ | SĐT, bắt đầu 0, 10–11 số. Không đổi được sau khi APPROVED |
| `docType` | `CITIZEN_ID` \| `OTHER` | ✅ | Loại giấy tờ |
| `docIdNumber` | string | ✅ | Số CCCD/CMND |
| `docFront` | file (jpg/png, ≤5MB) | ✅ | Ảnh mặt trước giấy tờ |
| `docBack` | file (jpg/png, ≤5MB) | ✅ | Ảnh mặt sau giấy tờ |
| `workingAddress` | string | ❌ | Khu vực làm việc |
| `bio` | string | ❌ | Giới thiệu bản thân |
| `docIssuedDate` | string (YYYY-MM-DD) | ❌ | Ngày cấp |
| `docExpiredDate` | string (YYYY-MM-DD) | ❌ | Ngày hết hạn |
| `criminalRecord` | file (jpg/png, ≤5MB) | ❌ | Lý lịch tư pháp |
| `healthCertificate` | file (jpg/png, ≤5MB) | ❌ | Giấy khám sức khoẻ |
| `certificate` | file (jpg/png, ≤5MB) | ❌ | Chứng chỉ nghiệp vụ |
| `bankName` | string | ❌ | Tên ngân hàng |
| `bankAccountNumber` | string | ❌ | Số tài khoản |
| `bankAccountName` | string | ❌ | Tên chủ tài khoản |

**Response `200`:** `TaskerProfile` (xem shape ở trên)

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `400` | Thiếu avatar, thiếu ảnh giấy tờ, SĐT sai định dạng |
| `409` | Hồ sơ đã được duyệt (APPROVED), không thể nộp lại |

---

### `GET /tasker/profile/me`

**Tasker xem hồ sơ của chính mình**

Dùng để hiển thị trạng thái hồ sơ hiện tại, badge duyệt, lý do từ chối.

**Response `200`:** `TaskerProfile`

**Logic hiển thị gợi ý:**

```
approvalStatus === 'pending'   → Hiện badge "Đang chờ duyệt"
approvalStatus === 'approved'  → Hiện badge "Đã duyệt", mở tính năng nhận việc
approvalStatus === 'rejected'  → Hiện badge "Bị từ chối" + adminNotes (lý do)
approvalStatus === 'need_info' → Hiện banner cảnh báo + adminNotes (cần bổ sung gì)
```

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `404` | User chưa có hồ sơ tasker |

---

## Admin — Quản lý tasker

> Yêu cầu role: **ADMIN**

---

### `GET /tasker/admin`

**Danh sách tất cả tasker với filter và phân trang**

**Query params:**

| Param | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `status` | `TaskerStatus` | — | Lọc theo trạng thái tài khoản |
| `docStatus` | `DocumentStatus` | — | Lọc theo trạng thái hồ sơ |
| `keyword` | string | — | Tìm theo tên hoặc email (không phân biệt hoa thường) |
| `page` | number | `1` | Trang hiện tại |
| `limit` | number | `10` | Số bản ghi mỗi trang (tối đa 50) |

**Ví dụ:**
```
GET /tasker/admin?status=PENDING&page=1&limit=20
GET /tasker/admin?docStatus=NEED_INFO&keyword=nguyen
GET /tasker/admin?status=ACTIVE
```

**Response `200`:**

```json
{
  "data": [ /* mảng TaskerProfile */ ],
  "total": 87,
  "page": 1,
  "limit": 10
}
```

---

### `GET /tasker/admin/:id`

**Chi tiết đầy đủ một tasker**

`:id` là UUID của `tasker record` (không phải `user.id`).

**Response `200`:** `TaskerProfile`

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `404` | Không tìm thấy tasker với id này |

---

### `PATCH /tasker/admin/:id/approve`

**Duyệt hồ sơ tasker**

Không cần body. Sau khi gọi:
- `status` → `ACTIVE`
- `document.status` → `APPROVED`
- `adminNotes` → `null`
- Email thông báo được gửi cho tasker

**Response `200`:** `TaskerProfile` (với trạng thái đã cập nhật)

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `400` | Tasker đã ở trạng thái `APPROVED` rồi |
| `404` | Không tìm thấy tasker |

---

### `PATCH /tasker/admin/:id/reject`

**Từ chối hồ sơ tasker**

**Request body:**

```json
{
  "notes": "Ảnh CCCD bị mờ, vui lòng chụp lại mặt trước và mặt sau."
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `notes` | string (≤1000 ký tự) | ✅ | Lý do từ chối, tasker sẽ nhìn thấy |

Sau khi gọi:
- `status` → `REJECTED`
- `document.status` → `REJECTED`
- `adminNotes` → nội dung `notes`
- Email thông báo được gửi cho tasker

**Response `200`:** `TaskerProfile`

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `400` | Tasker đã ở `REJECTED` rồi |
| `404` | Không tìm thấy tasker |

---

### `PATCH /tasker/admin/:id/request-info`

**Yêu cầu tasker bổ sung thông tin hồ sơ**

Dùng khi hồ sơ đủ điều kiện nhưng cần thêm/sửa một số thông tin.

**Request body:**

```json
{
  "notes": "Vui lòng upload thêm giấy khám sức khoẻ còn hiệu lực trong vòng 6 tháng."
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `notes` | string (≤1000 ký tự) | ✅ | Mô tả cụ thể cần bổ sung gì |

Sau khi gọi:
- `document.status` → `NEED_INFO`
- `adminNotes` → nội dung `notes`
- `status` giữ nguyên (vẫn `PENDING`)
- Email thông báo được gửi cho tasker

**Response `200`:** `TaskerProfile`

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `400` | Hồ sơ đã `APPROVED` hoặc `REJECTED` (không thể request-info) |
| `404` | Không tìm thấy tasker |

---

### `POST /tasker/admin/:id/ban`

**Khóa tài khoản tasker**

**Request body:**

```json
{
  "reason": "Vi phạm quy định về hành vi với khách hàng lần thứ 3.",
  "type": "TEMPORARY"
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `reason` | string (≤500 ký tự) | ✅ | Lý do khóa tài khoản |
| `type` | `TEMPORARY` \| `PERMANENT` | ✅ | Loại khóa |

Sau khi gọi:
- `status` → `SUSPENDED`
- `banReason` → `"[TEMPORARY] Vi phạm quy định..."`
- Email thông báo được gửi cho tasker

**Response `200`:** `TaskerProfile`

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `400` | Tasker đã bị `SUSPENDED` hoặc `TERMINATED` |
| `404` | Không tìm thấy tasker |

---

### `POST /tasker/admin/:id/unban`

**Mở khóa tài khoản tasker**

Không cần body.

Sau khi gọi:
- `status` → `ACTIVE`
- `banReason` → `null`

**Response `200`:** `TaskerProfile`

**Lỗi:**

| Code | Trường hợp |
|---|---|
| `400` | Tasker không đang bị khóa (`status` ≠ `SUSPENDED`) |
| `404` | Không tìm thấy tasker |

---

### `GET /tasker/admin/:id/penalties`

**Lịch sử vi phạm của tasker** *(placeholder — luôn trả mảng rỗng)*

**Response `200`:**

```json
{
  "data": []
}
```

---

## Deprecated — Chỉ dùng cho trang Verification cũ

> Các endpoint dưới đây chỉ list hồ sơ `PENDING`. Dùng `GET /tasker/admin` thay thế.

### `GET /tasker/admin/profiles/pending`

Trả danh sách tasker có `docStatus = PENDING`.

**Response:**
```json
{
  "total": 5,
  "items": [ /* mảng TaskerProfile */ ]
}
```

### `GET /tasker/admin/profiles/pending/:taskerId`

Chi tiết một hồ sơ PENDING. Trả `404` nếu hồ sơ không ở trạng thái PENDING.

### `PATCH /tasker/admin/profiles/:taskerId/review`

Duyệt hoặc từ chối hồ sơ (chỉ xử lý được `PENDING`).

**Request body:**
```json
{ "status": "APPROVED" }
```
hoặc
```json
{ "status": "REJECTED", "reason": "Lý do từ chối" }
```

---

## Hướng dẫn FE — Logic hiển thị trạng thái

```
// Màu badge theo status
PENDING     → badge màu vàng  "Chờ duyệt"
ACTIVE      → badge màu xanh  "Hoạt động"
REJECTED    → badge màu đỏ    "Bị từ chối"
SUSPENDED   → badge màu cam   "Bị khóa"
TERMINATED  → badge màu xám   "Đã chấm dứt"
TRAINING    → badge màu tím   "Đang đào tạo"

// Màu badge theo document.status / approvalStatus
pending     → badge xanh dương "Chờ xét duyệt"
approved    → badge xanh lá    "Hồ sơ hợp lệ"
rejected    → badge đỏ         "Hồ sơ bị từ chối" + hiện adminNotes
need_info   → badge vàng       "Cần bổ sung" + hiện adminNotes
expired     → badge xám        "Hồ sơ hết hạn"

// Nút action trong trang admin/:id
status=PENDING + docStatus=PENDING/NEED_INFO
  → hiện [Duyệt] [Từ chối] [Yêu cầu bổ sung]

status=ACTIVE
  → hiện [Khóa tài khoản]

status=SUSPENDED
  → hiện [Mở khóa]

status=REJECTED/TERMINATED
  → chỉ xem, không có action
```
