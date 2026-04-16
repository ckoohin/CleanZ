'use client'

import dynamic from 'next/dynamic'

const ServiceBookingPage = dynamic(() => import('@/features/booking/pages/ServiceBookingPage'), {
  ssr: false,
})

export default function Page() {
  return <ServiceBookingPage />
}
