"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Unlock } from "lucide-react";
import { useUnlockReporter } from "../hooks/useAdminIncident";

/** Gỡ khoá quyền báo cáo cho khách hàng của incident (sau khi từ chối vì khai gian). */
export function UnlockReporterButton({ id }: { id: string }) {
  const unlock = useUnlockReporter(id);
  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full rounded-lg gap-1.5"
      onClick={() => unlock.mutate()}
      disabled={unlock.isPending}
    >
      <Unlock className="size-3.5" />
      {unlock.isPending ? "..." : "Gỡ khoá quyền báo cáo (khách)"}
    </Button>
  );
}
