'use client'
import dynamic from 'next/dynamic'
import TopLoadingBar from '@/components/loadings/TopLoadingBar'

const OtpVerifyFlow = dynamic(() => import('@/features/auth/pages/OtpVerifyPage'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <TopLoadingBar />
        </div>
    )
})

function OtpVerifyPage() {
    return (
        <OtpVerifyFlow />
    )
}

export default OtpVerifyPage
