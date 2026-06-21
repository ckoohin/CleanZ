"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { ReportWizard } from "../_components/ReportWizard";

export function ReportIncidentPage() {
  const sp = useSearchParams();
  const bookingId = sp.get("bookingId") ?? undefined;
  return <ReportWizard bookingId={bookingId} />;
}
