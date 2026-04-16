'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/query/client';
import { AuthSetup } from '@/features/auth/AuthSetup';

import { ThemeToggleProvider } from '@/contexts/themeToggle.context';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeToggleProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSetup />
        {children}
      </QueryClientProvider>
    </ThemeToggleProvider>
  );
}
