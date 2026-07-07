// ─── Types ────────────────────────────────────────────────────────────────────
export interface SelectedSubService {
  id: string;
  name: string;
  isRequired: boolean;
  isDefault: boolean;
  sortOrder: number;
  price: number;
  isActive: boolean;
}

export interface PeakHourFormState {
  dayOfWeek: string;
  selectedDays?: string[];
  startHour: string;
  endHour: string;
  multiplier: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  title?: string;
  description?: string;
}
