import Footer from '@/components/layouts/site/footer/Footer'
import { Header } from '@/components/layouts/site/header/Header'
import React from 'react'

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    )
}
