'use client';

import { Box } from '@mui/material';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: '#f5f5f5'
            }}
        >
            {children}
        </Box>
    );
}