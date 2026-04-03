import { AuthProvider } from "./auth.type";

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'TECHNICIAN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
    id: string,
    email: string,
    fullName: string,
    provider: AuthProvider,
    providerId: string,
    role: UserRole,
    is_active: boolean,
    is_verified: boolean,
    last_login: string,
    created_at: string,
    updated_at: string
}

export type ProfileResponse = Profile;