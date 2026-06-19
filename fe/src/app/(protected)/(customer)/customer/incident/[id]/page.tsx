import { IncidentReportForm } from "@/features/customer/incident/components/IncidentReportForm";

export default function IncidentRoute({ params }: { params: { id: string } }) {
  return <IncidentReportForm bookingId={params.id} />;
}
