'use client'

import dynamic from 'next/dynamic'

const ServiceBookingPage = dynamic(() => import('@/features/booking/pages/ServiceBookingPage'), {
  ssr: false,
})

import { use } from 'react'

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  return <ServiceBookingPage slug={resolvedParams.slug} />
}
