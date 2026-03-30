"use client"
import { createContext, useContext, useState } from "react"
import { FormData } from "../_components/authv1/MultiStepForm"
import { useRegister } from "../hooks/auth.hooks"

type TVerifyEmailContext = {
    
}

const VerifyEmailContext = createContext<TVerifyEmailContext | null>(null)

export function VerifyEmailProvider({ children }: { children: React.ReactNode }) {
    return (
        <VerifyEmailContext.Provider value={
            {

            }
        }>
            {children}
        </VerifyEmailContext.Provider>
    )
}

export function useVerifyEmailContext() {
    const context = useContext(VerifyEmailContext)
    if (!context) {
        throw new Error("useVerifyEmailContext phải được sử dụng trong VerifyEmailProvider")
    }
    return context
}