"use client"
import TopLoadingBar from '@/components/loadings/TopLoadingBar'
import dynamic from 'next/dynamic'

const HomePage = dynamic(() => import('@/features/customer/pages/HomePage'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <TopLoadingBar />
        </div>
    )
})

function Page() {
    return (
        <HomePage />
    )
}

export default Page