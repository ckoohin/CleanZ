import Footer from '@/components/layouts/site/footer/Footer'
import { Header } from '@/components/layouts/site/header/Header'
import React from 'react'
function HomeLayout(
    { children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    )
}

export default HomeLayout
