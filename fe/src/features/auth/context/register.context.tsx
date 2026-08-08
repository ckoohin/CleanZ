"use client"
import { createContext, useContext, useState } from "react"
import { FormData } from "../types/form.type"
import { useRegister } from "../hooks/auth.hooks"
import { useRouter } from "next/navigation"

type TRegisterContext = {
    isPending: boolean,
    formData: FormData,
    updateFormData: (data: Partial<FormData>) => void,
    onSubmit: () => Promise<void>,
}

const RegisterContext = createContext<TRegisterContext | null>(null)

export function RegisterProvider({ children }: { children: React.ReactNode }) {
    const register = useRegister()
    const router = useRouter()
    const [isPending, setIsPending] = useState(false)
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        checkedTerms: false,
    });
    const updateFormData = (data: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };
    const onSubmit = async () => {
        if (isPending) return

        try {
            
            const { email, fullName, password } = formData;
            const data = {
                email,
                password,
                fullName: fullName.trim(),
            }

            setIsPending(true)

            await register.mutateAsync(data)

            router.push(`/verify-email-notice?email=${encodeURIComponent(email)}`)

        } catch {
            // Hook đăng ký chịu trách nhiệm hiển thị lỗi đã được chuẩn hóa.
        } finally {
            setIsPending(false)
        }
    }
    return (
        <RegisterContext.Provider value={
            {
                isPending,
                formData,
                updateFormData,
                onSubmit,
            }}>
            {children}
        </RegisterContext.Provider>
    )
}

export function useRegisterContext() {
    const context = useContext(RegisterContext)
    if (!context) {
        throw new Error("useRegisterContext phải được sử dụng trong RegisterProvider")
    }
    return context
}
