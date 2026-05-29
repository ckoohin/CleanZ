import VerifyEmailNoticePage from "@/features/auth/pages/VerifyEmailNoticePage";
import { Suspense } from "react";


export const metadata = {
  title: "Xác thực email | CleanZ Partner",
  description: "Kiểm tra email để xác thực tài khoản đối tác CleanZ.",
};

export default function Page() {
  return (
    <Suspense>
      <VerifyEmailNoticePage />
    </Suspense>
  );
}
