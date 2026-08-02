export interface AppealContext {
  taskerId: string;
  fullName: string;
  email: string;
  banReason: string | null;
  hasOpenAppeal: boolean;
}

export interface SubmitAppealResult {
  ticketId: string;
}
