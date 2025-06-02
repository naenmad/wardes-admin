'use client';

import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Container,
    Card,
    CardContent,
    Chip,
    Grid
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Construction as ConstructionIcon,
    Schedule as ScheduleIcon,
    Notifications as NotificationsIcon,
    Restaurant as RestaurantIcon,
    Payment as PaymentIcon,
    LocalShipping as LocalShippingIcon,
    People as PeopleIcon
} from '@mui/icons-material';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function SettingsPage() {
    // Initialize AOS
    useEffect(() => {
        AOS.init({
            duration: 800,
            once: true
        });
    }, []);

    const upcomingFeatures = [
        {
            icon: <RestaurantIcon sx={{ fontSize: 40 }} />,
            title: 'Restaurant Info',
            description: 'Manage restaurant details, logo, and business hours',
            status: 'Planning'
        },
        {
            icon: <PaymentIcon sx={{ fontSize: 40 }} />,
            title: 'Payment Settings',
            description: 'Configure payment methods, tax rates, and currency',
            status: 'In Development'
        },
        {
            icon: <LocalShippingIcon sx={{ fontSize: 40 }} />,
            title: 'Delivery Options',
            description: 'Set up delivery zones, fees, and time estimates',
            status: 'Planning'
        },
        {
            icon: <PeopleIcon sx={{ fontSize: 40 }} />,
            title: 'User Management',
            description: 'Add and manage admin users and roles',
            status: 'Planning'
        },
        {
            icon: <NotificationsIcon sx={{ fontSize: 40 }} />,
            title: 'Notifications',
            description: 'Configure email and system notifications',
            status: 'Planning'
        }
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Development':
                return 'warning';
            case 'Planning':
                return 'default';
            case 'Coming Soon':
                return 'info';
            default:
                return 'default';
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Configuration and management tools
                </Typography>
            </Box>

            {/* Coming Soon Banner */}
            <Paper
                sx={{
                    p: 6,
                    mb: 4,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #bc5a3c 0%, #a04e34 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                data-aos="fade-up"
            >
                <Box sx={{ position: 'relative', zIndex: 2 }}>
                    <ConstructionIcon sx={{ fontSize: 80, mb: 2, opacity: 0.9 }} />
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                        Coming Soon
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
                        We're working hard to bring you comprehensive settings management
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon sx={{ fontSize: 20 }} />
                        <Typography variant="body1">
                            Expected release: Q2 2025
                        </Typography>
                    </Box>
                </Box>

                {/* Background decoration */}
                <Box sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    zIndex: 1
                }} />
                <Box sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: -30,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    zIndex: 1
                }} />
            </Paper>

            {/* Upcoming Features */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="medium" gutterBottom data-aos="fade-up">
                    Upcoming Features
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} data-aos="fade-up">
                    Here's what we're planning to include in the settings page
                </Typography>

                <Grid container spacing={3}>
                    {upcomingFeatures.map((feature, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card
                                sx={{
                                    height: '100%',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3
                                    }
                                }}
                                data-aos="fade-up"
                                data-aos-delay={index * 100}
                            >
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <Box sx={{
                                        color: '#bc5a3c',
                                        mb: 2,
                                        display: 'flex',
                                        justifyContent: 'center'
                                    }}>
                                        {feature.icon}
                                    </Box>
                                    <Typography variant="h6" fontWeight="medium" gutterBottom>
                                        {feature.title}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 2, minHeight: 40 }}
                                    >
                                        {feature.description}
                                    </Typography>
                                    <Chip
                                        label={feature.status}
                                        color={getStatusColor(feature.status) as any}
                                        size="small"
                                        variant="outlined"
                                    />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Current Available Features */}
            <Paper sx={{ p: 3 }} data-aos="fade-up">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SettingsIcon sx={{ mr: 1, color: '#bc5a3c' }} />
                    <Typography variant="h6" fontWeight="medium">
                        Currently Available
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    While we work on the comprehensive settings page, you can still manage:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label="Menu Management" color="success" variant="outlined" />
                    <Chip label="Order Processing" color="success" variant="outlined" />
                    <Chip label="Promotion Management" color="success" variant="outlined" />
                    <Chip label="User Authentication" color="success" variant="outlined" />
                </Box>
            </Paper>
        </Container>
    );
}