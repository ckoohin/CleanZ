import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABEL,
  STATUS_TONE,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  TONE_BADGE_CLASS,
} from "../incident.labels";
import type { IncidentStatus, Severity } from "../incident.enums";

/**
 * Badge trạng thái DUY NHẤT. `CompensationBadge` đã bỏ: trục compensationStatus cũ chỉ lặp
 * lại thông tin mà trạng thái sự cố đã nói (AWAITING_PAYOUT / COMPENSATED).
 */
export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${TONE_BADGE_CLASS[STATUS_TONE[status]]}`}>
      {STATUS_LABEL[status]}
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
