"use client";

import React from "react";
import { ServicePackageUpdateWizard } from "@/features/admin/modules/service/_components/service-packages/update-wizard";

export default function EditServicePackagePage({ params }: { params: React.Usable<{ id: string }> }) {
  const { id } = React.use(params);

  return <ServicePackageUpdateWizard id={id} />;
}
