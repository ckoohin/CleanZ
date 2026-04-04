"use client"
import dynamic from 'next/dynamic'
import TopLoadingBar from '@/components/loadings/TopLoadingBar'

const VerifyEmailFlow = dynamic(() => import('@/features/auth/pages/VerifyEmailPage'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <TopLoadingBar />
        </div>
    )
})

function VerifyEmailPage() {
    return (
        <VerifyEmailFlow />
    )
}

export default VerifyEmailPage