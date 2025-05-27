'use client';

import React, { useState, useEffect } from 'react';
import { Box, Toolbar, CssBaseline, Container } from '@mui/material';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import AOS from 'aos';

const drawerWidth = 240;

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        // Refresh AOS on route change
        if (typeof window !== 'undefined') {
            AOS.refresh();
        }
    }, [pathname]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                }}
            >
                Loading...
            </Box>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <TopBar handleDrawerToggle={handleDrawerToggle} />
            <Sidebar
                mobileOpen={mobileOpen}
                handleDrawerToggle={handleDrawerToggle}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    bgcolor: '#f5f5f5',
                    minHeight: '100vh',
                }}
            >
                <Toolbar />
                <Container maxWidth={false} sx={{ mt: 2 }}>
                    {children}
                </Container>
            </Box>
        </Box>
    );
}