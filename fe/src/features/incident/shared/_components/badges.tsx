import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABEL,
  STATUS_TONE,
  COMP_STATUS_LABEL,
  COMP_STATUS_TONE,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  TONE_BADGE_CLASS,
} from "../incident.labels";
import type {
  CompensationStatus,
  IncidentStatus,
  Severity,
} from "../incident.enums";

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${TONE_BADGE_CLASS[STATUS_TONE[status]]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function CompensationBadge({ status }: { status: CompensationStatus }) {
  if (status === "NONE") return null;
  return (
    <Badge variant="outline" className={`text-xs ${TONE_BADGE_CLASS[COMP_STATUS_TONE[status]]}`}>
      {COMP_STATUS_LABEL[status]}
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
