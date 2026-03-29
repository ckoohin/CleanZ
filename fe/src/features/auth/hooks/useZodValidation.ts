import { z } from "zod";

type ErrorMap = Record<string, string>;

export function useZodValidation<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true as const, errors: {} as ErrorMap };
    }

    const errors: ErrorMap = {};

    // Lấy lỗi theo field từ issues (ổn định nhất)
    for (const issue of result.error.issues) {
      const key = issue.path?.[0]; // ví dụ: "email", "username"
      if (typeof key === "string" && !errors[key]) {
        errors[key] = issue.message; // lấy lỗi đầu tiên cho mỗi field
      }
    }

    // Lỗi chung (không có path)
    if (Object.keys(errors).length === 0) {
      errors._form = result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    }

    return { success: false as const, errors };
  };
}
