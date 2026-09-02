import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  BlogCategory,
  BlogCategoryFormInput,
  BlogFormInput,
  BlogListParams,
  BlogListResponse,
  BlogPost,
  BlogStatus,
  BlogTag,
} from "../types/blog.types";

const ADMIN_BLOG_CATEGORIES_ENDPOINT = "/blog/admin/categories";
const PUBLIC_BLOG_CATEGORIES_ENDPOINT = "/blog/categories";
const PUBLIC_BLOG_TAGS_ENDPOINT = "/blog/tags";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

type ApiPaginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

function normalizeList(payload: ApiEnvelope<ApiPaginated<BlogPost>> | ApiPaginated<BlogPost>): BlogListResponse {
  const data = unwrap<ApiPaginated<BlogPost>>(payload);
  return {
    data: data.items ?? [],
    meta: {
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 10,
      totalPages: data.totalPages ?? 1,
    },
  };
}

function cleanListParams(params?: BlogListParams): BlogListParams | undefined {
  if (!params) return undefined;

  const cleaned: BlogListParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === "" || value === null || value === undefined) return;
    cleaned[key as keyof BlogListParams] = value as never;
  });

  return cleaned;
}

export const FALLBACK_BLOG_CATEGORIES: BlogCategory[] = [
  {
    id: "cat-1",
    name: "Vệ sinh nhà cửa",
    slug: "ve-sinh-nha-cua",
    description: "Cẩm nang mẹo vặt và hướng dẫn dọn dẹp không gian sống sạch sẽ, ngăn nắp.",
    blog_count: 4,
  },
  {
    id: "cat-2",
    name: "Giặt đệm & Sofa",
    slug: "giat-dem-sofa",
    description: "Phương pháp chăm sóc, bảo dưỡng và làm sạch các chất liệu nỉ, da, nhung chuyên sâu.",
    blog_count: 2,
  },
  {
    id: "cat-3",
    name: "Vệ sinh văn phòng",
    slug: "ve-sinh-van-phong",
    description: "Giải pháp vệ sinh định kỳ giúp môi trường làm việc thông thoáng, nâng cao năng suất.",
    blog_count: 1,
  },
  {
    id: "cat-4",
    name: "Mẹo khử khuẩn diệt mốc",
    slug: "meo-khu-khuan-diet-moc",
    description: "Bí quyết phòng ngừa nấm mốc, vi khuẩn và mùi ẩm mốc trong mùa mưa gió.",
    blog_count: 2,
  },
];

export const FALLBACK_BLOG_TAGS: BlogTag[] = [
  { id: "tag-1", name: "Nhà sạch", slug: "nha-sach" },
  { id: "tag-2", name: "Sofa", slug: "sofa" },
  { id: "tag-3", name: "Khử khuẩn", slug: "khu-khuan" },
  { id: "tag-4", name: "Mẹo vặt", slug: "meo-vat" },
  { id: "tag-5", name: "Văn phòng", slug: "van-phong" },
  { id: "tag-6", name: "An toàn", slug: "an-toan" },
];

export const FALLBACK_BLOG_POSTS: BlogPost[] = [
  {
    id: "blog-1",
    title: "Quy trình 7 bước dọn nhà chuẩn chuyên gia CleanZ giúp tiết kiệm 50% thời gian",
    slug: "quy-trinh-7-buoc-don-nha-chuan-chuyen-gia-cleanz",
    summary: "Khám phá nguyên tắc dọn dẹp từ trên xuống dưới, từ trong ra ngoài kết hợp sắp xếp khoa học giúp ngôi nhà luôn sạch bóng chỉ trong 2 giờ.",
    content: `## Vì sao bạn dọn nhà mãi mà không thấy sạch?

Nhiều người thường có thói quen tiện đâu dọn đấy, dẫn đến việc bụi bẩn từ trần nhà rơi xuống sàn đã lau hoặc đồ đạc di chuyển qua lại nhiều lần.

### 7 bước dọn nhà chuẩn mực từ chuyên gia CleanZ:

1. **Thu dọn rác và vật dụng thừa:** Gom toàn bộ đồ chơi, quần áo bẩn, chai lọ rỗng vào đúng vị trí.
2. **Quét bụi trần nhà và góc tường:** Sử dụng chổi cán dài lau sạch mạng nhện và bụi bám trên cao.
3. **Lau chùi bề mặt nội thất:** Bắt đầu từ kệ sách, mặt bàn, tủ bếp bằng khăn sợi microfiber ẩm.
4. **Vệ sinh khu vực bếp:** Xử lý các vết dầu mỡ cứng đầu trên bếp ga và bồn rửa.
5. **Cọ rửa nhà vệ sinh:** Dùng dung dịch chuyên dụng diệt khuẩn bồn cầu, vòi sen và gạch ốp tường.
6. **Hút bụi và lau sàn nhà:** Lau từ góc sâu nhất lùi dần ra phía cửa chính.
7. **Khử mùi và tạo hương thơm:** Xịt tinh dầu sả chanh hoặc mở cửa đón gió tự nhiên.

> **Lời khuyên từ CleanZ:** Hãy duy trì thói quen cất đồ sau khi sử dụng để không gian luôn gọn gàng mà không tốn quá nhiều công sức dọn dẹp cuối tuần!`,
    thumbnail_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-1",
    category: FALLBACK_BLOG_CATEGORIES[0],
    tags: ["nha-sach", "meo-vat", "an-toan"],
    author: {
      id: "author-1",
      fullName: "Đội ngũ Chuyên gia CleanZ",
      email: "expert@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 1420,
    published_at: "2026-08-20T08:00:00.000Z",
    createdAt: "2026-08-20T08:00:00.000Z",
    updatedAt: "2026-08-20T08:00:00.000Z",
  },
  {
    id: "blog-2",
    title: "Bí quyết giặt sofa nỉ và nệm lò xo sạch sâu, khử sạch mùi ẩm mốc tại nhà",
    slug: "bi-quyet-giat-sofa-ni-va-nem-lo-xo-sach-sau",
    summary: "Hướng dẫn phân biệt vết bẩn hữu cơ và vô cơ trên nỉ, phương pháp hút bụi diệt khuẩn bằng hơi nước nóng và cách khử mùi cà phê, thức ăn hiệu quả.",
    content: `## Đệm và sofa - Nơi tích tụ hàng triệu vi khuẩn tiềm ẩn

Sau một thời gian sử dụng, mồ hôi, tế bào chết và bụi mịn bám sâu vào các thớ vải sofa là môi trường lý tưởng cho mạt bụi sinh sôi.

### Các bước chăm sóc sofa nỉ định kỳ:

* **Hút bụi bề mặt và khe ghế:** Sử dụng đầu hút khe nhỏ để gom vụn thức ăn và lông thú cưng.
* **Xử lý vết ố bằng baking soda:** Rắc một lớp mỏng bột baking soda lên bề mặt nệm trong 30 phút để hút ẩm và khử mùi hôi.
* **Công nghệ phun hút hơi nước nóng CleanZ:** Nước nóng 140°C giúp đánh tan vết ố cứng đầu và diệt khuẩn đến 99.9%.
* **Sấy khô nhanh bằng quạt gió chuyên dụng:** Đảm bảo sofa khô ráo hoàn toàn trong 2-3 giờ, không lo ẩm mốc quay trở lại.

> Nên thực hiện giặt sâu sofa và nệm ngủ tối thiểu **3-6 tháng/lần** để bảo vệ sức khỏe hệ hô hấp của gia đình bạn.`,
    thumbnail_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-2",
    category: FALLBACK_BLOG_CATEGORIES[1],
    tags: ["sofa", "khu-khuan", "meo-vat"],
    author: {
      id: "author-1",
      fullName: "Kỹ thuật viên CleanZ",
      email: "support@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 980,
    published_at: "2026-08-22T09:30:00.000Z",
    createdAt: "2026-08-22T09:30:00.000Z",
    updatedAt: "2026-08-22T09:30:00.000Z",
  },
  {
    id: "blog-3",
    title: "Tiêu chuẩn 5S trong vệ sinh văn phòng: Tăng 30% hiệu suất làm việc cho doanh nghiệp",
    slug: "tieu-chuan-5s-trong-ve-sinh-van-phong",
    summary: "Áp dụng phương pháp Sàng lọc - Sắp xếp - Sạch sẽ - Săn sóc - Sẵn sàng vào công tác quản trị môi trường công sở hiện đại.",
    content: `## Không gian làm việc sạch sẽ là chìa khóa của sự sáng tạo

Một văn phòng bừa bộn không chỉ làm giảm tính thẩm mỹ mà còn gây xao nhãng và gia tăng căng thẳng cho nhân sự.

### 5 nguyên tắc vàng:

1. **Seiri (Sàng lọc):** Phân loại tài liệu cũ, thiết bị hỏng để thanh lý hoặc lưu kho riêng.
2. **Seiton (Sắp xếp):** Bố trí bàn làm việc, khay đựng hồ sơ khoa học, dễ tìm thấy trong 30 giây.
3. **Seiso (Sạch sẽ):** Vệ sinh hàng ngày bàn phím, màn hình máy tính, sàn thảm và khu vực pantry.
4. **Seiketsu (Săn sóc):** Duy trì tiêu chuẩn sạch sẽ thông qua bảng kiểm dịch vụ hàng tuần.
5. **Shitsuke (Sẵn sàng):** Tạo thói quen tự giác giữ gìn vệ sinh chung cho toàn bộ nhân viên.

Dịch vụ vệ sinh văn phòng trọn gói của CleanZ cam kết mang lại không gian làm việc chuyên nghiệp, đẳng cấp cho doanh nghiệp.`,
    thumbnail_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-3",
    category: FALLBACK_BLOG_CATEGORIES[2],
    tags: ["van-phong", "nha-sach"],
    author: {
      id: "author-2",
      fullName: "Phòng Dịch vụ Doanh nghiệp CleanZ",
      email: "business@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 750,
    published_at: "2026-08-24T14:15:00.000Z",
    createdAt: "2026-08-24T14:15:00.000Z",
    updatedAt: "2026-08-24T14:15:00.000Z",
  },
  {
    id: "blog-4",
    title: "Cách xử lý nấm mốc góc tường và gioăng cao su máy giặt trong mùa mưa nồm ẩm",
    slug: "cach-xu-ly-nam-moc-goc-tuong-va-gioang-may-giat",
    summary: "Tổng hợp các phương pháp diệt trừ nấm mốc tận gốc bằng nguyên liệu tự nhiên và dung dịch sinh học an toàn cho trẻ nhỏ.",
    content: `## Tác hại của nấm mốc trong thời tiết nồm ẩm

Nấm mốc phát triển mạnh ở độ ẩm trên 70%, phát tán bào tử gây dị ứng da, ho khan và các bệnh về đường hô hấp.

### Mẹo đánh bay nấm mốc cực nhanh:

* **Đối với gioăng cao su máy giặt:** Thấm dung dịch giấm trắng pha baking soda vào khăn, đắp quanh mép gioăng trong 1 giờ rồi lau sạch.
* **Đối với vết mốc chân tường:** Pha giấm táo với oxy già theo tỷ lệ 1:1, xịt trực tiếp lên vết ố và dùng bàn chải chà nhẹ.
* **Đối với tủ quần áo gỗ:** Đặt túi than hoạt tính hoặc hạt hút ẩm ở các góc tủ để ngăn hơi nước ngưng tụ.

> Hãy bật chế độ hút ẩm (Dry) trên điều hòa vào những ngày mưa nồm để duy trì độ ẩm phòng ở mức lý tưởng 50-60%.`,
    thumbnail_url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-4",
    category: FALLBACK_BLOG_CATEGORIES[3],
    tags: ["khu-khuan", "meo-vat", "an-toan"],
    author: {
      id: "author-1",
      fullName: "Đội ngũ Chuyên gia CleanZ",
      email: "expert@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 1890,
    published_at: "2026-08-25T10:00:00.000Z",
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
  },
  {
    id: "blog-5",
    title: "Hướng dẫn tổng vệ sinh nhà mới xây hoặc sau sửa chữa: Sạch bụi xi măng từng milimet",
    slug: "huong-dan-tong-ve-sinh-nha-moi-xay-sau-sua-chua",
    summary: "Bí quyết làm sạch vết sơn, xi măng bám dính trên gạch men, kính cường lực mà không làm trầy xước bề mặt nội thất đắt tiền.",
    content: `## Những thách thức lớn khi dọn dẹp sau xây dựng

Bụi thạch cao và bụi xi măng siêu mịn len lỏi vào từng khe ray cửa sổ, ổ cắm điện và các hộc tủ gỗ công nghiệp.

### Trình tự xử lý chuẩn công nghiệp:

1. **Thu dọn phế thải xây dựng:** Gom vữa thừa, bao bì xi măng và màng bọc nilon.
2. **Hút bụi công suất lớn:** Sử dụng máy hút bụi 3 mô-tơ hút sạch bụi thô và bụi mịn trên toàn bộ mặt sàn.
3. **Tẩy sơn và xi măng chết:** Dùng hóa chất trung tính chuyên dụng bóc tách màng sơn trên kính và gạch lát.
4. **Vệ sinh chi tiết:** Lau chùi hệ thống đèn trần, tay vịn cầu thang và thiết bị vệ sinh cao cấp.
5. **Đánh bóng sàn gạch:** Sử dụng máy chà sàn liên hợp để khôi phục độ bóng sáng tự nhiên.`,
    thumbnail_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-1",
    category: FALLBACK_BLOG_CATEGORIES[0],
    tags: ["nha-sach", "dich-vu"],
    author: {
      id: "author-1",
      fullName: "Đội ngũ Kỹ thuật CleanZ",
      email: "expert@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 1120,
    published_at: "2026-08-26T16:00:00.000Z",
    createdAt: "2026-08-26T16:00:00.000Z",
    updatedAt: "2026-08-26T16:00:00.000Z",
  },
  {
    id: "blog-6",
    title: "5 thói quen đơn giản giúp không gian sống luôn ngát hương thơm và sạch sẽ",
    slug: "5-thoi-quen-don-gian-giup-khong-gian-song-luon-ngat-huong",
    summary: "Những mẹo nhỏ mỗi sáng thức dậy và trước khi đi ngủ giúp bạn tận hưởng trọn vẹn cảm giác bình yên, thư thái khi trở về nhà.",
    content: `## Hạnh phúc bắt đầu từ một ngôi nhà ngăn nắp

Chăm sóc tổ ấm không cần mất hàng giờ mỗi ngày, bạn chỉ cần xây dựng những thói quen nhỏ đều đặn:

* **Dọn giường ngay sau khi thức dậy:** Tạo cảm giác hoàn thành công việc đầu tiên trong ngày.
* **Không để chén đĩa qua đêm trong bồn rửa:** Ngăn chặn vi khuẩn và gián, chuột xâm nhập.
* **Lau khô mặt bàn bếp sau khi nấu nướng:** Giữ căn bếp luôn sáng bóng và không bị ố vàng.
* **Mở cửa sổ đón nắng sớm 15 phút mỗi ngày:** Giúp không khí lưu thông và giảm ẩm mốc tự nhiên.
* **Sử dụng túi thơm tự nhiên hoặc hoa tươi:** Tăng sinh khí và mang lại nguồn năng lượng tích cực cho cả gia đình.`,
    thumbnail_url: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-1",
    category: FALLBACK_BLOG_CATEGORIES[0],
    tags: ["meo-vat", "nha-sach"],
    author: {
      id: "author-2",
      fullName: "Ban Biên tập CleanZ",
      email: "editor@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 1650,
    published_at: "2026-08-27T08:30:00.000Z",
    createdAt: "2026-08-27T08:30:00.000Z",
    updatedAt: "2026-08-27T08:30:00.000Z",
  },
  {
    id: "blog-7",
    title: "Vệ sinh máy lạnh định kỳ: Bí quyết tiết kiệm 20% điện năng và bảo vệ sức khỏe",
    slug: "ve-sinh-may-lanh-dinh-ky-tiet-kiem-dien-nang",
    summary: "Tại sao bụi bẩn bám vào dàn lạnh làm giảm khả năng làm mát và hướng dẫn các bước tự xịt rửa lưới lọc bụi đơn giản tại nhà.",
    content: `## Máy lạnh bẩn - Thủ phạm âm thầm ngốn tiền điện

Lớp bụi dày đặc trên dàn tản nhiệt ngăn cản luồng khí lạnh lưu thông, buộc máy nén phải hoạt động hết công suất liên tục.

### Lợi ích khi bảo dưỡng điều hòa đúng lịch:

* Tiết kiệm ngay **15 - 20% hóa đơn tiền điện** hàng tháng.
* Ngăn chặn vi khuẩn nấm mốc Legionella phát tán trong không khí.
* Tăng tuổi thọ block máy nén và giảm nguy cơ chảy nước trong phòng.`,
    thumbnail_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-1",
    category: FALLBACK_BLOG_CATEGORIES[0],
    tags: ["meo-vat", "an-toan"],
    author: {
      id: "author-1",
      fullName: "Kỹ thuật viên Điện lạnh CleanZ",
      email: "expert@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 830,
    published_at: "2026-08-28T11:00:00.000Z",
    createdAt: "2026-08-28T11:00:00.000Z",
    updatedAt: "2026-08-28T11:00:00.000Z",
  },
  {
    id: "blog-8",
    title: "Phân biệt hóa chất tẩy rửa sinh học an toàn cho nhà có thú cưng và trẻ nhỏ",
    slug: "phan-biet-hoa-chat-tay-rua-sinh-hoc-an-toan",
    summary: "Hiểu rõ về công nghệ enzyme lên men tự nhiên, chứng nhận an toàn da liễu và cách chọn nước lau sàn không độc hại.",
    content: `## Bảo vệ sức khỏe cả nhà từ những điều nhỏ nhất

Nhiều sản phẩm tẩy rửa công nghiệp chứa clo và phốt phát nồng độ cao có thể gây kích ứng niêm mạc mắt và đường thở của bé yêu và thú cưng.

CleanZ ưu tiên sử dụng 100% dung dịch tẩy rửa sinh học gốc thực vật đạt chuẩn quốc tế, đảm bảo an toàn tuyệt đối ngay cả khi trẻ bò chơi trên sàn.`,
    thumbnail_url: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-4",
    category: FALLBACK_BLOG_CATEGORIES[3],
    tags: ["an-toan", "khu-khuan"],
    author: {
      id: "author-1",
      fullName: "Đội ngũ Chuyên gia CleanZ",
      email: "expert@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 1240,
    published_at: "2026-08-29T13:45:00.000Z",
    createdAt: "2026-08-29T13:45:00.000Z",
    updatedAt: "2026-08-29T13:45:00.000Z",
  },
  {
    id: "blog-9",
    title: "Bí quyết giặt thảm trang trí phòng khách sạch tinh tươm đón khách cuối tuần",
    slug: "bi-quyet-giat-tham-trang-tri-phong-khach",
    summary: "Cách xử lý vết ố rượu vang, trà, cà phê trên thảm lông ngắn và thảm dệt tay mà không làm phai màu hay xơ sợi vải.",
    content: `## Thảm trải sàn - Điểm nhấn tinh tế nhưng khó vệ sinh

Thảm là nơi hấp thụ bụi cát từ giày dép và lông thú cưng nhiều nhất trong phòng khách.

### Mẹo giữ thảm luôn như mới:

1. **Hút bụi 2 lần/tuần** theo 2 chiều vuông góc để làm sạch sâu chân sợi thảm.
2. **Dùng khăn giấy thấm ngay** khi bị đổ chất lỏng, tuyệt đối không chà xát mạnh làm loang vết ố.
3. **Sử dụng dịch vụ giặt thảm hơi nước CleanZ** định kỳ để diệt khuẩn và khử sạch mùi hôi.`,
    thumbnail_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    category_id: "cat-2",
    category: FALLBACK_BLOG_CATEGORIES[1],
    tags: ["sofa", "nha-sach", "meo-vat"],
    author: {
      id: "author-1",
      fullName: "Kỹ thuật viên CleanZ",
      email: "expert@cleanz.online",
    },
    status: "PUBLISHED",
    view_count: 910,
    published_at: "2026-08-30T15:20:00.000Z",
    createdAt: "2026-08-30T15:20:00.000Z",
    updatedAt: "2026-08-30T15:20:00.000Z",
  },
];

function filterFallbackBlogs(params?: BlogListParams): BlogListResponse {
  let list = [...FALLBACK_BLOG_POSTS];
  if (params?.q) {
    const query = params.q.toLowerCase();
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.summary && item.summary.toLowerCase().includes(query)) ||
        item.slug.toLowerCase().includes(query),
    );
  }
  if (params?.category_id) {
    list = list.filter((item) => item.category_id === params.category_id);
  }
  if (params?.tag) {
    list = list.filter((item) => item.tags.includes(params.tag!));
  }

  const page = params?.page || 1;
  const limit = params?.limit || 9;
  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const pagedItems = list.slice(startIndex, startIndex + limit);

  return {
    data: pagedItems,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

export const blogApi = {
  listPublished: (params?: BlogListParams): Promise<BlogListResponse> =>
    http
      .get(API_ENDPOINTS.BLOG.BASE, {
        params: cleanListParams({ ...params, status: undefined }),
      })
      .then((r) => {
        const res = normalizeList(r.data);
        if (res.data.length > 0) return res;
        return filterFallbackBlogs(params);
      })
      .catch(() => filterFallbackBlogs(params)),

  findPublished: (id: string): Promise<BlogPost> =>
    http
      .get(API_ENDPOINTS.BLOG.DETAIL(id))
      .then((r) => unwrap<BlogPost>(r.data))
      .catch((err) => {
        const fallback = FALLBACK_BLOG_POSTS.find((b) => b.id === id);
        if (fallback) return fallback;
        throw err;
      }),

  findPublishedBySlug: (slug: string): Promise<BlogPost> =>
    http
      .get(`${API_ENDPOINTS.BLOG.BASE}/slug/${encodeURIComponent(slug)}`)
      .then((r) => unwrap<BlogPost>(r.data))
      .catch((err) => {
        const fallback = FALLBACK_BLOG_POSTS.find((b) => b.slug === slug);
        if (fallback) return fallback;
        throw err;
      }),

  listCategories: (): Promise<BlogCategory[]> =>
    http
      .get(PUBLIC_BLOG_CATEGORIES_ENDPOINT)
      .then((r) => {
        const list = unwrap<BlogCategory[]>(r.data);
        return list && list.length > 0 ? list : FALLBACK_BLOG_CATEGORIES;
      })
      .catch(() => FALLBACK_BLOG_CATEGORIES),

  listTags: (): Promise<BlogTag[]> =>
    http
      .get(PUBLIC_BLOG_TAGS_ENDPOINT)
      .then((r) => {
        const list = unwrap<BlogTag[]>(r.data);
        return list && list.length > 0 ? list : FALLBACK_BLOG_TAGS;
      })
      .catch(() => FALLBACK_BLOG_TAGS),
};

export const adminBlogApi = {
  list: (params?: BlogListParams): Promise<BlogListResponse> =>
    http.get(API_ENDPOINTS.BLOG.ADMIN_ALL, { params }).then((r) => normalizeList(r.data)),

  create: (dto: BlogFormInput): Promise<BlogPost> =>
    http.post(API_ENDPOINTS.BLOG.ADMIN_BASE, dto).then((r) => unwrap<BlogPost>(r.data)),

  update: (id: string, dto: BlogFormInput): Promise<BlogPost> =>
    http.patch(API_ENDPOINTS.BLOG.ADMIN_DETAIL(id), dto).then((r) => unwrap<BlogPost>(r.data)),

  remove: (id: string): Promise<void> =>
    http.delete(API_ENDPOINTS.BLOG.ADMIN_DETAIL(id)).then(() => undefined),

  changeStatus: (id: string, status: BlogStatus): Promise<BlogPost> =>
    http
      .patch(API_ENDPOINTS.BLOG.ADMIN_STATUS(id), { status })
      .then((r) => unwrap<BlogPost>(r.data)),

  preview: (id: string): Promise<BlogPost> =>
    http.get(`${API_ENDPOINTS.BLOG.ADMIN_BASE}/${id}/preview`).then((r) => unwrap<BlogPost>(r.data)),
};

export const adminBlogCategoryApi = {
  list: (q?: string): Promise<BlogCategory[]> =>
    http
      .get(ADMIN_BLOG_CATEGORIES_ENDPOINT, { params: { q: q || undefined } })
      .then((r) => unwrap<BlogCategory[]>(r.data)),

  create: (dto: BlogCategoryFormInput): Promise<BlogCategory> =>
    http
      .post(ADMIN_BLOG_CATEGORIES_ENDPOINT, dto)
      .then((r) => unwrap<BlogCategory>(r.data)),

  update: (id: string, dto: BlogCategoryFormInput): Promise<BlogCategory> =>
    http
      .patch(`${ADMIN_BLOG_CATEGORIES_ENDPOINT}/${id}`, dto)
      .then((r) => unwrap<BlogCategory>(r.data)),

  remove: (id: string): Promise<void> =>
    http.delete(`${ADMIN_BLOG_CATEGORIES_ENDPOINT}/${id}`).then(() => undefined),
};
