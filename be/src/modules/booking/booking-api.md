# 📘 Booking & Worker Services API Documentation

Tài liệu này cung cấp chi tiết các API cho module **Booking** và **Worker Services**. Các API được thiết kế với dữ liệu mẫu chuẩn (JSON) để QA/Tester có thể copy-paste trực tiếp vào Postman để test mà không cần mò code.

> **Base URL**: `http://localhost:5000/api/v1` (hoặc port bạn đang cấu hình ở `.env`)
> 
> **Authentication**: Các API yêu cầu xác thực. Bạn cần gọi `POST /api/v1/auth/login` và `POST /api/v1/auth/verify-login-otp`, token sẽ tự động lưu vào **Cookie** của Postman/Trình duyệt.

---

## 🛠 I. CHUẨN BỊ MÔI TRƯỜNG TEST (Làm trước khi test)

1. **Admin tạo Service gốc**: Cần tạo ít nhất 1 dịch vụ.
   - Gọi `POST /api/v1/services` (với tài khoản Admin)
   - Hoặc lấy 1 ID dịch vụ có sẵn trong database. Ví dụ: `service_id_xxx`

2. **User Worker**: Cần 1 tài khoản đã được duyệt làm Worker (`approval_status = approved`). Lấy ID của profile worker này. Ví dụ: `worker_profile_id_xxx`.

3. **User Customer**: Cần 1 tài khoản Customer bình thường. Lấy User ID để test.

---

## 🏢 II. WORKER SERVICES API (Worker đăng ký dịch vụ)

Sau khi Admin tạo danh mục dịch vụ, Worker có quyền đăng ký nhận các dịch vụ đó với mức giá và cung cấp phương thức phục vụ riêng (Tại nhà hoặc Tại quán).

### 1. Worker mở dịch vụ mới
> **Role**: Worker (chính chủ) hoặc Admin
> **Endpoint**: `POST /workers/:id/services` (Trường `:id` là ID của tài khoản Worker)

**Request Body:**
```json
{
  "serviceId": "YOUR_SERVICE_ID_HAVE_CREATED", 
  "locationTypes": ["at_shop", "home"],
  "customPrice": 350000,
  "description": "Dịch vụ massage thư giãn chuyên sâu, kết hợp châm cứu.",
  "shopAddress": "123 Đường Số 1, Quận 1, TP.HCM"
}
```
*Lưu ý: Nếu `locationTypes` có chứa `at_shop`, bắt buộc phải truyền `shopAddress`.*

**Response (201 Created):**
```json
{
  "id": "WS_ID_001",
  "serviceId": "YOUR_SERVICE_ID_HAVE_CREATED",
  "serviceName": "Massage Cổ Vai Gáy",
  "locationTypes": ["at_shop", "home"],
  "customPrice": 350000,
  "effectivePrice": 350000,
  "description": "Dịch vụ massage thư giãn chuyên sâu, kết hợp châm cứu.",
  "shopAddress": "123 Đường Số 1, Quận 1, TP.HCM",
  "isAvailable": true,
  "createdAt": "2026-04-03T10:00:00Z"
}
```

### 2. Xem danh sách dịch vụ của Worker
> **Role**: Tất cả mọi người (Public / Auth)
> **Endpoint**: `GET /workers/:id/services`

**Response (200 OK):**
```json
[
  {
    "id": "WS_ID_001",
    "serviceName": "Massage Cổ Vai Gáy",
    "locationTypes": ["at_shop", "home"],
    "effectivePrice": 350000,
    "shopAddress": "123 Đường Số 1, Quận 1, TP.HCM",
    "isAvailable": true
  }
]
```

### 3. Cập nhật dịch vụ đã đăng ký
> **Role**: Worker (chính chủ)
> **Endpoint**: `PATCH /workers/:id/services/:wsId`

**Request Body:**
```json
{
  "customPrice": 400000,
  "isAvailable": false
}
```

### 4. Xóa dịch vụ
> **Role**: Worker (chính chủ)
> **Endpoint**: `DELETE /workers/:id/services/:wsId`

---

## 📅 III. BOOKING API (Customer đặt và quản lý lịch trình)

### 1. Customer tạo Booking mới
> **Role**: Customer (Khách hàng)
> **Endpoint**: `POST /bookings`

#### Case 1: Đặt lịch hẹn TRƯỚC tại QUÁN (Scheduled - At Shop)
Lấy `workerServiceId` từ API lấy danh sách dịch vụ Worker ở trên.

**Request Body:**
```json
{
  "workerServiceId": "WS_ID_001",
  "bookingType": "scheduled",
  "serviceLocationType": "at_shop",
  "scheduledDate": "2026-04-10",
  "scheduledTime": "14:30",
  "customerNote": "Tôi đến muộn 5 phút nhé",
  "paymentMethod": "momo"
}
```

#### Case 2: Đặt dịch vụ NGAY LẬP TỨC tại NHÀ (Instant - Home)
Khi làm tại nhà, bắt buộc phải truyền `address`.

**Request Body:**
```json
{
  "workerServiceId": "WS_ID_001",
  "bookingType": "instant",
  "serviceLocationType": "home",
  "address": "Tầng 12, Tòa nhà Bitexco, Q1, TP.HCM",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "customerNote": "Tới nơi nhớ gọi tôi xuống đón",
  "paymentMethod": "cash"
}
```

**Response (201 Created):**
```json
{
  "id": "BOOKING_ID_001",
  "customerName": "Nguyễn Văn Khách",
  "workerName": "Trần Thị Thợ",
  "serviceName": "Massage Cổ Vai Gáy",
  "bookingType": "instant",
  "serviceLocationType": "home",
  "status": "pending",
  "address": "Tầng 12, Tòa nhà Bitexco, Q1, TP.HCM",
  "totalPrice": 350000,
  "paymentStatus": "unpaid",
  "paymentMethod": "cash",
  "createdAt": "2026-04-03T10:05:00Z"
}
```

---

### 2. Xem dách sách Booking
> **Role**: Customer & Worker
> **Endpoint**: `GET /bookings`
> Tự động Filter: Khách hàng chỉ thấy booking của mình. Worker chỉ thấy booking khách đặt mình.

**Query Parameters (Optional):**
- `status`: `pending | confirmed | in_progress | completed | cancelled`
- `bookingType`: `instant | scheduled`
- `page`: `1`
- `limit`: `10`

**Ví dụ:** `GET /bookings?status=pending&page=1`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "BOOKING_ID_001",
      "status": "pending",
      "totalPrice": 350000
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Worker Cập nhật Trạng thái Booking (Luồng thực hiện)
> **Role**: Worker (Người nhận dịch vụ)
> **Endpoint**: `PATCH /bookings/:id/status`

Hệ thống quản lý chặt chẽ chu kì của booking: `pending` 👉 `confirmed` 👉 `in_progress` 👉 `completed`

**Bước 1: Worker Đồng Ý Nhận Lịch**
```json
{
  "status": "confirmed"
}
```

**Bước 2: Worker Bắt Đầu Làm Việc** (System tự động lưu giờ `startedAt`)
```json
{
  "status": "in_progress"
}
```

**Bước 3: Worker Khai Báo Hoàn Thành** (System tự động lưu giờ `completedAt`)
```json
{
  "status": "completed"
}
```

> **Ghi chú**: Nếu bạn chuyển sai luồng (Ví dụ: Đang `pending` mà nhảy lên `completed` luôn), API sẽ văng lỗi `400 Bad Request`.

---

### 4. Hủy Booking
> **Role**: Customer / Worker
> **Endpoint**: `PATCH /bookings/:id/cancel`
> *Lưu ý: Chỉ được hủy khi hệ thống đang ở `pending` hoặc `confirmed`.*

**Request Body:**
```json
{
  "cancellationReason": "Tôi bận việc đột xuất không thể thực hiện dịch vụ được"
}
```

**Response (200 OK):**
Thêm trường ghi nhận ai là người hủy (`cancelledBy` \['customer', 'worker'\]).

---

### 5. Khách hàng Đánh giá Dịch vụ (Review)
> **Role**: Customer
> **Endpoint**: `POST /bookings/:id/review`
> *Lưu ý: Chỉ đánh giá được khi trạng thái booking là `completed`.*

**Request Body:**
```json
{
  "rating": 5,
  "review": "Chị Worker làm rất nhiệt tình, tay nghề cao, vote 5 sao nha!"
}
```
*(Số sao từ 1 tới 5)*

**Sau khi call**: Review được update, field `avgRating` của Worker cũng tự động thay đổi trung bình theo.

---

### 6. Cập nhật trạng thái Thanh Toán (Dành cho Server / Cronjob Payment)
> **Endpoint**: `PATCH /bookings/:id/payment`
> Dùng khi VNPay/MoMo trả Webhook IPN về thì Server gọi đến luồng này, cập nhật trạng thái đơn hàng.

**Request Body:**
```json
{
  "paymentStatus": "paid",
  "transactionId": "MOMO_280381084201X",
  "paymentData": {
    "bankCode": "NCB",
    "amountPaid": 350000,
    "payDate": "2026-04-03 14:00:00"
  }
}
```
