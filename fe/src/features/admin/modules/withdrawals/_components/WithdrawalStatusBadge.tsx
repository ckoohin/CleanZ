import { StatusBadge, type BadgeTone } from "@/components/admin";
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
    tone: "warning",
  },
  APPROVED: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    tone: "info",
  },
  REJECTED: {
    label: "Từ chối",
    icon: XCircle,
    tone: "danger",
  },
  PROCESSED: {
    label: "Đã xử lý",
    icon: CircleDollarSign,
    tone: "success",
  },
} satisfies Record<
  WithdrawalStatus,
  { label: string; icon: typeof Clock3; tone: BadgeTone }
>;

export function WithdrawalStatusBadge({
  status,
}: {
  status: WithdrawalStatus;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <StatusBadge tone={config.tone} className="uppercase">
      <Icon className="size-3" />
      {config.label}
    </StatusBadge>
  );
}
