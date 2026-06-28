export type PolicyRole = "CUSTOMER" | "TASKER" | "ALL";

export interface Policy {
  id: string;
  title: string;
  slug: string;
  content: string;
  role: PolicyRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePolicyPayload {
  title: string;
  slug: string;
  content: string;
  role: PolicyRole;
  isActive: boolean;
}

export interface UpdatePolicyPayload {
  title?: string;
  slug?: string;
  content?: string;
  role?: PolicyRole;
  isActive?: boolean;
}