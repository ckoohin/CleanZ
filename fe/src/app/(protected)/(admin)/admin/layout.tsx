import { AppSidebar } from "@/components/siderber/app-sidebar"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
                        <Separator
                            orientation="vertical"
                            className="mr-2 h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/admin" className="font-medium hover:text-primary transition-colors">
                                        Hệ thống CleanZ
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="font-bold text-primary">Dashboard</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                             <span className="text-[10px] font-black uppercase tracking-wider text-primary opacity-80">Quản trị viên</span>
                             <span className="text-xs font-bold">Admin Root</span>
                        </div>
                        <ThemeToggle />
                    </div>
                </header>
                <main className="flex-1 p-3 md:p-4 animate-in fade-in duration-500">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
