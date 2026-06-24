/**
 * Seed: Default Service Policies (CleanZ)
 * Chạy bằng: npx ts-node src/database/seeds/policy.seed.ts
 * Hoặc gọi endpoint POST /api/v1/policy/seed (xem PolicyController)
 */
import { PolicyCategory, PolicyRole } from '../../modules/policy/entity/policy.entity';

export const DEFAULT_POLICIES: Array<{
  title: string;
  slug: string;
  content: string;
  role: PolicyRole;
  category: PolicyCategory;
  iconEmoji: string;
  isDefault: boolean;
  sortOrder: number;
}> = [
  // ══════════════════════════════════════════════════════════
  // LEGAL — Pháp lý & Điều khoản
  // ══════════════════════════════════════════════════════════
  {
    title: 'Điều khoản sử dụng dịch vụ',
    slug: 'terms-of-service',
    category: PolicyCategory.LEGAL,
    role: PolicyRole.ALL,
    iconEmoji: '⚖️',
    isDefault: true,
    sortOrder: 1,
    content: `## Điều khoản sử dụng dịch vụ CleanZ

**1. Chấp nhận điều khoản**
Khi đặt lịch dịch vụ trên CleanZ, bạn đồng ý tuân thủ toàn bộ điều khoản này.

**2. Phạm vi dịch vụ**
- Dịch vụ chỉ được thực hiện tại địa chỉ do khách hàng cung cấp.
- CleanZ không chịu trách nhiệm về thiệt hại do thông tin sai lệch từ phía khách hàng.

**3. Trách nhiệm của khách hàng**
- Cung cấp đúng địa chỉ và thông tin liên hệ.
- Đảm bảo an toàn cho nhân viên trong quá trình làm việc.
- Không yêu cầu nhân viên thực hiện ngoài phạm vi dịch vụ đã đặt.

**4. Quyền sở hữu & Bảo mật**
CleanZ cam kết bảo mật thông tin cá nhân theo quy định pháp luật Việt Nam (Luật An toàn thông tin mạng 2015).

**5. Giải quyết tranh chấp**
Mọi tranh chấp được giải quyết theo pháp luật Việt Nam tại Tòa án nhân dân có thẩm quyền tại TP.HCM.`,
  },
  {
    title: 'Chính sách bảo mật thông tin',
    slug: 'privacy-policy',
    category: PolicyCategory.LEGAL,
    role: PolicyRole.ALL,
    iconEmoji: '🔒',
    isDefault: true,
    sortOrder: 2,
    content: `## Chính sách bảo mật thông tin

**Thu thập thông tin**
CleanZ thu thập: họ tên, số điện thoại, địa chỉ, lịch sử đặt dịch vụ nhằm cung cấp và cải thiện dịch vụ.

**Sử dụng thông tin**
- Xác nhận và thực hiện đơn đặt lịch.
- Gửi thông báo liên quan đến dịch vụ.
- Cải thiện trải nghiệm sử dụng.

**Bảo mật**
Thông tin được mã hóa và lưu trữ an toàn. CleanZ không bán hoặc chia sẻ thông tin cho bên thứ ba không liên quan.

**Quyền của người dùng**
Bạn có quyền yêu cầu truy cập, chỉnh sửa hoặc xóa thông tin cá nhân bằng cách liên hệ support@cleanZ.vn.`,
  },
  {
    title: 'Trách nhiệm pháp lý & Bồi thường',
    slug: 'liability-compensation',
    category: PolicyCategory.LEGAL,
    role: PolicyRole.ALL,
    iconEmoji: '📋',
    isDefault: false,
    sortOrder: 3,
    content: `## Trách nhiệm pháp lý & Bồi thường

**Giới hạn trách nhiệm**
CleanZ chịu trách nhiệm tối đa bằng giá trị đơn dịch vụ trong trường hợp thiệt hại do lỗi của nhân viên.

**Không chịu trách nhiệm**
- Thiệt hại do lỗi thông tin từ khách hàng.
- Hư hỏng do vật phẩm đã xuống cấp trước khi dịch vụ.
- Sự kiện bất khả kháng (thiên tai, dịch bệnh...).

**Quy trình bồi thường**
1. Báo cáo sự cố trong vòng 24h sau dịch vụ.
2. Cung cấp bằng chứng (ảnh/video).
3. CleanZ xem xét và phản hồi trong 3-5 ngày làm việc.`,
  },

  // ══════════════════════════════════════════════════════════
  // CLEANING_STANDARD — Tiêu chuẩn dọn dẹp
  // ══════════════════════════════════════════════════════════
  {
    title: 'Tiêu chuẩn chất lượng dọn dẹp 5 sao',
    slug: 'cleaning-quality-standard',
    category: PolicyCategory.CLEANING_STANDARD,
    role: PolicyRole.ALL,
    iconEmoji: '🧹',
    isDefault: true,
    sortOrder: 1,
    content: `## Tiêu chuẩn chất lượng dọn dẹp 5 sao

**Quy trình chuẩn mỗi ca dọn dẹp:**
1. Kiểm tra và lập kế hoạch (5 phút đầu)
2. Dọn và thu gom rác
3. Lau bụi từ trên xuống dưới
4. Vệ sinh nhà bếp & nhà tắm
5. Hút bụi/lau sàn
6. Kiểm tra lần cuối & chụp ảnh hoàn thành

**Cam kết:**
- Hoàn thành 100% danh mục công việc đã thỏa thuận.
- Nhân viên mặc đồng phục, mang theo CMND/CCCD.
- Sử dụng đúng thiết bị và hóa chất được phê duyệt.`,
  },
  {
    title: 'Danh mục công việc thực hiện',
    slug: 'cleaning-scope-included',
    category: PolicyCategory.CLEANING_STANDARD,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '✅',
    isDefault: true,
    sortOrder: 2,
    content: `## Danh mục công việc được thực hiện

**Phòng khách & phòng ngủ:**
- Lau bụi tất cả bề mặt (bàn, kệ, tủ)
- Hút bụi và lau sàn
- Vệ sinh cửa sổ (mặt trong)
- Dọn gọn đồ vật theo yêu cầu

**Nhà bếp:**
- Lau chùi mặt bếp, bồn rửa
- Vệ sinh bên ngoài tủ lạnh, lò vi sóng
- Dọn rác, thay túi rác

**Nhà tắm/WC:**
- Cọ bồn rửa, toilet, lavabo
- Lau gương, gạch ốp tường
- Thay khăn tắm (nếu có yêu cầu)

> **Lưu ý:** Các công việc ngoài danh mục cần thỏa thuận thêm phụ phí.`,
  },
  {
    title: 'Danh mục công việc KHÔNG thực hiện',
    slug: 'cleaning-scope-excluded',
    category: PolicyCategory.CLEANING_STANDARD,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '🚫',
    isDefault: true,
    sortOrder: 3,
    content: `## Danh mục công việc KHÔNG thực hiện

Để đảm bảo an toàn và chất lượng dịch vụ, nhân viên CleanZ **KHÔNG** thực hiện:

- ❌ Leo trèo lên mái nhà, ban công không có lan can
- ❌ Di chuyển đồ vật nặng hơn 20kg
- ❌ Vệ sinh bên trong tủ lạnh, lò nướng (trừ gói Premium)
- ❌ Giặt quần áo, ủi đồ
- ❌ Trông trẻ em hoặc thú cưng
- ❌ Sửa chữa điện nước, đồ nội thất
- ❌ Xử lý vật dụng nguy hiểm (hóa chất độc hại, y tế...)

> Mọi yêu cầu ngoài danh sách cần đặt thêm dịch vụ chuyên biệt.`,
  },
  {
    title: 'Quy định sử dụng hóa chất an toàn',
    slug: 'chemical-safety-policy',
    category: PolicyCategory.CLEANING_STANDARD,
    role: PolicyRole.ALL,
    iconEmoji: '🧴',
    isDefault: true,
    sortOrder: 4,
    content: `## Quy định sử dụng hóa chất an toàn

**Hóa chất được phép sử dụng:**
- Chỉ dùng sản phẩm nằm trong danh mục được CleanZ phê duyệt.
- Ưu tiên sản phẩm thân thiện môi trường, không chứa clo, amoniac nồng độ cao.
- Hóa chất phải có nhãn mác rõ ràng, trong hạn sử dụng.

**An toàn cho gia đình:**
- Thông báo trước nếu gia đình có trẻ nhỏ, người cao tuổi, thú cưng.
- Thông gió phòng sau khi sử dụng hóa chất tẩy rửa mạnh.
- Không để hóa chất tiếp xúc với thực phẩm, nước uống.

**Nhân viên phải:**
- Đeo găng tay khi sử dụng hóa chất tẩy rửa.
- Không pha trộn hóa chất không được phép.`,
  },

  // ══════════════════════════════════════════════════════════
  // CANCELLATION — Hủy lịch & Hoàn tiền
  // ══════════════════════════════════════════════════════════
  {
    title: 'Chính sách hủy lịch & hoàn tiền',
    slug: 'cancellation-refund-policy',
    category: PolicyCategory.CANCELLATION,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '🔄',
    isDefault: true,
    sortOrder: 1,
    content: `## Chính sách hủy lịch & hoàn tiền

**Hủy trước 24 giờ:**
✅ Miễn phí hoàn toàn — hoàn tiền 100% trong 3–5 ngày làm việc.

**Hủy trong khoảng 4–24 giờ trước lịch:**
⚠️ Phí hủy 30% giá trị đơn dịch vụ. Hoàn lại 70%.

**Hủy trong vòng 4 giờ trước lịch:**
❌ Phí hủy 50% giá trị đơn dịch vụ. Hoàn lại 50%.

**Sau khi nhân viên đến nơi:**
❌ Phí hủy 100% (không hoàn tiền).

**Trường hợp ngoại lệ** (hoàn tiền 100%):
- Nhân viên không đến đúng giờ (trễ quá 30 phút).
- Lỗi hệ thống CleanZ.
- Sự kiện bất khả kháng được xác nhận.`,
  },
  {
    title: 'Quy trình hoàn tiền',
    slug: 'refund-process',
    category: PolicyCategory.CANCELLATION,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '💸',
    isDefault: false,
    sortOrder: 2,
    content: `## Quy trình hoàn tiền

**Thời gian xử lý:**
- Ví CleanZ: Hoàn ngay lập tức.
- Thẻ ngân hàng / Ví điện tử: 3–7 ngày làm việc.
- Tiền mặt: Không hoàn tiền mặt trực tiếp — chuyển vào ví CleanZ.

**Cách yêu cầu hoàn tiền:**
1. Vào mục "Đơn hàng" → Chọn đơn cần hủy.
2. Nhấn "Hủy đơn" và chọn lý do.
3. Hệ thống tự động tính phí và xác nhận hoàn tiền.

**Theo dõi:**
Trạng thái hoàn tiền được cập nhật trong ứng dụng và qua email.`,
  },

  // ══════════════════════════════════════════════════════════
  // INCIDENT_HANDLING — Xử lý sự cố
  // ══════════════════════════════════════════════════════════
  {
    title: 'Quy trình báo cáo sự cố',
    slug: 'incident-report-process',
    category: PolicyCategory.INCIDENT_HANDLING,
    role: PolicyRole.ALL,
    iconEmoji: '🛡️',
    isDefault: true,
    sortOrder: 1,
    content: `## Quy trình báo cáo sự cố

**Thời hạn báo cáo:** Trong vòng **24 giờ** sau khi dịch vụ hoàn thành.

**Cách báo cáo:**
1. Mở ứng dụng → "Lịch sử đơn" → Chọn đơn liên quan.
2. Nhấn "Báo cáo sự cố".
3. Mô tả chi tiết sự cố + đính kèm ảnh/video bằng chứng.
4. Gửi và nhận mã ticket hỗ trợ.

**Sau khi báo cáo:**
- CleanZ xem xét trong **2 giờ làm việc**.
- Liên hệ trực tiếp nếu cần thêm thông tin.
- Phản hồi chính thức trong **3 ngày làm việc**.

**Quan trọng:**
- Không tự ý sửa chữa trước khi CleanZ xác nhận.
- Giữ nguyên hiện trường để điều tra.`,
  },
  {
    title: 'Chính sách bồi thường thiệt hại',
    slug: 'damage-compensation-policy',
    category: PolicyCategory.INCIDENT_HANDLING,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '💼',
    isDefault: true,
    sortOrder: 2,
    content: `## Chính sách bồi thường thiệt hại

**CleanZ bồi thường khi:**
- Nhân viên vô ý làm hỏng/vỡ đồ vật.
- Thiệt hại được xác nhận trong quá trình thực hiện dịch vụ.

**Mức bồi thường:**
| Loại thiệt hại | Mức bồi thường |
|---|---|
| Đồ vật < 500.000đ | 100% giá trị |
| Đồ vật 500k–5 triệu | 100% giá trị (cần hóa đơn) |
| Đồ vật > 5 triệu | Thương lượng, tối đa 100% |

**Điều kiện:**
- Có bằng chứng rõ ràng (ảnh/video).
- Báo cáo trong 24h sau dịch vụ.
- Đồ vật chưa bị hư hỏng từ trước.

**Nguồn bồi thường:**
Trích từ tiền cọc của nhân viên (400.000đ), phần còn lại từ Quỹ bồi thường CleanZ.`,
  },
  {
    title: 'Xử lý mất tài sản trong quá trình dịch vụ',
    slug: 'theft-handling-policy',
    category: PolicyCategory.INCIDENT_HANDLING,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '🔐',
    isDefault: false,
    sortOrder: 3,
    content: `## Xử lý mất tài sản

**Phòng ngừa:**
- Cất giữ tài sản quý giá (trang sức, tiền mặt, điện thoại) trước khi nhân viên đến.
- CleanZ khuyến cáo không để tài sản giá trị cao không khóa.

**Khi nghi ngờ mất tài sản:**
1. Báo cáo ngay cho CleanZ qua hotline hoặc app.
2. CleanZ liên hệ nhân viên và xác minh.
3. Nếu cần, phối hợp với cơ quan công an.

**Lưu ý:**
CleanZ không chịu trách nhiệm với tài sản mất do:
- Không được bảo quản đúng cách.
- Mất từ trước khi nhân viên đến.`,
  },

  // ══════════════════════════════════════════════════════════
  // CUSTOMER_SUPPORT — Hỗ trợ khách hàng
  // ══════════════════════════════════════════════════════════
  {
    title: 'Cam kết hỗ trợ khách hàng',
    slug: 'customer-support-commitment',
    category: PolicyCategory.CUSTOMER_SUPPORT,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '🎧',
    isDefault: true,
    sortOrder: 1,
    content: `## Cam kết hỗ trợ khách hàng

**Kênh hỗ trợ:**
- 📱 App: Chat trực tiếp 7h–22h mỗi ngày
- 📞 Hotline: 1900-xxxx (7h–22h, kể cả cuối tuần)
- 📧 Email: support@cleanZ.vn (phản hồi trong 24h)

**Thời gian phản hồi cam kết:**
| Kênh | Thời gian phản hồi |
|---|---|
| Chat trong app | < 15 phút (giờ hành chính) |
| Hotline | Ngay lập tức |
| Email | < 24h làm việc |
| Sự cố khẩn cấp | < 2h |

**Bảo hành dịch vụ:**
Nếu không hài lòng với kết quả, báo cáo trong **48h** — CleanZ sẽ cử nhân viên đến làm lại **miễn phí**.`,
  },
  {
    title: 'Chính sách bảo hành 48h sau dịch vụ',
    slug: 'service-warranty-48h',
    category: PolicyCategory.CUSTOMER_SUPPORT,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '⭐',
    isDefault: true,
    sortOrder: 2,
    content: `## Chính sách bảo hành 48h

**Điều kiện áp dụng:**
- Dịch vụ đã hoàn thành và nhân viên đã rời đi.
- Yêu cầu bảo hành trong vòng **48 giờ** sau khi dịch vụ kết thúc.
- Phạm vi: Các hạng mục trong danh mục dịch vụ đã đặt.

**Cách yêu cầu bảo hành:**
1. Chụp ảnh khu vực chưa đạt yêu cầu.
2. Vào app → "Đơn hàng" → "Yêu cầu bảo hành".
3. Mô tả vấn đề và đính kèm ảnh.

**CleanZ cam kết:**
- Sắp xếp nhân viên đến làm lại trong **24h**.
- Ưu tiên cùng nhân viên đã làm trước (nếu có thể).
- **Hoàn toàn miễn phí**.`,
  },
  {
    title: 'Đánh giá và phản hồi dịch vụ',
    slug: 'review-feedback-policy',
    category: PolicyCategory.CUSTOMER_SUPPORT,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '⭐',
    isDefault: false,
    sortOrder: 3,
    content: `## Đánh giá và phản hồi dịch vụ

**Sau mỗi dịch vụ**, bạn có thể đánh giá theo 5 tiêu chí:
1. ⭐ Chất lượng dọn dẹp tổng thể
2. ⏰ Đúng giờ
3. 😊 Thái độ thân thiện
4. 🧹 Độ sạch sẽ
5. 🎯 Sự chuyên nghiệp

**Thời hạn:** 7 ngày sau khi dịch vụ hoàn thành.

**Ảnh hưởng đến nhân viên:**
- Đánh giá tốt → Tăng cơ hội nhận đơn, thăng hạng.
- Đánh giá kém → CleanZ hỗ trợ đào tạo lại, cảnh cáo hoặc đình chỉ nếu tái phạm.`,
  },

  // ══════════════════════════════════════════════════════════
  // PAYMENT — Thanh toán
  // ══════════════════════════════════════════════════════════
  {
    title: 'Phương thức và chính sách thanh toán',
    slug: 'payment-policy',
    category: PolicyCategory.PAYMENT,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '💳',
    isDefault: true,
    sortOrder: 1,
    content: `## Phương thức thanh toán

**Phương thức chấp nhận:**
- 💵 Tiền mặt (thanh toán trực tiếp cho nhân viên sau dịch vụ)
- 📱 MoMo, ZaloPay, VNPay
- 🏦 VietQR / Chuyển khoản ngân hàng
- 💰 Ví CleanZ (nạp tiền vào app)

**Thời điểm thanh toán:**
- Mặc định: Thanh toán **sau** khi dịch vụ hoàn thành.
- Ví CleanZ: Khóa tạm ứng khi xác nhận đơn, trừ sau khi hoàn thành.

**Hóa đơn:**
Tự động gửi qua email sau mỗi giao dịch thành công.

**Bảo mật:**
Mọi giao dịch được mã hóa SSL. CleanZ không lưu trữ thông tin thẻ ngân hàng.`,
  },
  {
    title: 'Chính sách giá & phụ phí',
    slug: 'pricing-surcharge-policy',
    category: PolicyCategory.PAYMENT,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '💰',
    isDefault: true,
    sortOrder: 2,
    content: `## Chính sách giá & phụ phí

**Giá niêm yết:**
Tất cả giá hiển thị đã bao gồm thuế VAT 10%.

**Các khoản phụ phí có thể phát sinh:**

| Loại phụ phí | Mức tính |
|---|---|
| Giờ cao điểm (17h–22h, cuối tuần) | +20–30% |
| Nhà có thú cưng | +50.000–100.000đ/ca |
| Chờ đợi (quá 15 phút) | 30.000đ/15 phút |
| Thêm thiết bị đặc biệt | Theo báo giá |

**Không phát sinh phụ phí:**
Mọi phụ phí phải được thông báo và xác nhận trước khi nhân viên bắt đầu làm việc.`,
  },

  // ══════════════════════════════════════════════════════════
  // GENERAL — Chính sách chung
  // ══════════════════════════════════════════════════════════
  {
    title: 'Quy tắc ứng xử với nhân viên',
    slug: 'staff-conduct-rules',
    category: PolicyCategory.GENERAL,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '🤝',
    isDefault: true,
    sortOrder: 1,
    content: `## Quy tắc ứng xử với nhân viên

**Để đảm bảo trải nghiệm tốt cho cả hai bên, khách hàng vui lòng:**

✅ **Nên:**
- Đón tiếp nhân viên đúng giờ đã hẹn.
- Mô tả rõ những khu vực cần chú ý.
- Cung cấp nước uống cho nhân viên nếu có điều kiện.
- Đánh giá trung thực sau khi hoàn thành.

❌ **Không nên:**
- Yêu cầu nhân viên làm ngoài phạm vi dịch vụ đã đặt.
- Có lời nói, hành vi thiếu tôn trọng nhân viên.
- Tự ý chụp ảnh nhân viên mà không được đồng ý.
- Đề nghị nhân viên thực hiện các công việc bất hợp pháp.

> Hành vi vi phạm có thể dẫn đến việc bị khóa tài khoản.`,
  },
  {
    title: 'Chính sách với nhà có trẻ nhỏ & thú cưng',
    slug: 'children-pet-policy',
    category: PolicyCategory.GENERAL,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '🐾',
    isDefault: false,
    sortOrder: 2,
    content: `## Chính sách với nhà có trẻ nhỏ & thú cưng

**Nhà có trẻ nhỏ (dưới 5 tuổi):**
- Thông báo trước khi đặt dịch vụ.
- Cách ly trẻ khỏi khu vực đang làm việc khi sử dụng hóa chất.
- Nhân viên sẽ ưu tiên dùng sản phẩm không mùi, thân thiện trẻ em.

**Nhà có thú cưng:**
- Phụ phí thú cưng: 50.000–100.000đ tùy quy mô.
- Cách ly thú cưng vào phòng hoặc chuồng trong ca làm việc.
- Nhân viên sẽ tránh tiếp xúc với thú cưng nếu không được chủ cho phép.
- CleanZ không chịu trách nhiệm nếu thú cưng thất lạc do không được cách ly.`,
  },
  {
    title: 'Chính sách khách hàng thân thiết',
    slug: 'loyalty-policy',
    category: PolicyCategory.GENERAL,
    role: PolicyRole.CUSTOMER,
    iconEmoji: '🎁',
    isDefault: false,
    sortOrder: 3,
    content: `## Chính sách khách hàng thân thiết

**Tích điểm:**
- Mỗi 10.000đ chi tiêu = 1 điểm CleanZ.
- Điểm tích lũy không có hạn sử dụng.

**Ưu đãi theo hạng:**

| Hạng | Điểm | Quyền lợi |
|---|---|---|
| Silver | 100+ | Ưu tiên đặt lịch, giảm 5% |
| Gold | 500+ | Giảm 10%, bảo hành 72h |
| Platinum | 1500+ | Giảm 15%, nhân viên riêng, hỗ trợ VIP |

**Đổi điểm:**
100 điểm = Voucher giảm giá 50.000đ cho lần đặt tiếp theo.`,
  },
];
