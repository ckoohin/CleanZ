export const ROUTES = {
  HOME: "/",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot-password",
    VERIFY_EMAIL: "/verify-email",
  },
  CUSTOMER: {
    DASHBOARD: "/customer",
    PROFILE: "/customer/profile",
    BOOKING: "/customer/booking",
  },
  TASKER: {
    DASHBOARD: "/tasker",
    PROFILE: "/tasker/profile",
    SCHEDULE: "/tasker/schedule",
    SETTINGS: "/tasker/settings",
    ONBOARDING: "/tasker/onboarding",
  },
  ADMIN: {
    DASHBOARD: "/admin",
    CUSTOMERS: "/admin/customers",
    TASKERS: "/admin/taskers",
    SERVICES: "/admin/services",
    BOOKINGS: "/admin/bookings",
    REPORTS: "/admin/reports",
  },
} as const;
