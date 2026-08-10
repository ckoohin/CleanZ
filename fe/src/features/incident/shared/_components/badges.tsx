import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABEL_BY_AUDIENCE,
  STATUS_TONE,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  TONE_BADGE_CLASS,
  type IncidentAudience,
} from "../incident.labels";
import type { IncidentStatus, Severity } from "../incident.enums";

/**
 * Badge trạng thái DUY NHẤT. `CompensationBadge` đã bỏ: trục compensationStatus cũ chỉ lặp
 * lại thông tin mà trạng thái sự cố đã nói (AWAITING_PAYOUT / COMPENSATED).
 *
 * `audience` bắt buộc: cùng một trạng thái nhưng Khách, Tasker và Admin cần đọc ba câu
 * khác nhau. Để mặc định thì màn hình Khách sẽ vô tình hiện ngôn ngữ nội bộ của Admin.
 */
export function IncidentStatusBadge({
  status,
  audience,
}: {
  status: IncidentStatus;
  audience: IncidentAudience;
}) {
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${TONE_BADGE_CLASS[STATUS_TONE[status]]}`}>
      {STATUS_LABEL_BY_AUDIENCE[audience][status]}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge variant="outline" className={`text-xs ${TONE_BADGE_CLASS[SEVERITY_TONE[severity]]}`}>
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}
