'use client'

import dynamic from 'next/dynamic'

const CategoryDetailPage = dynamic(() => import('@/features/services/pages/CategoryDetailPage'), {
  ssr: false,
})

export default function Page() {
  return <CategoryDetailPage />
}
