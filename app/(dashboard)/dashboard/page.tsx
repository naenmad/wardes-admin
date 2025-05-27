'use client';

import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import RevenueChart from '@/components/dashboard/RevenueChart';
import OrderTimeChart from '@/components/dashboard/OrderTimeChart';
import MostOrderedItems from '@/components/dashboard/MostOrderedItems';
import OrderStats from '@/components/dashboard/OrderStats';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

export default function DashboardPage() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Dashboard
            </Typography>

            <Grid container spacing={3}>
                {/* Revenue Chart */}
                <Grid item xs={12} md={8} data-aos="fade-up">
                    <RevenueChart />
                </Grid>

                {/* Order Time Distribution */}
                <Grid item xs={12} md={4} data-aos="fade-up">
                    <OrderTimeChart />
                </Grid>

                {/* Most Ordered Food */}
                <Grid item xs={12} md={6} data-aos="fade-up">
                    <MostOrderedItems />
                </Grid>

                {/* Order Stats */}
                <Grid item xs={12} md={6} data-aos="fade-up">
                    <OrderStats />
                </Grid>
            </Grid>
        </>
    );
}