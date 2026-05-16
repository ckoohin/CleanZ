# Bookings Module - API Documentation

## Tổng quan
Module Bookings quản lý việc đặt lịch dịch vụ của khách hàng. Booking được tạo ở trạng thái PENDING và chưa có staff được gán, sau đó admin hoặc staff sẽ nhận việc.

---

## Entities

### 1. BookingEntity

**Table:** `bookings`

**Description:** Lưu trữ thông tin đặt lịch dịch vụ của khách hàng

**Columns:**

| Column | Type | Nullable | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | uuid | NO | Primary key | `550e8400-e29b-41d4-a716-446655440000` |
| `order_code` | varchar(20) | NO | Mã đơn hàng duy nhất | `BK1A2B3C4D5E` |
| `customer_id` | uuid | NO | FK to customers.id | `550e8400-e29b-41d4-a716-446655440001` |
| `service_id` | uuid | NO | FK to services.id | `4f4f0dc4-2ed0-4a6f-bd04-e802cc8b8d9b` |
| `staff_service_id` | uuid | YES | FK to staff_services.id (null khi chưa assign) | `null` hoặc uuid |
| `booking_type` | enum | NO | Loại booking (scheduled/instant) | `scheduled` |
| `location_type` | enum | NO | Địa điểm dịch vụ (home/at_shop) | `home` |
| `address` | text | NO | Địa chỉ cụ thể (bắt buộc cho cả home và at_shop) | `123 Nguyen Hue, Q1, HCMC` |
| `booking_date` | date | NO | Ngày đặt lịch | `2026-05-20` |
| `booking_time` | time | NO | Giờ đặt lịch | `09:00` |
| `estimated_hours` | decimal(5,2) | YES | Số giờ ước tính | `3.00` |
| `actual_hours` | decimal(5,2) | YES | Số giờ thực tế (sau khi hoàn thành) | `3.50` |
| `hourly_rate` | decimal(10,2) | YES | Giá theo giờ | `100000.00` |
| `quoted_price` | decimal(10,2) | NO | Giá dự kiến ban đầu | `300000.00` |
| `total_price` | decimal(10,2) | NO | Tổng giá cuối cùng | `350000.00` |
| `special_requests` | text | YES | Yêu cầu đặc biệt | `Cần dọn kỹ phòng khách` |
| `notes` | text | YES | Ghi chú thêm | `Gọi trước 15 phút` |
| `status` | enum | NO | Trạng thái booking | `pending` |
| `payment_status` | enum | NO | Trạng thái thanh toán | `unpaid` |
| `confirmed_at` | timestamp | YES | Thời điểm xác nhận | `2026-05-15T04:30:00Z` |
| `cancelled_by` | uuid | YES | ID người hủy booking | `null` hoặc uuid |
| `cancellation_reason` | text | YES | Lý do hủy booking | `Có việc đột xuất` |
| `cancelled_at` | timestamp | YES | Thời điểm hủy | `2026-05-15T10:30:00Z` |
| `rescheduled_from` | uuid | YES | ID booking gốc nếu là reschedule | `null` hoặc uuid |
| `created_at` | timestamp | NO | Thời điểm tạo | `2026-05-15T04:22:45Z` |
| `updated_at` | timestamp | NO | Thời điểm cập nhật | `2026-05-15T04:22:45Z` |

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
1. ✅ Một customer chỉ có thể có 1 booking active (PENDING/CONFIRMED/IN_PROGRESS)
2. ✅ Booking mới tạo có `status = PENDING` và `staff_service_id = null`
3. ✅ `order_code` được generate tự động và unique
4. ✅ `booking_date` + `booking_time` phải trong tương lai
5. ✅ `address` bắt buộc cho cả `location_type = home` và `at_shop`
6. ✅ `service` phải active và hỗ trợ `location_type` được chọn
7. ✅ Customer chỉ có thể hủy booking ở trạng thái PENDING
8. ✅ Admin có thể hủy booking ở trạng thái PENDING, CONFIRMED, IN_PROGRESS

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
  address?: string;               // Địa chỉ (required nếu locationType = 'home')
  bookingDate: string;            // Ngày đặt lịch YYYY-MM-DD (required)
  bookingTime: string;            // Giờ đặt lịch HH:mm (required)
  estimatedHours?: number;        // Số giờ ước tính (optional, min: 0.5)
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
5. BookingsService.create()
   ├─ Check customer profile exists
   ├─ Check active booking (Rule 1)
   ├─ Validate service exists & active
   ├─ Validate location type supported
   ├─ Validate address (bắt buộc cho cả HOME và AT_SHOP)
   ├─ Validate datetime in future
   ├─ Calculate pricing (base + addons)
   ├─ Generate unique order code (Rule 3)
   └─ Create booking without staff (Rule 2)
   ↓
6. Save to database
   ↓
7. Return BookingResponseDto
```

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

### ✅ Create Booking (POST /api/v1/bookings)
- Customer tạo booking mới
- Validation: customer chỉ có 1 booking active, address bắt buộc, datetime trong tương lai
- Response: status=PENDING, staff chưa assign

### ✅ Get Booking History (GET /api/v1/bookings)
- Admin: Xem tất cả bookings
- Customer: Xem bookings của mình
- Staff: Xem bookings được gán cho mình
- Filter: status, bookingDateFrom, bookingDateTo
- Pagination: page, limit

### ✅ Get Booking Details (GET /api/v1/bookings/:id)
- Admin: Xem mọi booking
- Customer: Chỉ xem booking của mình
- Staff: Chỉ xem booking được gán

### ✅ Cancel Booking (PATCH /api/v1/bookings/:id/cancel)
- Customer: Chỉ hủy được khi status=PENDING
- Admin: Hủy được status=PENDING, CONFIRMED, IN_PROGRESS
- Không thể hủy khi status=COMPLETED hoặc CANCELLED

---

## Next Features (Chưa implement)

1. **PATCH /api/bookings/:id** - Update booking
2. **POST /api/bookings/:id/assign-staff** - Assign staff (Admin/Staff)
3. **PATCH /api/bookings/:id/confirm** - Confirm booking (Staff)
4. **PATCH /api/bookings/:id/start** - Start service (Staff)
5. **PATCH /api/bookings/:id/complete** - Complete service (Staff)
6. **POST /api/bookings/:id/reschedule** - Reschedule booking

---

## Notes

- Booking mới luôn có `status = PENDING` và `staffServiceId = null`
- Staff sẽ được gán sau thông qua endpoint riêng (chưa implement)
- Order code format: `BK` + timestamp(base36) + random(4 chars)
- Pricing tính từ `service.basePrice`, không dùng `staffService.customPrice`
- Addon services hiện tại dùng fake data, sau này sẽ có bảng riêng
- Một customer chỉ có thể có 1 booking active tại một thời điểm
