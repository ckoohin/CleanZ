"use client"
import { createContext, useContext, useState } from "react"
import { FormData } from "../types/form.type"
import { useRegister } from "../hooks/auth.hooks"
import { useRouter } from "next/navigation"

type TRegisterContext = {
    isPending: boolean,
    setIsPending: (value: boolean) => void

    formData: FormData,
    updateFormData: (data: Partial<FormData>) => void,

    currentStep: number,
    nextStep: () => void,
    prevStep: () => void,

    onSubmit: () => Promise<void>,

    TOTAL_STEPS: number,
}

const RegisterContext = createContext<TRegisterContext | null>(null)

export function RegisterProvider({ children }: { children: React.ReactNode }) {
    const register = useRegister()
    const router = useRouter()
    const [isPending, setIsPending] = useState(false)
    const [currentStep, setCurrentStep] = useState(1);
    const TOTAL_STEPS = 3;
    const [formData, setFormData] = useState<FormData>({
        email: '',

        username: '',
        lastName: '',
        firstName: '',
        dateOfBirth: '',

        password: '',
        confirmPassword: '',
        checkedTerms: false,
    });
    const updateFormData = (data: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };
    const nextStep = () => {

        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (isPending) return
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };
    const onSubmit = async () => {
        console.log('Form submitted:', formData);
        if (isPending) return

        try {
            
            const { username, email, lastName, firstName, dateOfBirth, password } = formData;


            const data = {
                email,
                password,
                fullName: `${lastName} ${firstName}`,
            }

            setIsPending(true)

            await register.mutateAsync(data)

            router.push(`/login`)

        } catch (error) {
            console.error("Register error:", error);
        } finally {
            setIsPending(false)
        }
    }
    return (
        <RegisterContext.Provider value={
            {
                isPending,
                setIsPending,

                formData,
                updateFormData,

                currentStep,
                nextStep,
                prevStep,

                onSubmit,

                TOTAL_STEPS
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