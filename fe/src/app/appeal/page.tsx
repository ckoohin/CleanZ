"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { appealApi } from "@/features/appeal/services/appeal.service";
import type { AppealContext } from "@/features/appeal/types";

const MIN_LEN = 10;
const MAX_LEN = 2000;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">KingOfService</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function CenteredCard({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  tone: "error" | "success" | "warning";
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "bg-destructive/10 text-destructive"
      : tone === "success"
        ? "bg-emerald-500/10 text-emerald-600"
        : "bg-amber-500/10 text-amber-600";
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div
          className={`mx-auto mb-2 flex size-12 items-center justify-center rounded-full ${toneClass}`}
        >
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      {children}
    </Card>
  );
}

function AppealInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<AppealContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setError("Liên kết kháng cáo không hợp lệ.");
      setLoading(false);
      return;
    }
    appealApi
      .verify(token)
      .then((ctx) => {
        if (active) setContext(ctx);
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          (axios.isAxiosError(err) &&
            (err.response?.data as { message?: string } | undefined)
              ?.message) ||
          "Liên kết kháng cáo không hợp lệ hoặc đã hết hạn.";
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < MIN_LEN) {
      toast.error(`Nội dung kháng cáo cần ít nhất ${MIN_LEN} ký tự.`);
      return;
    }
    setSubmitting(true);
    try {
      await appealApi.submit(token, trimmed);
      setSubmitted(true);
      toast.success("Đã gửi kháng cáo thành công.");
    } catch {
      // Lỗi đã được toast bởi interceptor toàn cục.
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span>Đang kiểm tra liên kết kháng cáo…</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <CenteredCard
        icon={<ShieldAlert className="size-6" />}
        tone="error"
        title="Không thể mở kháng cáo"
        description={error}
      >
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href={ROUTES.HOME}>Về trang chủ</Link>
          </Button>
        </CardFooter>
      </CenteredCard>
    );
  }

  if (submitted) {
    return (
      <CenteredCard
        icon={<CheckCircle2 className="size-6" />}
        tone="success"
        title="Đã gửi kháng cáo"
        description="Chúng tôi đã ghi nhận kháng cáo của bạn và sẽ xem xét, phản hồi qua email trong thời gian sớm nhất."
      >
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href={ROUTES.HOME}>Về trang chủ</Link>
          </Button>
        </CardFooter>
      </CenteredCard>
    );
  }

  if (context?.hasOpenAppeal) {
    return (
      <CenteredCard
        icon={<Clock className="size-6" />}
        tone="warning"
        title="Kháng cáo đang được xử lý"
        description="Bạn đã gửi một kháng cáo trước đó và chúng tôi đang xem xét. Vui lòng chờ phản hồi qua email."
      >
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href={ROUTES.HOME}>Về trang chủ</Link>
          </Button>
        </CardFooter>
      </CenteredCard>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <ShieldAlert className="size-6" />
        </div>
        <CardTitle>Kháng cáo khóa tài khoản</CardTitle>
        <CardDescription>
          Xin chào {context?.fullName}. Tài khoản tasker của bạn đã bị chấm dứt
          vĩnh viễn. Nếu bạn cho rằng đây là nhầm lẫn, hãy trình bày kháng cáo
          để chúng tôi xem xét lại.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {context?.banReason ? (
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Lý do khóa tài khoản
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {context.banReason}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="appeal-content">Nội dung kháng cáo</Label>
          <Textarea
            id="appeal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_LEN}
            rows={7}
            placeholder="Trình bày lý do bạn cho rằng quyết định khóa tài khoản là chưa hợp lý, kèm các bằng chứng hoặc giải thích cụ thể…"
            disabled={submitting}
          />
          <p className="text-right text-xs text-muted-foreground">
            {content.length}/{MAX_LEN}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || content.trim().length < MIN_LEN}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Gửi kháng cáo
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AppealPage() {
  return (
    <Shell>
      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </CardContent>
          </Card>
        }
      >
        <AppealInner />
      </Suspense>
    </Shell>
  );
}
