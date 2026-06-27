import { IncidentQueueTable } from "@/features/incident/admin/_components/IncidentQueueTable";
import { PageHeader } from "@/components/admin";

export default function AdminIncidentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Sự cố (Incidents)"
        description="Theo dõi, thẩm định và xử lý bồi thường cho khách hàng."
      />

      <IncidentQueueTable />
    </div>
  );
}
