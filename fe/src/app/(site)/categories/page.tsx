'use client'

import dynamic from 'next/dynamic'

const CategoriesPage = dynamic(() => import('@/features/services/pages/CategoriesPage'), {
  ssr: false,
})

export default function Page() {
  return <CategoriesPage />
}
