import { createContext, useContext, useState } from "react";
import { useZodValidation } from "../hooks/useZodValidation";
import { signin } from "../schemas/signup.schema";
import { useLogin } from "../hooks/auth.hooks";
import { useRouter } from "next/navigation";
import { LoginCredentials } from "../types/auth.type";

type LoginContextType = {
    showPassword: boolean,
    setShowPassword: (value: boolean) => void

    formData: LoginCredentials,
    setFormData: (value: LoginCredentials) => void,

    error: any,
    setErrors: (value: any) => void,

    validate: (data: LoginCredentials) => { success: boolean, errors: any },

    handleSubmit: (e: React.FormEvent) => void,
}

const LoginContext = createContext<LoginContextType | null>(null)

export function LoginProvider(
    { children }: { children: React.ReactNode }
) {
    const login = useLogin()
    const router = useRouter()
    const [formData, setFormData] = useState<LoginCredentials>({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setErrors] = useState<any>({});
    const validate = useZodValidation(signin);


    const handleSubmit = async (e: React.FormEvent) => {
        if (login.isPending) return

        try {
            e.preventDefault();
            const { success, errors } = validate(formData);
            if (!success) return setErrors(errors);

            login.mutate(formData)

            router.push(`${process.env.NEXT_PUBLIC_CLIENT_URL}/otp-verify`)

        } catch (error) {
            console.log(error);
        }
    };

    return (
        <LoginContext.Provider value={{
            showPassword,
            setShowPassword,

            formData,
            setFormData,

            error,
            setErrors,

            validate,

            handleSubmit
        }}>
            {children}
        </LoginContext.Provider>
    )
}

export function useLoginContext() {
    const context = useContext(LoginContext)
    if (!context) {
        throw new Error("useLoginContext phải được sử dụng trong LoginProvider")
    }
    return context
}
