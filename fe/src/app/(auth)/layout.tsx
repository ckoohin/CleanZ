"use client"
import { LoginProvider } from '@/features/auth/context/login.context'
import { RegisterProvider } from '@/features/auth/context/register.context'

function layout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <LoginProvider>
            <RegisterProvider>
                {children}
            </RegisterProvider>
        </LoginProvider>
    )
}

export default layout