import { Utensils } from 'lucide-react'
import { cn } from '../ui/utils'

interface LogoAdminProps {
    className?: string
    classNameIcon?: string
    classNameText?: string
}

const LogoAdmin = ({ className, classNameIcon, classNameText }: LogoAdminProps) => {
    return (
        <div className="flex items-center gap-3">
            <div
                className={cn("w-9 h-9 bg-linear-to-br from-savory-green to-savory-dark rounded-xl flex items-center justify-center text-white shadow-lg shadow-savory-green/30", className)}>
                <span className={cn("material-symbols-outlined font-bold", classNameIcon)}>
                    <Utensils />
                </span>
            </div>
            <h1 className={cn("text-2xl font-extrabold tracking-tight text-slate-800", classNameText)}>Savory</h1>
        </div>
    )
}

export default LogoAdmin