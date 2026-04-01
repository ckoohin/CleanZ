import { z } from "zod";

export const signupEmailField = z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không đúng định dạng");

export const signupUserNameField = z
    .string()
    .trim()
    .min(1, "Tên người dùng không được để trống")
    .min(3, "Tên người dùng phải có ít nhất 3 ký tự")
    .regex(
        /^[a-zA-Z0-9_]+$/,
        "Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới (_)"
    );
export const signupLastNameField = z
    .string()
    .trim()
    .min(1, "Họ không được để trống");

export const signupFirstNameField = z
    .string()
    .trim()
    .min(1, "Tên không được để trống");


export const signupPhoneField = z
    .string()

export const signupPasswordField = z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .regex(/\d/, "Mật khẩu phải chứa ít nhất một chữ số")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất một chữ cái viết hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất một chữ cái thường")
    .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
        "Mật khẩu phải chứa ít nhất một ký tự đặc biệt"
    );


export const signupStepOne = z.object({
    username:signupUserNameField,
    email: signupEmailField,
})

export const signupStepTowSchema = z.object({
    lastName: signupLastNameField,
    firstName: signupFirstNameField,
    dateOfBirth: z.string().min(1, "Ngày sinh không được để trống"),
});

export const signupStepThree = z.object({
    password: signupPasswordField
})

export const signin = z.object({
    email: z.string().min(1, "Email không được để trống").trim().email("Email không đúng định dạng"),
    password: z.string().min(1, "Password không được để trống").trim()
})

export const signupSchema = z.object({
    email: signupEmailField,
    username: signupUserNameField,
    password: signupPasswordField,
    dateOfBirth: z.string(),
});

export type SignupForm = z.infer<typeof signupSchema>;
