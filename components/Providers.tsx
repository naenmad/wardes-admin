'use client';

import React from 'react';
import ThemeRegistry from '@/components/ThemeRegistry';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeRegistry>
            <AuthProvider>
                {children}
            </AuthProvider>
        </ThemeRegistry>
    );
}