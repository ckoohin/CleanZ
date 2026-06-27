# CleanZ Admin Design System

> **Scope: ADMIN ONLY.** Áp dụng cho khu vực quản trị (`/admin`, prototype tại `/test/admin`).
> KHÔNG áp dụng cho customer / tasker / public / site — các khu vực đó giữ nguyên hệ thống cũ.
>
> Đây là phong cách đã được người dùng chốt. Khi xây màn admin mới, **bám theo file này** — không cần hỏi lại định hướng. Ưu tiên cao nhất: **đồng bộ** (một bộ token, một họ chữ, component dùng lại).

Canonical implementation (mẫu tham chiếu, copy từ đây):
- Shell: `fe/src/app/test/admin/page.tsx` (+ `_components/Sidebar.tsx`, `_components/Topbar.tsx`)
- Bảng dữ liệu + thanh hành động nổi: `fe/src/app/test/_components/CustomerManagement.tsx`
- Dashboard kéo-thả: `fe/src/app/test/_components/DashboardGrid.tsx` + `widgets.tsx`
- Biểu đồ SVG tự vẽ: `fe/src/app/test/_components/charts.tsx`

---

## 1. Nguyên tắc cốt lõi
1. **Đồng bộ trên hết** — một bộ token `--c-*`, một họ chữ, dùng lại card/badge/button/table.
2. **Light + amber** — nền sáng sạch, **amber `#FFA000`** là điểm nhấn DUY NHẤT (active, CTA), dùng tiết chế.
3. **Full-width** — không `max-width` cho dashboard/bảng (form thì giới hạn hẹp, xem §9).
4. **Fixed shell** — sidebar + header cố định, chỉ vùng nội dung cuộn.
5. **Brand CleanZ** — logo qua `@/components/logo/LogoApp` (mascot.svg). KHÔNG dùng "King Of Service"/vương miện, KHÔNG dùng serif/Playfair.
6. Icons: **chỉ `lucide-react`**. Toast: **`sonner`**. `cn` từ `@/lib/utils`.

---

## 2. Design tokens (scoped trong `.cz-admin`)
Đặt trong `<style>` của shell, scoped dưới `.cz-admin` để không rò sang khu vực khác. Light + dark (dark theo class `.dark` toàn cục).

```css
.cz-admin{
  --sb-w:260px;                 /* bề rộng sidebar — để căn overlay theo vùng nội dung */
  --c-canvas:#F4F6F9;           /* nền trang */
  --c-card:#FFFFFF;             /* nền thẻ / sidebar */
  --c-card-2:#F6F8FB;           /* nền phụ: hover, input, ô con */
  --c-ink:#0F1B33;              /* chữ chính (navy) */
  --c-ink-soft:#51607A;         /* chữ phụ */
  --c-muted:#8A95A8;            /* chữ mờ / label / icon idle */
  --c-line:#ECEEF3;             /* viền hairline */
  --c-line-strong:#DFE3EC;      /* viền đậm hơn (input, nút) */
  --c-chip:#EEF1F6;             /* nền badge trung tính */
  --c-primary:#FFA000;          /* amber thương hiệu — điểm nhấn */
  --c-primary-strong:#B45309;   /* amber đậm cho CHỮ trên nền sáng (đủ tương phản) */
  --c-primary-soft:#FFF3E0;     /* nền amber nhạt: active pill, tint */
  --c-hero:#FFF7EA;             /* nền hero (gradient amber rất nhạt) */
  --c-sidebar:#FFFFFF;
  --c-topbar:rgba(255,255,255,0.82);  /* topbar có backdrop-blur */
  --c-scroll:rgba(15,27,51,0.20);
  --c-scroll-hover:rgba(15,27,51,0.34);
}
.cz-admin.cz-collapsed{ --sb-w:72px; }   /* khi thu gọn sidebar */
.dark .cz-admin{
  --c-canvas:#0A0E16;  --c-card:#111722;  --c-card-2:#161D2A;
  --c-ink:#EAEEF6;     --c-ink-soft:#AEB9CC;  --c-muted:#6E7A92;
  --c-line:rgba(255,255,255,0.08);  --c-line-strong:rgba(255,255,255,0.14);
  --c-chip:rgba(255,255,255,0.10);
  --c-primary:#FFB300;  --c-primary-strong:#FFC24B;  --c-primary-soft:rgba(255,179,0,0.14);
  --c-hero:#141A26;  --c-sidebar:#0E131C;  --c-topbar:rgba(10,14,22,0.82);
  --c-scroll:rgba(255,255,255,0.16);  --c-scroll-hover:rgba(255,255,255,0.30);
}
```

Dùng qua Tailwind arbitrary: `bg-[var(--c-card)]`, `text-[var(--c-ink)]`, `border-[var(--c-line)]`…

**Màu ngữ nghĩa (hex cố định, dùng cho badge trạng thái — không đổi theo theme):**
| Ý nghĩa | color | soft (nền) |
| --- | --- | --- |
| Success / Hoạt động | `#0E9F6E` | `rgba(14,159,110,0.12)` |
| Info / Mới | `#2563EB` | `rgba(37,99,235,0.12)` |
| Warning | `#D97706` | `rgba(217,119,6,0.14)` |
| Danger / Đã khoá / Huỷ | `#E11D48` | `rgba(225,29,72,0.12)` |
| Tím (vd ticket/VIP) | `#7C3AED` | `rgba(124,58,237,0.12)` |

**Gradient amber** (avatar, nút primary): `linear-gradient(135deg, #FFB951 0%, #FF9800 100%)`.

---

## 3. Typography
- **Một họ chữ duy nhất: Source Sans 3** (`font-sans`, biến `--font-sans` đã có sẵn trong root layout). KHÔNG serif/Playfair.
- Heading: `font-sans font-bold tracking-tight` (vd `text-[24px]` cho H1 trang, `text-[22px]`/`text-[15px]` cho card title).
- Body/label: `font-medium`/`font-semibold`, cỡ `text-[13px]`–`text-[13.5px]`; label phụ `text-[11px]–12px` màu `--c-muted`.
- Eyebrow/label nhóm: `text-[10.5px]–11px font-semibold uppercase tracking-[0.12em–0.16em]` màu `--c-muted`.
- **Số liệu: luôn `tabular-nums`** (KPI, tiền, đếm) để thẳng cột.
- Tiền VND: `n.toLocaleString('vi-VN') + '₫'`.

---

## 4. Shell / Layout
- Root: `cz-admin flex h-screen w-full overflow-hidden` + thêm class `cz-collapsed` khi sidebar thu gọn. `style={{ background:'var(--c-canvas)', color:'var(--c-ink)' }}`.
- Cột nội dung: `flex min-w-0 flex-1 flex-col` → `<Topbar/>` (sticky) + `<main className="cz-scroll flex-1 overflow-y-auto p-4 md:p-6">`.
- **Header + sidebar cố định, chỉ `main` cuộn** (mô hình internal-scroll). KHÔNG dùng window-scroll cho admin.
- **Full-width**, không `max-width`. Lề nội dung: `p-4 md:p-6`.
- Cuộn dùng scrollbar theo theme: thêm class **`cz-scroll`** cho mọi vùng `overflow` (xem CSS §8).

---

## 5. Sidebar (light)
- Nền `--c-sidebar`, viền phải `--c-line`. Rộng **260px**, thu gọn **72px** (icon-rail), ẩn dưới `lg` → mở bằng **drawer** (overlay `z-50`).
- Brand: `LogoApp` (mở rộng) / `variant="icon-only"` (thu gọn).
- Group label: `text-[10.5px] font-semibold uppercase tracking-[0.13em]` màu `--c-muted`.
- Item:
  - idle: `text-[var(--c-ink-soft)]`, icon `text-[var(--c-muted)]`, hover `bg-[var(--c-card-2)]`.
  - **active: nền `--c-primary-soft`, chữ `--c-primary-strong` (font-semibold), icon `--c-primary`, + thanh accent amber mảnh bên trái** (`absolute -left-3 h-5 w-[3px] rounded-r-full`).
- Mục con: thụt lề + đường dẫn dọc `border-l`, dot nhỏ (active = amber).
- Footer: thẻ user (avatar gradient amber + tên + email).

---

## 6. Topbar
`sticky top-0 z-20 h-16`, nền `--c-topbar` + `backdrop-blur-md`, viền dưới `--c-line`. Gồm: nút thu gọn (desktop) / menu (mobile) · breadcrumb · ô tìm kiếm (pill, có `⌘K`) · pill "trực tuyến" (chấm xanh `kos-ping`) · chuông (chấm amber) · nút đổi theme (Sun/Moon) · avatar.

---

## 7. Component & pattern chuẩn

**Card:**
```
rounded-2xl border bg-[var(--c-card)] border-[var(--c-line)]
shadow-[0_1px_2px_rgba(15,27,51,0.04),0_8px_24px_-14px_rgba(15,27,51,0.10)]
```

**Button:**
- Primary: `text-white` nền gradient amber, `rounded-lg/xl h-9`, hover `-translate-y-0.5`, shadow amber.
- Secondary: `border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]`.
- Luôn có `focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40`.

**Badge (pill):** `rounded-full px-2.5 py-1 text-[11.5px] font-semibold`, `color` + `background` = cặp màu/soft ngữ nghĩa; trạng thái có thêm dot `size-1.5 rounded-full`.

**Avatar:** tròn, gradient amber, chữ viết tắt trắng. Cỡ trong bảng `size-8`.

**Stat card:** card + icon chip vuông (`size-11 rounded-xl`, nền `${color}1f`), label eyebrow, số `text-[22px] font-bold tabular-nums`, delta xanh/đỏ.

**Bảng dữ liệu (chuẩn quản lý):**
- Bọc trong card `overflow-hidden`. Toolbar (tìm kiếm + filter segmented) ngăn bởi `border-b`.
- Header `th`: `text-[11px] font-semibold uppercase tracking-[0.06em]` màu `--c-muted`.
- Dòng **gọn**: ô `px-3 py-2.5`, viền trên `border-[var(--c-line)]`, hover `bg-[var(--c-card-2)]`.
- Ẩn cột theo breakpoint (`hidden md:table-cell`, `lg`, `xl`, `2xl`) để gọn trên màn nhỏ; `min-w-[...]` + `overflow-x-auto cz-scroll`.
- Chọn nhiều: checkbox `accent-[var(--c-primary)]`; "chọn tất cả" theo trang.
- Hành động dòng: nút `⋯` mở `DropdownMenu` (shadcn) → các mục có toast.
- Phân trang: chữ "Hiển thị X–Y trong Z" + nút số trang (trang hiện tại = nền gradient amber).
- Empty state khi không có dữ liệu.

**Thanh hành động hàng loạt (bulk) — NỔI CỐ ĐỊNH:**
- Khi có chọn → hiện thanh **`position: fixed` ở đáy, căn giữa vùng nội dung**, KHÔNG đẩy layout.
- Căn giữa theo vùng nội dung (trừ sidebar): `left: calc(50% + var(--sb-w)/2)` ở `≥1024px`, `left:50%` ở mobile; trượt mượt khi thu/mở sidebar.
- Dạng pill: số đã chọn (chip amber) · các hành động · nút `✕` bỏ chọn. Trượt lên + mờ dần (`cz-bar-in`).

---

## 8. CSS tiện ích bắt buộc kèm shell
```css
/* scrollbar theo theme — gắn class cz-scroll cho mọi vùng overflow */
.cz-scroll{ scrollbar-width: thin; scrollbar-color: var(--c-scroll) transparent; }
.cz-scroll::-webkit-scrollbar{ width: 8px; height: 8px; }
.cz-scroll::-webkit-scrollbar-track{ background: transparent; }
.cz-scroll::-webkit-scrollbar-thumb{ background-color: var(--c-scroll); border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
.cz-scroll::-webkit-scrollbar-thumb:hover{ background-color: var(--c-scroll-hover); }

/* thanh bulk nổi */
.cz-bulkbar{ position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 40; animation: cz-bar-in .22s ease-out both; transition: left .3s ease; }
@media (min-width:1024px){ .cz-bulkbar{ left: calc(50% + var(--sb-w, 0px) / 2); } }
@keyframes cz-bar-in{ from{opacity:0; transform:translateX(-50%) translateY(14px);} to{opacity:1; transform:translateX(-50%) translateY(0);} }

/* hiệu ứng nhẹ */
@keyframes kos-rise{ from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:none;} }
.kos-rise{ animation: kos-rise .5s cubic-bezier(.19,1,.22,1) both; }
@keyframes kos-ping{ 75%,100%{ transform:scale(2); opacity:0; } }
.kos-ping{ animation: kos-ping 1.7s cubic-bezier(0,0,.2,1) infinite; }

@media (prefers-reduced-motion: reduce){ .kos-rise,.kos-ping,.cz-bulkbar{ animation:none; } }
```

---

## 9. Form (quy ước)
Dù trang full-width, **form nhập liệu giới hạn bề ngang ~640–800px** (dễ nhập, đẹp). Input: `h-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)]`, focus `border-[var(--c-primary)]/50 ring-[var(--c-primary)]/30`.

---

## 10. Motion & A11y
- Motion **tiết chế**: `kos-rise` (stagger khi vào), `kos-ping` (chấm live), `cz-bar-in` (bulk bar). Luôn tôn trọng `prefers-reduced-motion`.
- A11y: mọi phần tử bấm có `focus-visible:ring-2 ring-[var(--c-primary)]/40`; nút icon có `aria-label`; ảnh/icon trang trí `aria-hidden`.

---

## 11. DO / DON'T
**DO:** dùng token `--c-*`; một họ chữ Source Sans; card/badge/button/table dùng lại; amber tiết chế; full-width; fixed shell; `cz-scroll` cho vùng cuộn; `lucide` + `sonner`.
**DON'T:** ❌ serif/Playfair; ❌ "King Of Service"/crown; ❌ hardcode hex ngoài bảng màu ngữ nghĩa; ❌ `max-width` cho bảng/dashboard; ❌ in line bulk bar (phải nổi cố định); ❌ `@heroicons`; ❌ rò token `--c-*`/`.cz-*` ra ngoài khu admin.

---

## 12. Khi port sang admin thật
- Shell thật: `fe/src/app/(protected)/(admin)/admin/layout.tsx` (đang là bản cũ — chỉ thay khi user duyệt).
- Đưa token vào `globals.css` dưới `.cz-admin` (hoặc giữ scoped trong shell) — vẫn **chỉ áp cho admin**.
- Dọn trùng lặp: gộp `components/siderber` + `components/sidebar`, bỏ link nav chết. Nav lấy từ `@/constants/routes`.
- KHÔNG commit nếu chưa được yêu cầu.
