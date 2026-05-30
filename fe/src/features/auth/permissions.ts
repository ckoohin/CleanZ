import { User, UserRole } from "./types/user.type";

export function hasRole(user: User | null | undefined, role: UserRole): boolean {
  return user?.role === role;
}

export function hasAnyRole(user: User | null | undefined, roles: UserRole[]): boolean {
  return user ? roles.includes(user.role) : false;
}

export function isAdmin(user: User | null | undefined): boolean {
  return hasRole(user, "ADMIN");
}

export function isStaff(user: User | null | undefined): boolean {
  return hasRole(user, "STAFF");
}

export function isCustomer(user: User | null | undefined): boolean {
  return hasRole(user, "CUSTOMER");
}
