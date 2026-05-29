"use client"
import { cn } from "@/lib/utils";
import type { ReactNode, HTMLAttributes } from "react";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    classNameContent?: string;
    url_img?: string;
    classNameUrlImg?: string;
    overlay?: boolean;
    classOverlay?: string;
}

export default function Container({
    children,
    className,
    classNameContent,
    url_img,
    classNameUrlImg,
    overlay = false,
    classOverlay,
    ...props
}: ContainerProps) {
    return (
        <section
            className={cn(
                "relative flex w-full flex-col overflow-x-clip",
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
                        src={url_img}
                        alt=""
                        className="w-full h-full object-cover object-center"
                    />
                </div>
            )}

            {overlay && (
                <div className={cn(
                    "absolute inset-0 z-[1] bg-black/40",
                    classOverlay
                )} />
            )}

            <div className={cn(
                "relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8 flex flex-col h-full",
                classNameContent
            )}>
                {children}
            </div>
        </section>
    );
}

