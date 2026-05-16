# Bookings Module - API Documentation

## Tổng quan
Module Bookings quản lý việc đặt lịch dịch vụ của khách hàng. Booking được tạo ở trạng thái PENDING và chưa có staff được gán, sau đó admin hoặc staff sẽ nhận việc.

---

## Entities

### 1. BookingEntity

**Table:** `bookings`
**Relations:**
- `customer` → ManyToOne → CustomerEntity (eager)
- `service` → ManyToOne → ServiceEntity (eager)
- `staffService` → ManyToOne → StaffServiceEntity (eager, nullable)
- `addons` → OneToMany → BookingAddonEntity (cascade, eager)

**Enums:**

```typescript
// BookingType
enum BookingType {
  SCHEDULED = 'scheduled',  // Đặt lịch trước
  INSTANT = 'instant'       // Đặt ngay
}

// BookingStatus
enum BookingStatus {
  PENDING = 'pending',           // Chờ xác nhận
  CONFIRMED = 'confirmed',       // Đã xác nhận, có staff
  IN_PROGRESS = 'in_progress',   // Đang thực hiện
  COMPLETED = 'completed',       // Hoàn thành
  CANCELLED = 'cancelled'        // Đã hủy
}

// PaymentStatus
enum PaymentStatus {
  UNPAID = 'unpaid',       // Chưa thanh toán
  PAID = 'paid',           // Đã thanh toán
  REFUNDED = 'refunded'    // Đã hoàn tiền
}

// ServiceLocationType
enum ServiceLocationType {
  HOME = 'home',         // Tại nhà khách
  AT_SHOP = 'at_shop'    // Tại cửa hàng
}
```

**Business Rules:**
1. ✅ Một customer chỉ có thể có 1 booking active (PENDING/CONFIRMED/IN_PROGRESS) — check trong transaction với pessimistic lock
2. ✅ Booking mới tạo có `status = PENDING` và `staff_service_id = null`
3. ✅ `order_code` được generate tự động và unique
4. ✅ `booking_date` + `booking_time` phải trong tương lai (strict `<`)
5. ✅ `address` bắt buộc cho cả `location_type = home` và `at_shop`
6. ✅ `service` phải active và hỗ trợ `location_type` được chọn
7. ✅ `estimated_hours` là bắt buộc để tính giá dịch vụ
8. ✅ Customer chỉ có thể hủy booking ở trạng thái PENDING
9. ✅ Admin có thể hủy booking ở trạng thái PENDING, CONFIRMED, IN_PROGRESS
10. ✅ Staff chỉ nhận được booking PENDING, chưa có người nhận, còn giờ hẹn
11. ✅ Staff không thể nhận nhiều booking trùng ngày + giờ
12. ✅ Admin có thể gán staff cho booking bất kỳ (không check skill match), auto tạo staffService nếu chưa có

---

### 2. BookingAddonEntity

**Table:** `booking_addons`

**Description:** Lưu trữ các dịch vụ bổ sung của booking 

**Columns:**

| Column | Type | Nullable | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | uuid | NO | Primary key | `550e8400-e29b-41d4-a716-446655440002` |
| `booking_id` | uuid | NO | FK to bookings.id | `550e8400-e29b-41d4-a716-446655440000` |
| `addon_name` | varchar(255) | NO | Tên dịch vụ bổ sung | `Electronics Cleaning` |
| `addon_price` | decimal(10,2) | NO | Giá dịch vụ bổ sung | `30000.00` |
| `created_at` | timestamp | NO | Thời điểm tạo | `2026-05-15T04:22:45Z` |
| `updated_at` | timestamp | NO | Thời điểm cập nhật | `2026-05-15T04:22:45Z` |

**Relations:**
- `booking` → ManyToOne → BookingEntity

---

## API Endpoints

### 1. Create Booking

Tạo booking mới cho customer.

**Endpoint:** `POST /api/bookings`

**Authentication:** Required (JWT Bearer Token)

**Authorization:** CUSTOMER role only

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**

```typescript
{
  serviceId: string;              // UUID của service (required)
  locationType: 'home' | 'at_shop'; // Loại địa điểm (required)
  address: string;                // Địa chỉ (required cho cả home và at_shop)
  bookingDate: string;            // Ngày đặt lịch YYYY-MM-DD (required)
  bookingTime: string;            // Giờ đặt lịch HH:mm (required, 24h format)
  estimatedHours: number;         // Số giờ ước tính (required, min: 0.5)
  addonServiceIds?: string[];     // Danh sách ID dịch vụ bổ sung (optional)
  specialRequests?: string;       // Yêu cầu đặc biệt (optional)
  notes?: string;                 // Ghi chú (optional)
}
```

**Request Example:**

```json
{
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "locationType": "home",
  "address": "123 Nguyen Hue, Quan 1, TP.HCM",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00",
  "estimatedHours": 3,
  "addonServiceIds": ["addon-electronics", "addon-glass"],
  "specialRequests": "Cần dọn kỹ phòng khách, tránh dùng hóa chất mạnh",
  "notes": "Gọi trước 15 phút khi đến"
}
```

**Response: 201 Created**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "orderCode": "BKL8X9Y2ABC",
  "customerId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "customerName": "Nguyen Van A",
  "customerPhone": "0901234567",
  "customerEmail": "customer@example.com",
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "serviceName": "Basic Cleaning",
  "staffServiceId": null,
  "staffName": null,
  "bookingType": "scheduled",
  "locationType": "home",
  "address": "123 Nguyen Hue, Quan 1, TP.HCM",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00",
  "estimatedHours": 3,
  "actualHours": null,
  "hourlyRate": 100000,
  "quotedPrice": 300000,
  "totalPrice": 350000,
  "addons": [
    {
      "addonName": "Electronics Cleaning",
      "addonPrice": 30000
    },
    {
      "addonName": "Glass Cleaning",
      "addonPrice": 20000
    }
  ],
  "specialRequests": "Cần dọn kỹ phòng khách, tránh dùng hóa chất mạnh",
  "notes": "Gọi trước 15 phút khi đến",
  "status": "pending",
  "paymentStatus": "unpaid",
  "confirmedAt": null,
  "createdAt": "2026-05-15T04:22:45.233Z",
  "updatedAt": "2026-05-15T04:22:45.233Z"
}
```

**Error Responses:**

**400 Bad Request** - Dữ liệu không hợp lệ
```json
{
  "statusCode": 400,
  "message": [
    "serviceId must be a UUID",
    "bookingDate must be a valid ISO 8601 date string",
    "Giờ đặt lịch phải đúng định dạng HH:mm (24h)"
  ],
  "error": "Bad Request"
}
```

**400 Bad Request** - Validation lỗi
```json
{
  "statusCode": 400,
  "message": "Ngày và giờ đặt lịch phải lớn hơn thời điểm hiện tại",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Địa chỉ là bắt buộc",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Dịch vụ không hỗ trợ loại địa điểm home",
  "error": "Bad Request"
}
```

**404 Not Found** - Service không tồn tại
```json
{
  "statusCode": 404,
  "message": "Dịch vụ không tồn tại hoặc đã bị tạm ẩn",
  "error": "Not Found"
}
```

**404 Not Found** - Customer profile không tồn tại
```json
{
  "statusCode": 404,
  "message": "Customer profile không tồn tại",
  "error": "Not Found"
}
```

**409 Conflict** - Customer đã có booking active
```json
{
  "statusCode": 409,
  "message": "Bạn đã có booking đang hoạt động. Vui lòng hoàn thành hoặc hủy booking hiện tại trước khi tạo booking mới.",
  "error": "Conflict"
}
```

**401 Unauthorized** - Token không hợp lệ
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**403 Forbidden** - Không có quyền (không phải CUSTOMER)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Data Flow

### Create Booking Flow

```
1. Customer gửi request POST /api/bookings
   ↓
2. JwtAuthGuard verify token
   ↓
3. RolesGuard check role = CUSTOMER
   ↓
4. Validate DTO (CreateBookingDto)
   ↓
5. CustomerBookingService.create() (trong transaction)
   ├─ Check customer profile exists
   ├─ Check active booking với pessimistic lock (Rule 1)
   ├─ Validate service exists & active
   ├─ Validate location type supported
   ├─ Validate address (bắt buộc cho cả HOME và AT_SHOP)
   ├─ Validate datetime in future (strict <)
   ├─ Validate estimatedHours (required)
   ├─ Calculate pricing (base + addons)
   ├─ Generate unique order code (Rule 3)
   └─ Create booking without staff (Rule 2)
   ↓
6. Save to database (trong transaction)
   ↓
7. Return BookingResponseDto
```

---

## API Endpoints (Chi tiết)

### 2. Get Booking History

Lấy danh sách booking có phân trang và filter.

**Endpoint:** `GET /api/bookings`

**Authentication:** Required (JWT Bearer Token)

**Authorization:** ADMIN, STAFF, CUSTOMER

**Query Parameters:**

| Param | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `page` | number | No | Trang hiện tại (default: 1) | `1` |
| `limit` | number | No | Số item/trang (default: 10) | `10` |
| `status` | string | No | Lọc theo trạng thái booking | `pending` |
| `bookingDateFrom` | string | No | Lọc từ ngày (YYYY-MM-DD) | `2026-05-01` |
| `bookingDateTo` | string | No | Lọc đến ngày (YYYY-MM-DD) | `2026-05-31` |

**Role Behavior:**
- **Admin:** Xem toàn bộ bookings
- **Customer:** Chỉ xem bookings của mình
- **Staff:** Chỉ xem bookings đã được gán cho mình (staffService IS NOT NULL)

**Response: 200 OK**

```json
{
  "data": [...],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 3. Get Booking Details

**Endpoint:** `GET /api/bookings/:id`

**Authentication:** Required

**Authorization:** ADMIN, STAFF, CUSTOMER

**Role Behavior:**
- **Admin:** Xem mọi booking
- **Customer:** Chỉ xem booking của mình
- **Staff:** Chỉ xem booking được gán cho mình

**Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "orderCode": "BKL8X9Y2ABC",
  "customerId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "customerName": "Nguyen Van A",
  "customerPhone": "0901234567",
  "customerEmail": "customer@example.com",
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "serviceName": "Basic Cleaning",
  "staffServiceId": "staff-svc-id",
  "staffName": "Tran Van B",
  "bookingType": "scheduled",
  "locationType": "home",
  "address": "123 Nguyen Hue, Quan 1, TP.HCM",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00",
  "estimatedHours": 3,
  "hourlyRate": 100000,
  "quotedPrice": 300000,
  "totalPrice": 300000,
  "status": "pending",
  "paymentStatus": "unpaid",
  "confirmedAt": null,
  "createdAt": "2026-05-15T04:22:45.233Z",
  "updatedAt": "2026-05-15T04:22:45.233Z"
}
```

**Error Responses:**
- `403 Forbidden` — Không có quyền xem booking này
- `404 Not Found` — Booking không tồn tại

---

### 4. Get Available Bookings (Staff only)

Lấy danh sách booking chưa có ai nhận, phù hợp với service của staff.

**Endpoint:** `GET /api/bookings/available`

**Authentication:** Required

**Authorization:** STAFF only

**Logic:**
- Chỉ trả về booking `status = PENDING` và `staff_service_id = null`
- Chỉ hiển thị booking có service mà staff đăng ký
- Chỉ hiển thị booking có locationType mà staff hỗ trợ
- Tự động lọc bỏ booking đã quá giờ hẹn

**Response: 200 OK**

```json
[
  {
    "id": "booking-id",
    "orderCode": "BK1A2B3C4D5E",
    "customerId": "customer-id",
    "customerName": "Nguyen Van A",
    "customerPhone": "0901234567",
    "customerEmail": "customer@example.com",
    "serviceId": "service-id",
    "serviceName": "Basic Cleaning",
    "staffServiceId": null,
    "staffName": null,
    "locationType": "home",
    "address": "123 Nguyen Hue, Quan 1, TP.HCM",
    "bookingDate": "2026-05-20",
    "bookingTime": "09:00",
    "status": "pending",
    "paymentStatus": "unpaid",
    "quotedPrice": 300000,
    "totalPrice": 300000,
    "createdAt": "2026-05-15T04:22:45.233Z",
    "updatedAt": "2026-05-15T04:22:45.233Z"
  }
]
```

---

### 5. Cancel Booking

**Endpoint:** `PATCH /api/bookings/:id/cancel`

**Authentication:** Required

**Authorization:** ADMIN, CUSTOMER

**Request Body:**

```json
{
  "cancellationReason": "Có việc đột xuất, không thể sắp xếp được thời gian"
}
```

**Rule theo role:**
- **Customer:** Chỉ hủy được booking `status = PENDING` của chính mình
- **Admin:** Hủy được booking `status = PENDING, CONFIRMED, IN_PROGRESS` (trừ COMPLETED, CANCELLED)

**Response: 200 OK**

```json
{
  "id": "booking-id",
  "status": "cancelled",
  "cancelledBy": "user-id",
  "cancellationReason": "Có việc đột xuất, không thể sắp xếp được thời gian",
  "cancelledAt": "2026-05-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` — Không thể hủy booking ở trạng thái này
- `403 Forbidden` — Không có quyền hủy booking này
- `404 Not Found` — Booking không tồn tại

---

### 6. Accept Booking (Staff only)

Staff nhận booking chưa có ai gán.

**Endpoint:** `PATCH /api/bookings/:id/accept`

**Authentication:** Required

**Authorization:** STAFF only

**Logic:**
- Booking phải ở trạng thái `PENDING`
- Booking chưa có staff được gán (`staffService = null`)
- Staff phải có staffService match với booking's service
- Staff phải hỗ trợ locationType của booking
- Booking chưa quá giờ hẹn
- Staff không được nhận nhiều booking trùng ngày + giờ
- Transaction để tránh race condition

**Validation:**
- `400` — Booking không ở trạng thái PENDING hoặc đã quá giờ hẹn
- `403` — Staff không phục vụ service này hoặc không hỗ trợ locationType
- `404` — Booking không tồn tại
- `409` — Booking đã có người nhận hoặc staff đã có booking trùng giờ

**Response: 200 OK**

```json
{
  "id": "booking-id",
  "orderCode": "BK1A2B3C4D5E",
  "status": "confirmed",
  "staffServiceId": "staff-svc-id",
  "staffName": "Tran Van B",
  "confirmedAt": "2026-05-16T08:30:00.000Z",
  "customerId": "customer-id",
  "customerName": "Nguyen Van A",
  "customerPhone": "0901234567",
  "customerEmail": "customer@example.com",
  "serviceId": "service-id",
  "serviceName": "Basic Cleaning",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00",
  "quotedPrice": 300000,
  "totalPrice": 300000
}
```

---

### 7. Assign Staff (Admin only)

Admin gán nhân viên cho booking bất kỳ.

**Endpoint:** `PATCH /api/bookings/:id/assign-staff`

**Authentication:** Required

**Authorization:** ADMIN only

**Request Body:**

```typescript
{
  staffId: string;          // UUID của staff cần gán (required)
  forceAssign?: boolean;    // Bỏ qua cảnh báo nếu staff chưa có staffService (optional)
}
```

**Logic:**
- Admin có thể gán staff cho booking bất kỳ (không check skill match)
- Nếu staff chưa có staffService cho service của booking:
  - **Lần 1** (forceAssign không có hoặc = false): Trả về cảnh báo
  - **Lần 2** (forceAssign = true): Auto tạo staffService và gán luôn
- Nếu booking đang PENDING → chuyển sang CONFIRMED và set confirmedAt
- Không thể gán cho booking COMPLETED hoặc CANCELLED

**Response: 200 OK (Success)**

```json
{
  "id": "booking-id",
  "orderCode": "BK1A2B3C4D5E",
  "status": "confirmed",
  "staffServiceId": "staff-svc-id",
  "staffName": "Tran Van B",
  "confirmedAt": "2026-05-16T08:30:00.000Z",
  "customerId": "customer-id",
  "customerName": "Nguyen Van A",
  "customerPhone": "0901234567",
  "customerEmail": "customer@example.com",
  "serviceId": "service-id",
  "serviceName": "Basic Cleaning",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00"
}
```

**Response: 200 OK (Warning — cần xác nhận)**

```json
{
  "warning": "Nhân viên chưa đăng ký dịch vụ này, bạn có muốn tiếp tục gán không?"
}
```

**Error Responses:**
- `400 Bad Request` — Không thể gán staff cho booking đã hoàn thành hoặc đã hủy
- `404 Not Found` — Booking hoặc staff không tồn tại

---

## Pricing Calculation

### Formula:

```
Base Price = service.basePrice × estimatedHours
Addons Total = Σ(addon.basePrice)
Total Price = Base Price + Addons Total
```

### Example:

```
Service: Basic Cleaning
- basePrice: 100,000 VND/hour
- estimatedHours: 3 hours

Addons:
- Electronics Cleaning: 30,000 VND
- Glass Cleaning: 20,000 VND

Calculation:
- Base Price = 100,000 × 3 = 300,000 VND
- Addons Total = 30,000 + 20,000 = 50,000 VND
- Total Price = 300,000 + 50,000 = 350,000 VND
```

---

## Sample Data

### Sample Services (Insert vào DB trước khi test)

```sql
INSERT INTO services (
  id,
  name,
  category,
  supported_location_types,
  description,
  base_price,
  duration,
  is_active,
  created_at,
  updated_at
) VALUES
(
  '4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b',
  'Basic Cleaning',
  'cleaning',
  ARRAY['home', 'at_shop']::service_location_type_enum[],
  'Dọn dẹp cơ bản bao gồm quét nhà, lau sàn, dọn bàn ghế',
  100000,
  120,
  true,
  NOW(),
  NOW()
),
(
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Deep Cleaning',
  'cleaning',
  ARRAY['home']::service_location_type_enum[],
  'Dọn dẹp sâu bao gồm vệ sinh tường, trần, góc khuất',
  150000,
  180,
  true,
  NOW(),
  NOW()
);
```

### Sample Addon Services (Fake Data)

Hiện tại addon services dùng fake data trong code:

```typescript
// src/modules/bookings/fake-data/services-fake-data.ts

const addonServices = {
  'addon-electronics': {
    name: 'Electronics Cleaning',
    basePrice: 30000
  },
  'addon-glass': {
    name: 'Glass Cleaning',
    basePrice: 20000
  },
  'addon-carpet': {
    name: 'Carpet Deep Clean',
    basePrice: 50000
  }
};
```

### Sample Test Cases

**Test Case 1: Tạo booking tại nhà thành công**
```json
POST /api/bookings
{
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "locationType": "home",
  "address": "123 Nguyen Hue, Quan 1, TP.HCM",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00",
  "estimatedHours": 3,
  "addonServiceIds": ["addon-electronics"],
  "specialRequests": "Cần dọn kỹ phòng khách"
}
```

**Test Case 2: Tạo booking tại shop thành công**
```json
POST /api/bookings
{
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "locationType": "at_shop",
  "bookingDate": "2026-05-22",
  "bookingTime": "14:30",
  "estimatedHours": 2
}
```

**Test Case 3: Lỗi - Thiếu address 
```json
POST /api/bookings
{
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "locationType": "home",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00"
}
// Expected: 400 Bad Request - "Địa chỉ bắt buộc "
```

**Test Case 4: Lỗi - Booking date trong quá khứ**
```json
POST /api/bookings
{
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "locationType": "home",
  "address": "123 Test St",
  "bookingDate": "2026-05-10",
  "bookingTime": "09:00"
}
// Expected: 400 Bad Request - "Ngày và giờ đặt lịch phải lớn hơn thời điểm hiện tại"
```

**Test Case 5: Lỗi - Customer đã có booking active**
```json
// Tạo booking thứ 2 khi booking thứ 1 vẫn PENDING
POST /api/bookings
{
  "serviceId": "4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b",
  "locationType": "home",
  "address": "456 Test St",
  "bookingDate": "2026-05-25",
  "bookingTime": "10:00"
}
// Expected: 409 Conflict - "Bạn đã có booking đang hoạt động..."
```

---

## Testing với Postman

### Create Booking Request
```
Method: POST
URL: {{base_url}}/bookings
Headers:
  Authorization: Bearer {{customer_token}}
  Content-Type: application/json
Body (raw JSON):
{
  "serviceId": "{{service_id}}",
  "locationType": "home",
  "address": "123 Nguyen Hue, Quan 1, TP.HCM",
  "bookingDate": "2026-05-20",
  "bookingTime": "09:00",
  "estimatedHours": 3,
  "addonServiceIds": ["addon-electronics", "addon-glass"],
  "specialRequests": "Cần dọn kỹ phòng khách",
  "notes": "Gọi trước 15 phút"
}
```

---

## Implemented Features

### ✅ Create Booking (POST /api/bookings)
- Customer tạo booking mới
- Transaction với pessimistic lock (tránh race condition)
- Validation: customer chỉ có 1 booking active, address bắt buộc, estimatedHours bắt buộc, datetime trong tương lai (strict <)
- Response: status=PENDING, staff chưa assign

### ✅ Get Booking History (GET /api/bookings)
- Admin: Xem tất cả bookings
- Customer: Xem bookings của mình
- Staff: Xem bookings được gán cho mình (staffService IS NOT NULL)
- Filter: status, bookingDateFrom, bookingDateTo
- Pagination: page, limit

### ✅ Get Booking Details (GET /api/bookings/:id)
- Admin: Xem mọi booking
- Customer: Chỉ xem booking của mình
- Staff: Chỉ xem booking được gán

### ✅ Get Available Bookings (GET /api/bookings/available)
- Staff only
- Chỉ hiển thị booking PENDING, chưa có staff, match service & locationType
- Tự động lọc bỏ booking đã quá giờ hẹn

### ✅ Cancel Booking (PATCH /api/bookings/:id/cancel)
- Customer: Chỉ hủy được khi status=PENDING
- Admin: Hủy được status=PENDING, CONFIRMED, IN_PROGRESS
- Không thể hủy khi status=COMPLETED hoặc CANCELLED

### ✅ Accept Booking (PATCH /api/bookings/:id/accept)
- Staff nhận booking chưa có ai gán
- Transaction đảm bảo atomic
- Validate: booking PENDING, chưa có staff, staff match service + locationType
- Validate: booking chưa quá giờ hẹn
- Validate: staff không nhận trùng giờ với booking khác

### ✅ Assign Staff (PATCH /api/bookings/:id/assign-staff)
- Admin gán staff cho booking bất kỳ (không check skill match)
- Two-step confirmation: lần 1 cảnh báo nếu staff chưa có staffService, lần 2 force gán
- Auto tạo staffService nếu chưa có (khi forceAssign=true)
- Nếu booking PENDING → chuyển sang CONFIRMED

---

## Next Features (Chưa implement)

1. **PATCH /api/bookings/:id** - Update booking details
2. **PATCH /api/bookings/:id/start** - Start service (Staff)
3. **PATCH /api/bookings/:id/complete** - Complete service (Staff)
4. **POST /api/bookings/:id/reschedule** - Reschedule booking
5. **POST /api/bookings/:id/payment** - Thanh toán booking

---

## Notes

- Booking mới luôn có `status = PENDING` và `staff_service_id = null`
- Staff được gán qua 2 cách: staff tự nhận (`/accept`) hoặc admin gán (`/assign-staff`)
- Order code format: `BK` + timestamp(base36) + random(4 chars)
- Pricing tính từ `service.basePrice × estimatedHours`, không dùng `staffService.customPrice`
- Addon services hiện tại dùng fake data, sau này sẽ có bảng riêng
- Một customer chỉ có thể có 1 booking active tại một thời điểm
- Response đã bao gồm `customerPhone` và `customerEmail` để staff liên hệ
- Create booking chạy trong transaction với pessimistic lock để tránh race condition
- Staff accept booking cũng chạy trong transaction để đảm bảo atomic
