export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    PROFILE: "/auth/profile",
    LOGOUT: "/auth/logout",
    VERIFY_EMAIL: "/auth/verify-email",
    RESEND_VERIFICATION_EMAIL: "/auth/resend-verification-email",
    VERIFY_LOGIN_OTP: "/auth/verify-login-otp",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  USERS: {
    BASE: "/users",
    PROFILE: "/users/profile",
  },
  CUSTOMER: {
    PROFILE: "/customer/profile/me",
    LOOKUP: "/customer/lookup", // tasker tra cứu khách theo SĐT
    ADDRESSES: "/customer/addresses",
    ADDRESS: (id: string) => `/customer/addresses/${id}`,
    DEFAULT_ADDRESS: (id: string) => `/customer/addresses/${id}/default`,
    VOUCHERS_AVAILABLE: "/customer/vouchers/available",
  },
  TASKERS: {
    BASE: "/taskers",
    VERIFY: "/taskers/verify",
    UPDATE_PRESENCE: "/tasker/me/presence",
  },
  APPEALS: {
    BASE: "/appeals",
    VERIFY: "/appeals/verify",
  },
  SERVICES: {
    BASE: "/services",
    CATEGORIES: "/services/categories",
  },
  BLOG: {
    BASE: "/blog",
    DETAIL: (id: string) => `/blog/${id}`,
    ADMIN_ALL: "/blog/admin/all",
    ADMIN_BASE: "/blog/admin",
    ADMIN_DETAIL: (id: string) => `/blog/admin/${id}`,
    ADMIN_STATUS: (id: string) => `/blog/admin/${id}/status`,
  },
  PUBLIC: {
    CATEGORIES: "/public/categories",
    SERVICES: "/public/services",
  },
  SUB_SERVICES: {
    LIST: "/admin/sub-services",
    DETAIL: (id: string) => `/admin/sub-services/${id}`,
  },
  BOOKING: {
    // Customer APIs
    QUOTE: "/booking/quote",
    CREATE: "/booking",
    MY_ACTIVE: "/booking/my-booking",
    MY_LIST: "/booking/my-bookings",
    DETAIL: (id: string) => `/booking/${id}`,
    CANCEL: (id: string) => `/booking/customer/${id}/cancel`,
    UPDATE_SCHEDULE: (id: string) => `/booking/${id}/schedule-address`,
    // Flow tasker tạo đơn hộ customer
    CONFIRM_TASKER_BOOKING: (id: string) =>
      `/booking/customer/${id}/confirm-tasker-booking`,
    DECLINE_TASKER_BOOKING: (id: string) =>
      `/booking/customer/${id}/decline-tasker-booking`,
    // Customer xác nhận hoàn thành + thanh toán phần phát sinh (thêm giờ)
    CONFIRM_COMPLETION: (id: string) =>
      `/booking/customer/${id}/confirm-completion`,
    // Tasker APIs
    TASKER_CREATE_FOR_CUSTOMER: "/booking/tasker/create-for-customer",
    TASKER_CUSTOMER_VOUCHERS_AVAILABLE:
      "/booking/tasker/customer-vouchers/available",
    TASKER_ACTIVE: "/booking/tasker/active/current",
    TASKER_COMPLETED: "/booking/tasker/completed",
    TASKER_POSTED_LIST: "/booking/tasker/posted",
    TASKER_POSTED_DETAIL: (id: string) => `/booking/tasker/posted/${id}`,
    TASKER_ACCEPT: (id: string) => `/booking/tasker/posted/${id}/accept`,
    TASKER_ASSIGNED: (id: string) => `/booking/tasker/${id}`,
    TASKER_ON_WAY: (id: string) => `/booking/tasker/${id}/on-the-way`,
    TASKER_CHECKIN: (id: string) => `/booking/tasker/${id}/check-in`,
    TASKER_START: (id: string) => `/booking/tasker/${id}/start`,
    TASKER_COMPLETE: (id: string) => `/booking/tasker/${id}/complete`,
    TASKER_CANCEL: (id: string) => `/booking/tasker/${id}/cancel`,
  },
  ADMIN_SUPPORT_TICKETS: {
    BASE: "/admin/support-tickets",
    CONFIG: "/admin/support-tickets/config",
    UNREAD_TOTAL: "/admin/support-tickets/unread-total",
    DETAIL: (id: string) => `/admin/support-tickets/${id}`,
    ASSIGN: (id: string) => `/admin/support-tickets/${id}/assign`,
    STATUS: (id: string) => `/admin/support-tickets/${id}/status`,
    MESSAGES: (id: string) => `/admin/support-tickets/${id}/messages`,
    INTERNAL_NOTES: (id: string) =>
      `/admin/support-tickets/${id}/internal-notes`,
    READ: (id: string) => `/admin/support-tickets/${id}/read`,
    ATTACHMENTS: (id: string) => `/admin/support-tickets/${id}/attachments`,
    RESOLUTIONS: (id: string) => `/admin/support-tickets/${id}/resolutions`,
    CATEGORY: (id: string) => `/admin/support-tickets/${id}/category`,
  },
  ADMIN_NOTIFICATIONS: {
    BROADCAST: "/admin/notifications/broadcast",
    HISTORY: "/admin/notifications",
  },
  ADMIN_ACTIVITIES: {
    BASE: "/admin/activities",
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    BASE: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    READ_ALL: "/notifications/read-all",
    READ_ONE: (id: string) => `/notifications/${id}/read`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
  },
  SUPPORT_TICKETS: {
    BASE: "/support-tickets",
    MINE: "/support-tickets/mine",
    UNREAD_TOTAL: "/support-tickets/unread-total",
    DETAIL: (id: string) => `/support-tickets/${id}`,
    MESSAGES: (id: string) => `/support-tickets/${id}/messages`,
    READ: (id: string) => `/support-tickets/${id}/read`,
    SURVEY: (id: string) => `/support-tickets/${id}/survey`,
    ATTACHMENTS: (id: string) => `/support-tickets/${id}/attachments`,
  },
  // ─── Incident ──────────────────────────────────────────────────────────────
  INCIDENTS: {
    BASE: "/incidents",
    MINE: "/incidents/mine",
    DETAIL: (id: string) => `/incidents/${id}`,
    EVIDENCES: "/incidents/evidences", // upload trước khi tạo (không có :id)
    WITHDRAW: (id: string) => `/incidents/${id}/withdraw`,
    ITEM_EVIDENCES: (id: string, itemId: string) =>
      `/incidents/${id}/damage-items/${itemId}/evidences`,
  },
  TASKER_INCIDENTS: {
    MINE: "/tasker/incidents/mine",
    DETAIL: (id: string) => `/tasker/incidents/${id}`,
    EVIDENCES: "/tasker/incidents/evidences",
    STATEMENTS: (id: string) => `/tasker/incidents/${id}/statements`,
    DECISION_RESPONSE: (id: string) =>
      `/tasker/incidents/${id}/decision-response`,
  },
  ADMIN_INCIDENTS: {
    BASE: "/admin/incidents",
    CONFIG: "/admin/incidents/config",
    RECONCILIATION: "/admin/incidents/reconciliation",
    DETAIL: (id: string) => `/admin/incidents/${id}`,
    ACCEPT: (id: string) => `/admin/incidents/${id}/accept`,
    VERIFY: (id: string) => `/admin/incidents/${id}/items/verify`,
    DECISION_DRAFT: (id: string) => `/admin/incidents/${id}/decision-draft`,
    DECISION_DRAFT_SUBMIT: (id: string) =>
      `/admin/incidents/${id}/decision-draft/submit`,
    DECISION_RESPONSE_REVIEW: (id: string) =>
      `/admin/incidents/${id}/decision-response/review`,
    DECISION_REVISE: (id: string) => `/admin/incidents/${id}/decision/revise`,
    DECISION_EXTEND_RESPONSE: (id: string) =>
      `/admin/incidents/${id}/decision/extend-response`,
    DECISION_FINALIZE: (id: string) =>
      `/admin/incidents/${id}/decision/finalize`,
    SECOND_APPROVAL: (id: string) => `/admin/incidents/${id}/second-approval`,
    COMPENSATE: (id: string) => `/admin/incidents/${id}/compensate`,
    COMPENSATE_MANUAL: (id: string) =>
      `/admin/incidents/${id}/compensate/manual`,
    TRANSFER_PROOF: "/admin/incidents/evidences/transfer-proof",
    COMPENSATION_REVERSE: (id: string) =>
      `/admin/incidents/${id}/compensation/reverse`,
    UNLOCK_REPORTER: (id: string) => `/admin/incidents/${id}/unlock-reporter`,
    FROM_TICKET: (ticketId: string) =>
      `/admin/incidents/from-ticket/${ticketId}`,
    HOUSEKEEPING: "/admin/incidents/run-housekeeping",
  },
  ADMIN_SERVICES: {
    BASE: "/admin/sub-services",
    DETAIL: (id: string) => `/admin/sub-services/${id}`,
    BOOKINGS: (id: string) => `/admin/sub-services/${id}/bookings`,
    TASKERS: (id: string) => `/admin/sub-services/${id}/taskers`,
  },
  ADMIN_SERVICE_PACKAGES: {
    BASE: "/admin/service-packages",
    DETAIL: (id: string) => `/admin/service-packages/${id}`,
    ANALYTICS: (id: string) => `/admin/service-packages/${id}/analytics`,
    SUB_SERVICES: (id: string) => `/admin/service-packages/${id}/sub-services`,
    REMOVE_SUB_SERVICE: (id: string, subServiceId: string) =>
      `/admin/service-packages/${id}/sub-services/${subServiceId}`,
    REPORTS: {
      OVERVIEW: "/admin/service-packages/reports/overview",
      REVENUE_TREND: "/admin/service-packages/reports/revenue-trend",
      BY_PACKAGE: "/admin/service-packages/reports/by-package",
      BOOKING_STATUS: "/admin/service-packages/reports/booking-status",
      HOURLY_DISTRIBUTION:
        "/admin/service-packages/reports/hourly-distribution",
      ADDON_POPULARITY: "/admin/service-packages/reports/addon-popularity",
      DURATION_POPULARITY:
        "/admin/service-packages/reports/duration-popularity",
      TOP_TASKERS: "/admin/service-packages/reports/top-taskers",
      EXPORT: {
        REVENUE_TREND: "/admin/service-packages/reports/export/revenue-trend",
        BY_PACKAGE: "/admin/service-packages/reports/export/by-package",
        BOOKING_STATUS: "/admin/service-packages/reports/export/booking-status",
        HOURLY_DISTRIBUTION:
          "/admin/service-packages/reports/export/hourly-distribution",
        ADDON_POPULARITY:
          "/admin/service-packages/reports/export/addon-popularity",
        DURATION_POPULARITY:
          "/admin/service-packages/reports/export/duration-popularity",
        TOP_TASKERS: "/admin/service-packages/reports/export/top-taskers",
        ALL: "/admin/service-packages/reports/export/all",
      },
    },
  },
  ADMIN_BOOKINGS: {
    BASE: "/admin/bookings",
    DETAIL: (id: string) => `/admin/bookings/${id}`,
    AVAILABLE_TASKERS: (id: string) =>
      `/admin/bookings/${id}/available-taskers`,
    ASSIGN_TASKER: (id: string) => `/admin/bookings/${id}/tasker`,
    STATUS: (id: string) => `/admin/bookings/${id}/status`,
    CANCEL: (id: string) => `/admin/bookings/${id}/cancel`,
    EXPIRE_OVERDUE: "/admin/bookings/expire-overdue",
    ACTIVE_TASKERS: "/admin/bookings/taskers/active",
  },
  ADMIN_CUSTOMERS: {
    BASE: "/admin/customers",
    DETAIL: (id: string) => `/admin/customers/${id}`,
    BOOKINGS: (id: string) => `/admin/customers/${id}/bookings`,
    STATUS: (id: string) => `/admin/customers/${id}/status`,
    RESTORE: (id: string) => `/admin/customers/${id}/restore`,
    RESEND_TEMP_PASSWORD: (id: string) =>
      `/admin/customers/${id}/resend-temp-password`,
  },
  CUSTOMER_POLICIES: {
    PUBLIC_ALL: "/policy/public/all",
    PUBLIC_BY_SLUG: (slug: string) => `/policy/public/by-slug/${slug}`,
  },
  TASKER_POLICIES: {
    PUBLIC_ALL: "/policy/public/all",
    PUBLIC_BY_SLUG: (slug: string) => `/policy/public/by-slug/${slug}`,
  },
  ADMIN_POLICIES: {
    BASE: "/policy",
    DETAIL: (id: string) => `/policy/${id}`,
    PACKAGES_BY_POLICY: (id: string) => `/policy/${id}/packages`,
    SEED: "/policy/seed",
    DEFAULTS: "/policy/defaults",
    PUBLIC_ALL: "/policy/public/all",
    PUBLIC_BY_SLUG: (slug: string) => `/policy/public/by-slug/${slug}`,
    // Package assignment
    PACKAGE_POLICIES: (pkgId: string) => `/policy/packages/${pkgId}`,
    ASSIGN_TO_PACKAGE: (pkgId: string) => `/policy/packages/${pkgId}/assign`,
    REMOVE_FROM_PACKAGE: (pkgId: string, policyId: string) =>
      `/policy/packages/${pkgId}/policies/${policyId}`,
    APPLY_DEFAULTS: (pkgId: string) =>
      `/policy/packages/${pkgId}/apply-defaults`,
  },
  ADMIN_PRICING: {
    CONFIGS: "/admin/pricing/configs",
    CONFIG_DETAIL: (id: string) => `/admin/pricing/configs/${id}`,
    PEAK_DAYS: "/admin/pricing/peak-days",
    PEAK_DAY_DETAIL: (id: string) => `/admin/pricing/peak-days/${id}`,
    // Pricing Tiers (mức giá theo m²/giờ/cố định)
    TIERS: "/admin/pricing/tiers",
    TIER_DETAIL: (id: string) => `/admin/pricing/tiers/${id}`,
    TIERS_BY_PACKAGE: (packageId: string) =>
      `/admin/pricing/tiers/by-package/${packageId}`,
    CALCULATE: "/admin/pricing/calculate",
  },
  REVIEWS: {
    CREATE: (bookingId: string) => `/reviews/booking/${bookingId}`,
    MY_REVIEW: (bookingId: string) => `/reviews/booking/${bookingId}`,
    PACKAGE: (packageId: string) => `/reviews/package/${packageId}`,
    TASKER_PUBLIC: (taskerId: string) => `/reviews/tasker/${taskerId}`,
    REPORT: (id: string) => `/reviews/${id}/report`,
  },
  TASKER_REVIEWS: {
    BASE: "/tasker/reviews",
    REPLY: (id: string) => `/tasker/reviews/${id}/reply`,
    REPORT: (id: string) => `/tasker/reviews/${id}/report`,
  },
  ADMIN_REVIEWS: {
    BASE: "/admin/reviews",
    DASHBOARD: "/admin/reviews/dashboard",
    EXPORT: "/admin/reviews/export",
    REPORTS: "/admin/reviews/reports",
    DECIDE_REPORT: (reportId: string) =>
      `/admin/reviews/reports/${reportId}/decide`,
    HIDE: (id: string) => `/admin/reviews/${id}/hide`,
    REPLY: (id: string) => `/admin/reviews/${id}/reply`,
  },
  ADMIN_SETTINGS: {
    BASE: "/admin/settings",
  },
  ADMIN_WORKFLOWS: {
    BASE: "/admin/workflows",
    DETAIL: (id: string) => `/admin/workflows/${id}`,
    STEPS: (id: string) => `/admin/workflows/${id}/steps`,
    STEP_DETAIL: (id: string, stepId: string) =>
      `/admin/workflows/${id}/steps/${stepId}`,
    REORDER: (id: string) => `/admin/workflows/${id}/steps/reorder`,
  },
  ADMIN_COVERAGE_AREAS: {
    BASE: "/admin/coverage-areas",
    SEED: "/admin/coverage-areas/seed",
  },
};
