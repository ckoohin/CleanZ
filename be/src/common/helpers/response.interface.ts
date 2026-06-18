export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  errorCode: string;
  message: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginationQuery {
  page: number = 1;
  limit: number = 20;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
