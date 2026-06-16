export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    VERIFY_EMAIL: "/auth/verify-email",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  USERS: {
    BASE: "/users",
    PROFILE: "/users/profile",
  },
  TASKERS: {
    BASE: "/taskers",
    VERIFY: "/taskers/verify",
  },
  SERVICES: {
    BASE: "/services",
    CATEGORIES: "/services/categories",
  },
  BOOKINGS: {
    BASE: "/bookings",
    STATUS: "/bookings/status",
  },
} as const;
