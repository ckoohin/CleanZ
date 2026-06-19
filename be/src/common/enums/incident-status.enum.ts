// Chiều A — vòng đời ca sự cố. Khớp enum `incident_status` trong data.sql.
export enum IncidentStatus {
  REPORTED = 'REPORTED',
  INVESTIGATING = 'INVESTIGATING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPENSATED = 'COMPENSATED',
  CLOSED = 'CLOSED',
}
