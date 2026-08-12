import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/**
 * Màn "Yêu cầu rút tiền" đã gộp vào `/admin/finances` (tab "Rút tiền"). Giữ route
 * này để link cũ và bookmark không chết.
 */
export default function AdminWithdrawalsPage() {
  redirect(ROUTES.ADMIN.FINANCES.BASE);
}
