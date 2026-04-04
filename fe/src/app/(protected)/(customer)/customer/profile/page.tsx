"use client"
import dynamic from 'next/dynamic'
import TopLoadingBar from '@/components/loadings/TopLoadingBar'


const ProfilePage = dynamic(() => import('@/features/customer/pages/ProfilePage'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <TopLoadingBar />
        </div>
    )
})

function page() {
  return (
    <ProfilePage />
  )
}

export default page