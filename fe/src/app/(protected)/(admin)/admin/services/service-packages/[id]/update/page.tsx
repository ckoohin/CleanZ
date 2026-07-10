import { ServicePackageUpdateWizard } from "@/features/admin/modules/service/_components/service-packages/update-wizard";

export default async function EditServicePackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ServicePackageUpdateWizard id={id} />;
}
