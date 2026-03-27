export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  fullName?: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  lastLogin?: string;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
}

export type LoginFormValues = {
  email: string;
  password: string;
};

export type LoginValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};
