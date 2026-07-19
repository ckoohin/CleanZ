'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/features/auth/hooks/auth.hooks'
import type { User } from '@/features/auth/types/auth.type'

const HomePagee = dynamic(() => import('@/features/home/HomePage'), {
  ssr: false,
})

export default function HomePage() {
  const router = useRouter()
  const { data: me } = useAuth() as { data: User | undefined }

  // Tasker không dùng trang home của customer — luôn đưa về khu vực /tasker.
  useEffect(() => {
    if (me?.role === 'TASKER') {
      router.replace('/tasker')
    }
  }, [me, router])

  if (me?.role === 'TASKER') return null

  return <HomePagee />
}
