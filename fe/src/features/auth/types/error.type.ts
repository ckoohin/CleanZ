export type ErrorResponse = {
  message?: {
    status: number;
    // errors: {};
    errors: object;
  };
};

export type ErrorMap = Record<string, string>;
