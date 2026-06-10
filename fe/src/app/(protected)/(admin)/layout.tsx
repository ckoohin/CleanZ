"use client";

import React from 'react';
import RoleGuard from "@/features/auth/_components/authv1/RoleGuard";

export default function AdminGroupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* Tạm thời gỡ RoleGuard để test giao diện */}
            {/* <RoleGuard allowedRoles={['ADMIN']}> */}
            {children}
            {/* </RoleGuard> */}
        </>
    );
}
