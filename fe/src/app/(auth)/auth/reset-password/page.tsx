"use client"
import dynamic from 'next/dynamic'
import TopLoadingBar from '@/components/loadings/TopLoadingBar'

const ResetPasswordFlow = dynamic(() => import('@/features/auth/pages/ResetPasswordPage'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <TopLoadingBar />
    </div>
  )
}); 

function ResetPasswordPage() {
    return (
        <ResetPasswordFlow />
    )
}

export default ResetPasswordPage
