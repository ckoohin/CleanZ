"use client"
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ContainerProps = {
    children: ReactNode;
    className?: string;
    withGrain?: boolean;
    url_img?: string;
    classOverlay?: string;
    overlay?: boolean;
    classNameUrlImg?: string;
    classNameContent?: string;
} & React.HTMLAttributes<HTMLDivElement>;
import { usePathname } from "next/navigation"

export default function Container({
    children,
    className,
    classOverlay,
    classNameUrlImg,
    classNameContent,
    url_img,
    overlay = false,
    ...props
}: ContainerProps) {

    const pathname = usePathname()

    const isTables = pathname.endsWith("/tables")

    return (
        <div
            className={cn(
                "relative flex w-full flex-col overflow-x-clip overflow-y-scroll",
                className
            )}
            {...props}
        >
            {url_img && (
                <div className={cn(
                    "absolute inset-0 z-0 pointer-events-none select-none",
                    classNameUrlImg
                )}>
                    <img
                        src={`${url_img}`}
                        alt=""
                        className={cn(
                            "w-full object-cover h-full object-cover object-center",
                        )}
                    />
                </div>
            )}

            {overlay && (
                <div className={cn(
                    "absolute z-1 bg-gray-400/40 w-full h-full",
                    classOverlay
                )}></div>
            )}

            <div className={cn(
                "flex relative h-full z-10 w-full mx-auto flex-col px-4",
                isTables ? "max-w-[2080px]" : "max-w-[1600px]",
                classNameContent
            )}>
                {children}
            </div>
        </div>
    );
}

