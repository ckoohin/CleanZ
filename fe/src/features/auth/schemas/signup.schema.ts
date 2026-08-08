import { z } from "zod";

export const signupEmailField = z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không đúng định dạng");

export const signupFullNameField = z
    .string()
    .trim()
    .min(1, "Họ và tên không được để trống")
    .max(100, "Họ và tên không được vượt quá 100 ký tự");

export const signupPasswordField = z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .max(32, "Mật khẩu không được vượt quá 32 ký tự")
    .regex(/\d/, "Mật khẩu phải chứa ít nhất một chữ số")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất một chữ cái viết hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất một chữ cái thường")
    .regex(
        /[@$!%*?&]/,
        "Mật khẩu phải chứa ít nhất một ký tự đặc biệt"
    );

export const signupSchema = z.object({
    fullName: signupFullNameField,
    email: signupEmailField,
    password: signupPasswordField,
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    checkedTerms: z.literal(true, {
        message: "Vui lòng đồng ý với điều khoản và chính sách bảo mật",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
});

export const signin = z.object({
    email: z.string().min(1, "Email không được để trống").trim().email("Email không đúng định dạng"),
    password: z.string().min(1, "Password không được để trống").trim()
})

export type SignupForm = z.infer<typeof signupSchema>;
