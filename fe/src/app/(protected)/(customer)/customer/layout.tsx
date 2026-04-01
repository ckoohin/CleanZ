import { Header } from '@/components/layouts/customer/header/Header'
import Footer from '@/components/layouts/site/footer/Footer'
import React from 'react'

function HomeLayout(
    { children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {children}
            <Footer/>
        </>
    )
}

export default HomeLayout