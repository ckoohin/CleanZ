"use client"
import dynamic from 'next/dynamic'
import TopLoadingBar from '@/components/loadings/TopLoadingBar'

const ForgotPasswordFlow = dynamic(() => import('@/features/auth/pages/ForgotPasswordPage'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <TopLoadingBar />
        </div>
    )
})  

function ForgotPasswordPage() {
    return (
        <ForgotPasswordFlow />
    )
}

export default ForgotPasswordPage