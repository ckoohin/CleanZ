"use client"
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LoginProvider } from '@/features/auth/context/login.context'
import { RegisterProvider } from '@/features/auth/context/register.context'
import { useAuth } from '@/features/auth/hooks/auth.hooks'
import TopLoadingBar from '@/components/loadings/TopLoadingBar'

function AuthLayout({
    children
}: {
    children: React.ReactNode
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: user, isLoading } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        if (!isLoading && user) {
            const timer = setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const nextUrl = params.get('next');
                
                if (nextUrl) {
                    setIsRedirecting(true);
                    router.replace(nextUrl);
                } else {
                    // Redirect based on role and current page
                    if (user.role === 'ADMIN' && pathname.includes('login-admin')) {
                        setIsRedirecting(true);
                        router.replace('/admin');
                    } else if (user.role === 'TASKER' && pathname.includes('login-tasker')) {
                        setIsRedirecting(true);
                        router.replace('/tasker');
                    } else if (user.role === 'CUSTOMER' && pathname === '/login') {
                        setIsRedirecting(true);
                        router.replace('/customer');
                    }
                    // Nếu vào trang login của role khác thì không redirect, cho phép xem form
                }
            }, 0);
            
            return () => clearTimeout(timer);
        }
    }, [user, isLoading, router]);

    // Hiển thị loading trong lúc check auth hoặc đang redirect
    if (isLoading || isRedirecting) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <TopLoadingBar />
            </div>
        );
    }

    return (
        <LoginProvider>
            <RegisterProvider>
                {children}
            </RegisterProvider>
        </LoginProvider>
    )
}

export default AuthLayout
