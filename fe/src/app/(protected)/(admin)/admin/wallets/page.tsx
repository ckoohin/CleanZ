import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/**
 * Màn "Quản lý ví" đã gộp vào `/admin/finances` (tab "Ví") vì hai trang vốn
 * trùng chức năng. Giữ route này để link cũ và bookmark không chết.
 */
export default function AdminWalletsPage() {
  redirect(ROUTES.ADMIN.FINANCES.BASE);
}
