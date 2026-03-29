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

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
}

export interface LoginResponse {
  user: User;
}
export interface RegisterResponse {
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
