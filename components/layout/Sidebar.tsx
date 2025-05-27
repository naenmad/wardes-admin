'use client';

import React from 'react';
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Restaurant as OrderIcon,
    MenuBook as MenuIcon,
    Discount as PromotionIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const drawerWidth = 240;

interface SidebarProps {
    mobileOpen: boolean;
    handleDrawerToggle: () => void;
}

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
    { text: 'Food Order', icon: <OrderIcon />, href: '/orders' },
    { text: 'Manage Menu and Stock', icon: <MenuIcon />, href: '/menu' },
    { text: 'Promotion', icon: <PromotionIcon />, href: '/promotions' },
];

const otherItems = [
    { text: 'Settings', icon: <SettingsIcon />, href: '/settings' },
];

export default function Sidebar({ mobileOpen, handleDrawerToggle }: SidebarProps) {
    const pathname = usePathname();

    const drawer = (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                <Box sx={{ width: 40, height: 40, position: 'relative', mr: 1 }}>
                    <Image
                        src="/images/logo.png"
                        alt="Wardes Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                    />
                </Box>
                <Typography variant="h6" fontWeight="bold" color="#bc5a3c">
                    Wardes
                </Typography>
            </Box>
            <Divider />
            <Box sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                    MENU
                </Typography>
                <List>
                    {menuItems.map((item) => (
                        <ListItemButton
                            component={Link}
                            href={item.href}
                            key={item.text}
                            selected={pathname === item.href}
                            sx={{
                                borderRadius: 2,
                                mb: 0.5,
                                '&.Mui-selected': {
                                    backgroundColor: '#FEF2EF',
                                    color: '#bc5a3c',
                                    '& .MuiListItemIcon-root': {
                                        color: '#bc5a3c',
                                    },
                                },
                                '&:hover': {
                                    backgroundColor: '#FEF2EF',
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 40,
                                    color: pathname === item.href ? '#bc5a3c' : 'inherit',
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
            <Box sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                    OTHERS
                </Typography>
                <List>
                    {otherItems.map((item) => (
                        <ListItemButton
                            component={Link}
                            href={item.href}
                            key={item.text}
                            selected={pathname === item.href}
                            sx={{
                                borderRadius: 2,
                                mb: 0.5,
                                '&.Mui-selected': {
                                    backgroundColor: '#FEF2EF',
                                    color: '#bc5a3c',
                                    '& .MuiListItemIcon-root': {
                                        color: '#bc5a3c',
                                    },
                                },
                                '&:hover': {
                                    backgroundColor: '#FEF2EF',
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 40,
                                    color: pathname === item.href ? '#bc5a3c' : 'inherit',
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        >
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawer}
            </Drawer>
            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        borderRight: '1px solid #f0f0f0',
                        boxShadow: 'none'
                    },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
}