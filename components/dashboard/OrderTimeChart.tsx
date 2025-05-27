'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

type OrderTimeDistribution = {
    morning: number;
    afternoon: number;
    evening: number;
    total: number;
};

export default function OrderTimeChart() {
    const [isClient, setIsClient] = useState(false);
    const [loading, setLoading] = useState(true);
    const [orderTime, setOrderTime] = useState<OrderTimeDistribution>({
        morning: 0,
        afternoon: 0,
        evening: 0,
        total: 0
    });

    useEffect(() => {
        setIsClient(true);
        fetchOrderTimeData();
    }, []);

    async function fetchOrderTimeData() {
        try {
            setLoading(true);

            // Get current month orders
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startTimestamp = Timestamp.fromDate(startOfMonth);

            const ordersQuery = query(
                collection(db, "orders"),
                where("createdAt", ">=", startTimestamp)
            );

            const querySnapshot = await getDocs(ordersQuery);

            let morning = 0;
            let afternoon = 0;
            let evening = 0;
            let total = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.createdAt) {
                    const orderDate = data.createdAt.toDate();
                    const hour = orderDate.getHours();

                    if (hour >= 5 && hour < 12) {
                        morning++;
                    } else if (hour >= 12 && hour < 17) {
                        afternoon++;
                    } else {
                        evening++;
                    }

                    total++;
                }
            });

            setOrderTime({
                morning,
                afternoon,
                evening,
                total
            });
        } catch (error) {
            console.error("Error fetching order time data:", error);
        } finally {
            setLoading(false);
        }
    }

    // Calculate percentages
    const morningPercent = orderTime.total ? Math.round((orderTime.morning / orderTime.total) * 100) : 0;
    const afternoonPercent = orderTime.total ? Math.round((orderTime.afternoon / orderTime.total) * 100) : 0;
    const eveningPercent = orderTime.total ? Math.round((orderTime.evening / orderTime.total) * 100) : 0;

    // Chart data
    const chartData = {
        labels: ['Afternoon', 'Evening', 'Morning'],
        datasets: [
            {
                data: [afternoonPercent, eveningPercent, morningPercent],
                backgroundColor: ['#bc5a3c', '#f8a75c', '#f8d79c'],
                borderWidth: 0,
            },
        ],
    };

    return (
        <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Order Time</Typography>
                <Typography
                    component="a"
                    href="#"
                    sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 'medium',
                    }}
                >
                    View Report
                </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
                From 1-{new Date().getDate()} {new Date().toLocaleString('default', { month: 'short' })}, {new Date().getFullYear()}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative', my: 2, height: 200 }}>
                {isClient && !loading && (
                    <Doughnut
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '70%',
                            plugins: {
                                legend: {
                                    display: false,
                                },
                            },
                        }}
                    />
                )}

                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h6" fontWeight="bold">
                        {loading ? 'Loading...' : orderTime.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        orders
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#bc5a3c', mx: 'auto', mb: 0.5 }}></Box>
                    <Typography variant="caption">Afternoon</Typography>
                    <Typography variant="body2" fontWeight="medium">{afternoonPercent}%</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f8a75c', mx: 'auto', mb: 0.5 }}></Box>
                    <Typography variant="caption">Evening</Typography>
                    <Typography variant="body2" fontWeight="medium">{eveningPercent}%</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f8d79c', mx: 'auto', mb: 0.5 }}></Box>
                    <Typography variant="caption">Morning</Typography>
                    <Typography variant="body2" fontWeight="medium">{morningPercent}%</Typography>
                </Box>
            </Box>
        </Paper>
    );
}