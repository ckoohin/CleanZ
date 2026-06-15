"use client";

import React from 'react';
import RoleGuard from "@/features/auth/_components/authv1/RoleGuard";

export default function CustomerGroupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* <RoleGuard allowedRoles={['CUSTOMER']}> */}
                {children}
            {/* </RoleGuard> */}
        </>
    );
}
