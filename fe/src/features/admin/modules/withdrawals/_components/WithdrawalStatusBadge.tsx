import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  XCircle,
} from "lucide-react";
import type { WithdrawalStatus } from "../types/withdrawal.types";

const STATUS_CONFIG = {
  PENDING: {
    label: "Chờ duyệt",
    icon: Clock3,
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  APPROVED: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  REJECTED: {
    label: "Từ chối",
    icon: XCircle,
    className:
      "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  PROCESSED: {
    label: "Đã xử lý",
    icon: CircleDollarSign,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
} satisfies Record<
  WithdrawalStatus,
  { label: string; icon: typeof Clock3; className: string }
>;

export function WithdrawalStatusBadge({
  status,
}: {
  status: WithdrawalStatus;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        config.className,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
