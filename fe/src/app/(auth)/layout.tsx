"use client"
import { RegisterProvider } from '@/features/auth/context/register.context'
import React from 'react'

function layout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <RegisterProvider>
            {children}
        </RegisterProvider>
    )
}

export default layout