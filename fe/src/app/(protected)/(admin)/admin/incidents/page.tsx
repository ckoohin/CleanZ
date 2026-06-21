import { IncidentQueueTable } from "@/features/incident/admin/_components/IncidentQueueTable";

export default function AdminIncidentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Quản lý Sự cố (Incidents)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi, thẩm định và xử lý bồi thường cho khách hàng.
        </p>
      </div>

      <IncidentQueueTable />
    </div>
  );
}
