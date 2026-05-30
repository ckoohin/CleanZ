"use client"
import { createContext, useContext, useState } from "react"
import { FormData } from "../types/form.type"
import { useRegister } from "../hooks/auth.hooks"

type TVerifyEmailContext = {}

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

// reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJmNTMyYi0wNzYzLTQ3ZDUtYmM5Ny0zMGIzZGRlYjg0YzAiLCJpYXQiOjE3NzQ5NDI3MDMsImV4cCI6MTc3NDk0MzYwM30.BYVZvdbnmTIX3eDzabKVmFC3q_ar7jn5EtydbTl0CDc
