import { AuthProvider } from "./auth.type";

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'TECHNICIAN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  avatar?: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Profile extends User {
  provider: AuthProvider;
  providerId?: string | null;
}

export type ProfileResponse = Profile;
