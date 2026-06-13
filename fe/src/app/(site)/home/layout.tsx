import Footer from '@/components/layouts/site/footer/Footer'
import { Header } from '@/components/layouts/site/header/Header'
import { BottomNav } from '@/components/layouts/site/BottomNav'

function HomeLayout(
    { children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            
            <main>
                {children}
            </main>
            
            <div className="hidden lg:block">
                <Footer />
            </div>

            <BottomNav />
        </>
    )
}

export default HomeLayout
