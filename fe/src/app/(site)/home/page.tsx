'use client'

import dynamic from 'next/dynamic'

const HomePagee = dynamic(() => import('@/features/home/HomePage'), {
  ssr: false,
})

export default function HomePage() {
  return <HomePagee />
}
