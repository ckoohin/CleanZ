# API danh sách dịch vụ đặt booking

```http
GET /api/v1/services?page=1&limit=20&search=dọn
```

API public, chỉ trả dịch vụ đang hoạt động, có thời lượng hợp lệ và có cấu hình
giá đang hoạt động.

Các trường chính:

- `id`: dùng làm `serviceId` cho quote và tạo booking.
- `baseDurationHours`: thời lượng của gói.
- `pricing.basePrice`: giá cơ bản để hiển thị.
- `pricing.petFee`, `pricing.waitingFee`: phụ phí cấu hình.
- `thumbnailUrl`, `galleryUrls`: hình ảnh dịch vụ.
- `includedTasks`, `excludedTasks`: phạm vi công việc.

Giá tại danh sách chỉ dùng để hiển thị. Trước khi tạo booking, Customer vẫn phải
gọi API quote để backend tính lại giờ cao điểm, vật nuôi, voucher và tổng tiền.
