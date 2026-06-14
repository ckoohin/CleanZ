import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { AdminBreadcrumb } from "@/components/sidebar/admin-breadcrumb"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-background">
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-6 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="-ml-1 text-primary hover:bg-primary/10 transition-colors" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <AdminBreadcrumb />
                    </div>
                    <ThemeToggle />
                </header>
                <main className="flex-1 p-3 md:p-4 animate-in fade-in duration-500">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
