
# staffs API

> Base URL: `/staffs` — Tất cả endpoint yêu cầu `Authorization: Bearer <token>`

---

## Luồng nghiệp vụ

```
User đăng ký → Tạo hồ sơ (apply) → Điền thông tin + upload giấy tờ → Admin duyệt/từ chối → staff hoạt động
```

### Phía staff

1. **Đăng ký** — `POST /:userId/apply`
2. **Hoàn thiện hồ sơ** — `PATCH /:id` (thông tin) → `PATCH /:id/avatar` → `PATCH /:id/documents`
3. **Chờ duyệt** — Xem hồ sơ qua `GET /profile`
4. **Sau khi approved** — `GET /presence/me` · `PATCH /presence/me`

### Phía Admin

1. **Xem hồ sơ** — `GET /:id` → `GET /:id/documents` Hoặc `GET /:id/documents/:type`
2. **Duyệt / Từ chối** — `PATCH /:id/approve` · `PATCH /:id/reject`

---

## Mục lục

| # | Method | Endpoint | Mô tả |
|---|--------|----------|-------|
| 1 | `POST` | `/:userId/apply` | Tạo hồ sơ staff |
| 2 | `PATCH` | `/:id` | Cập nhật thông tin |
| 3 | `PATCH` | `/:id/avatar` | Upload avatar |
| 4 | `PATCH` | `/:id/documents` | Upload giấy tờ |
| 5 | `GET` | `/profile` | Xem hồ sơ bản thân |
| 6 | `GET` | `/:id` | Xem hồ sơ theo ID |
| 7 | `GET` | `/:id/documents` | Xem tất cả giấy tờ |
| 8 | `GET` | `/:id/documents/:type` | Xem giấy tờ theo loại |
| 9 | `GET` | `/presence/me` | Xem trạng thái hoạt động |
| 10 | `PATCH` | `/presence/me` | Cập nhật trạng thái |
| 11 | `PATCH` | `/:id/approve` | Duyệt staff *(Admin)* |
| 12 | `PATCH` | `/:id/reject` | Từ chối staff *(Admin)* |

---

## 1. POST `/:userId/apply`

Tạo hồ sơ đăng ký staff cho user.

**Quyền:** User tự tạo cho mình hoặc Admin tạo hộ.

### Response `201 Created`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fullName": "Nguyễn Văn A",
  "phone": null,
  "skills": null,
  "experience": null,
  "bio": null,
  "avatarUrl": null,
  "hasCitizenCardImage": false,
  "hasCertificateImage": false,
  "totalJobs": 0,
  "avgRating": 0,
  "approvalStatus": "pending",
  "createdAt": "2026-04-03T08:00:00.000Z",
  "updatedAt": "2026-04-03T08:00:00.000Z"
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `404` | User không tồn tại |
| `403` | Không có quyền tạo hồ sơ cho người khác |
| `409` | Hồ sơ đã tồn tại |

---

## 2. PATCH `/:id`

Cập nhật thông tin hồ sơ staff (phone, skills, experience, bio).

**Quyền:** Chủ hồ sơ hoặc Admin.

### Request

```http
PATCH /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "phone": "0987654321",
  "skills": "Sửa điện, lắp đặt điều hòa, sửa máy giặt",
  "experience": "7 năm kinh nghiệm trong lĩnh vực điện lạnh",
  "bio": "Thợ điện lạnh chuyên nghiệp, phục vụ tận tâm"
}
```

> Tất cả fields đều **optional** — chỉ gửi fields cần cập nhật.

| Field | Type | Giới hạn |
|-------|------|---------|
| `phone` | string | 10–11 chữ số |
| `skills` | string | Tối đa 500 ký tự |
| `experience` | string | Tối đa 1000 ký tự |
| `bio` | string | Tối đa 1000 ký tự |

### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fullName": "Nguyễn Văn A",
  "phone": "0987654321",
  "skills": "Sửa điện, lắp đặt điều hòa, sửa máy giặt",
  "experience": "7 năm kinh nghiệm trong lĩnh vực điện lạnh",
  "bio": "Thợ điện lạnh chuyên nghiệp, phục vụ tận tâm",
  "avatarUrl": "https://res.cloudinary.com/xxx/image/upload/avatar.jpg",
  "hasCitizenCardImage": true,
  "hasCertificateImage": false,
  "totalJobs": 42,
  "avgRating": 4.8,
  "approvalStatus": "pending",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-03T09:30:00.000Z"
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `404` | Không tìm thấy staff |
| `403` | Không có quyền cập nhật |
| `400` | Dữ liệu không hợp lệ |

---

## 3. PATCH `/:id/avatar`

Upload hoặc thay thế avatar. Ảnh cũ tự động bị xóa trên Cloudinary.

**Quyền:** Chủ hồ sơ hoặc Admin.  
**Content-Type:** `multipart/form-data`  
**Giới hạn:** File ảnh `image/*`, tối đa **5MB**.

### Request

```http
PATCH /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Type | Mô tả |
|-------|------|-------|
| `avatar` | file (image) | Ảnh đại diện — **bắt buộc** |

### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fullName": "Nguyễn Văn A",
  "phone": "0987654321",
  "avatarUrl": "https://res.cloudinary.com/xxx/image/upload/v1234/new_avatar.jpg",
  "approvalStatus": "pending",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-03T10:00:00.000Z"
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `400` | Không có file / File không phải ảnh / Vượt 5MB |
| `403` | Không có quyền |
| `404` | Không tìm thấy staff |

---

## 4. PATCH `/:id/documents`

Upload giấy tờ xác minh (CCCD, chứng chỉ). **Thay thế toàn bộ** giấy tờ cũ của loại tương ứng.

**Quyền:** Chủ hồ sơ hoặc Admin.  
**Lưu ý:** **Không thể** upload khi staff đã được `approved`.  
**Content-Type:** `multipart/form-data`  
**Giới hạn mỗi file:** 5MB, chỉ `image/*`.

### Request

```http
PATCH /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Type | Tối đa | Mô tả |
|-------|------|--------|-------|
| `citizenCard` | file[] (image) | **2** | Ảnh CCCD (mặt trước + mặt sau) |
| `certificate` | file[] (image) | **10** | Ảnh chứng chỉ nghề, bằng cấp |

> Có thể gửi chỉ `citizenCard`, chỉ `certificate`, hoặc cả hai cùng lúc.

### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fullName": "Nguyễn Văn A",
  "phone": "0987654321",
  "hasCitizenCardImage": true,
  "hasCertificateImage": true,
  "approvalStatus": "pending",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-03T10:15:00.000Z"
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `400` | Quá số lượng file / File không phải ảnh / Vượt 5MB |
| `403` | Không có quyền HOẶC staff đã được approved |
| `404` | Không tìm thấy staff |

---

## 5. GET `/profile`

Lấy hồ sơ staff của chính mình (theo token).

**Quyền:** Chủ hồ sơ hoặc Admin.

### Request

```http
GET /staffs/profile
Authorization: Bearer <token>
```

### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "skills": "Sửa điện, sửa nước",
  "experience": "5 năm kinh nghiệm",
  "bio": "Thợ chuyên nghiệp, uy tín",
  "avatarUrl": "https://res.cloudinary.com/xxx/image/upload/avatar.jpg",
  "hasCitizenCardImage": true,
  "hasCertificateImage": true,
  "totalJobs": 42,
  "avgRating": 4.8,
  "approvalStatus": "approved",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-03T08:00:00.000Z"
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `404` | Không tìm thấy hồ sơ staff |
| `403` | Không có quyền truy cập |

---

## 6. GET `/:id`

Xem hồ sơ staff theo staff profile ID.

**Quyền:**
- **Admin** — xem bất kỳ staff nào (mọi trạng thái)
- **Chủ hồ sơ** — xem hồ sơ của chính mình
- **Người khác** — chỉ xem được staff đã `approved`

### Request

```http
GET /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <token>
```

### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "skills": "Sửa điện, sửa nước",
  "experience": "5 năm kinh nghiệm",
  "bio": "Thợ chuyên nghiệp, uy tín",
  "avatarUrl": "https://res.cloudinary.com/xxx/image/upload/avatar.jpg",
  "hasCitizenCardImage": true,
  "hasCertificateImage": true,
  "totalJobs": 42,
  "avgRating": 4.8,
  "approvalStatus": "approved",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-03T08:00:00.000Z"
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `404` | Không tìm thấy staff (hoặc chưa approved đối với user thường) |

---

## 7. GET `/:id/documents`

Lấy danh sách tất cả giấy tờ của staff.

**Quyền:** Chủ hồ sơ hoặc Admin.

### Request

```http
GET /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents
Authorization: Bearer <token>
```

### Response `200 OK`

```json
{
  "documents": [
    {
      "id": "doc-uuid-001",
      "type": "citizenCard",
      "fileUrl": "https://res.cloudinary.com/xxx/image/upload/cccd_front.jpg",
      "createdAt": "2026-04-03T10:15:00.000Z"
    },
    {
      "id": "doc-uuid-002",
      "type": "citizenCard",
      "fileUrl": "https://res.cloudinary.com/xxx/image/upload/cccd_back.jpg",
      "createdAt": "2026-04-03T10:15:00.000Z"
    },
    {
      "id": "doc-uuid-003",
      "type": "certificate",
      "fileUrl": "https://res.cloudinary.com/xxx/image/upload/cert_dien.jpg",
      "createdAt": "2026-04-03T10:15:00.000Z"
    }
  ]
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `404` | Không tìm thấy staff |
| `403` | Không có quyền truy cập |

---

## 8. GET `/:id/documents/:type`

Lấy danh sách URL giấy tờ theo loại.

**Quyền:** Chủ hồ sơ hoặc Admin.

| `:type` | Mô tả |
|---------|-------|
| `citizenCard` | Ảnh CCCD |
| `certificate` | Ảnh chứng chỉ |

### Request

```http
GET /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/documents/citizenCard
Authorization: Bearer <token>
```

### Response `200 OK`

```json
{
  "files": [
    "https://res.cloudinary.com/xxx/image/upload/cccd_front.jpg",
    "https://res.cloudinary.com/xxx/image/upload/cccd_back.jpg"
  ]
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `400` | `type` không hợp lệ (chỉ chấp nhận `citizenCard`, `certificate`) |
| `403` | Không có quyền |
| `404` | Không tìm thấy staff HOẶC chưa có ảnh loại này |

---

## 9. GET `/presence/me`

Lấy trạng thái hoạt động hiện tại của staff đang đăng nhập.

**Quyền:** Chỉ user có role `staff` và đã được `approved`.

### Request

```http
GET /staffs/presence/me
Authorization: Bearer <token>
```

### Response `200 OK`

```json
{
  "staffId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "OFFLINE",
  "isBusy": false,
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-03T10:00:00.000Z"
}
```

> `status`: `"ONLINE"` | `"OFFLINE"` — `isBusy`: `true` khi đang thực hiện job

### Lỗi

| Status | Mô tả |
|--------|-------|
| `403` | Không phải role `staff` HOẶC chưa được approved |
| `404` | Không tìm thấy hồ sơ staff |

---

## 10. PATCH `/presence/me`

Cập nhật trạng thái hoạt động (ONLINE/OFFLINE).

**Quyền:** Chỉ user có role `staff` và đã được `approved`.

### Request

```http
PATCH /staffs/presence/me
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "status": "ONLINE"
}
```

| Field | Type | Giá trị hợp lệ |
|-------|------|----------------|
| `status` | string | `"ONLINE"` \| `"OFFLINE"` |

### Response `200 OK`

```json
{
  "staffId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ONLINE",
  "isBusy": false,
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-04-03T11:00:00.000Z"
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `400` | `status` không hợp lệ |
| `403` | Không phải role `staff` HOẶC chưa được approved |
| `404` | Không tìm thấy hồ sơ staff |

---

## 11. PATCH `/:id/approve`

Phê duyệt hồ sơ staff. Tự động:
- `approvalStatus` → `approved`
- Role user → `staff`
- Tạo `staffPresence` (OFFLINE) nếu chưa có
- Gửi email thông báo

**Quyền:** Chỉ **Admin**.

### Request

```http
PATCH /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/approve
Authorization: Bearer <admin_token>
```

### Response `200 OK`

```json
{
  "message": "Phê duyệt hồ sơ staff thành công",
  "staff": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "Nguyễn Văn A",
    "phone": "0987654321",
    "skills": "Sửa điện, lắp đặt điều hòa",
    "approvalStatus": "approved",
    "lastChangedByAdminId": "admin-uuid-001",
    "lastChangedByAdminName": "Admin Trần B",
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-04-03T11:30:00.000Z"
  }
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `400` | staff đã được phê duyệt trước đó |
| `403` | Không phải Admin |
| `404` | Không tìm thấy staff |

---

## 12. PATCH `/:id/reject`

Từ chối hồ sơ staff. Gửi email thông báo từ chối.

**Quyền:** Chỉ **Admin**.

### Request

```http
PATCH /staffs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/reject
Authorization: Bearer <admin_token>
```

### Response `200 OK`

```json
{
  "message": "Từ chối hồ sơ staff thành công",
  "staff": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "Nguyễn Văn A",
    "phone": "0987654321",
    "approvalStatus": "rejected",
    "lastChangedByAdminId": "admin-uuid-001",
    "lastChangedByAdminName": "Admin Trần B",
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-04-03T11:45:00.000Z"
  }
}
```

### Lỗi

| Status | Mô tả |
|--------|-------|
| `400` | staff đã bị từ chối trước đó |
| `403` | Không phải Admin |
| `404` | Không tìm thấy staff |

---

## Tổng hợp Endpoints

### staff — Đăng ký & hoàn thiện hồ sơ

| # | Method | Endpoint | Quyền | Mô tả |
|---|--------|----------|-------|-------|
| 1 | `POST` | `/:userId/apply` | User/Admin | Tạo hồ sơ staff |
| 2 | `PATCH` | `/:id` | Owner/Admin | Cập nhật thông tin |
| 3 | `PATCH` | `/:id/avatar` | Owner/Admin | Upload avatar |
| 4 | `PATCH` | `/:id/documents` | Owner/Admin | Upload giấy tờ |

### staff — Xem thông tin

| # | Method | Endpoint | Quyền | Mô tả |
|---|--------|----------|-------|-------|
| 5 | `GET` | `/profile` | Owner/Admin | Xem hồ sơ bản thân (theo token) |
| 6 | `GET` | `/:id` | Tất cả* | Xem hồ sơ theo ID |
| 7 | `GET` | `/:id/documents` | Owner/Admin | Xem tất cả giấy tờ |
| 8 | `GET` | `/:id/documents/:type` | Owner/Admin | Xem giấy tờ theo loại |

> \* User thường chỉ xem được staff đã `approved`

### staff — Trạng thái hoạt động (sau khi approved)

| # | Method | Endpoint | Quyền | Mô tả |
|---|--------|----------|-------|-------|
| 9 | `GET` | `/presence/me` | staff (approved) | Xem trạng thái |
| 10 | `PATCH` | `/presence/me` | staff (approved) | Cập nhật trạng thái |

### Admin — Duyệt hồ sơ

| # | Method | Endpoint | Quyền | Mô tả |
|---|--------|----------|-------|-------|
| 11 | `PATCH` | `/:id/approve` | **Admin** | Phê duyệt staff |
| 12 | `PATCH` | `/:id/reject` | **Admin** | Từ chối staff |
