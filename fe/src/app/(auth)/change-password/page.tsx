"use client"
import dynamic from 'next/dynamic'
import TopLoadingBar from '@/components/loadings/TopLoadingBar'

const ChangePasswordFlow = dynamic(() => import('@/features/auth/pages/ChangePasswordPage'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <TopLoadingBar />
        </div>
    )
})

function ChangePasswordPage() {
    return (
        <ChangePasswordFlow />
    )
}

export default ChangePasswordPage
