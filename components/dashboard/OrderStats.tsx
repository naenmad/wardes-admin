'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Line } from 'react-chartjs-2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

type DailyOrderCount = {
    date: string;
    count: number;
};

export default function OrderStats() {
    const [isClient, setIsClient] = useState(false);
    const [loading, setLoading] = useState(true);
    const [orderStats, setOrderStats] = useState<DailyOrderCount[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [percentChange, setPercentChange] = useState(0);

    useEffect(() => {
        setIsClient(true);
        fetchOrderStats();
    }, []);

    async function fetchOrderStats() {
        try {
            setLoading(true);

            // Get orders from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startTimestamp = Timestamp.fromDate(thirtyDaysAgo);

            const ordersQuery = query(
                collection(db, "orders"),
                where("createdAt", ">=", startTimestamp)
            );

            const querySnapshot = await getDocs(ordersQuery);

            // Group orders by day
            const ordersByDay: Record<string, number> = {};
            let total = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.createdAt) {
                    const orderDate = data.createdAt.toDate();
                    const dayKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format

                    if (!ordersByDay[dayKey]) {
                        ordersByDay[dayKey] = 0;
                    }

                    ordersByDay[dayKey]++;
                    total++;
                }
            });

            // Convert to array and sort by date
            const orderStatsArray: DailyOrderCount[] = Object.entries(ordersByDay)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Calculate percent change (first week vs last week)
            const firstWeekOrders = orderStatsArray.slice(0, 7).reduce((sum, day) => sum + day.count, 0);
            const lastWeekOrders = orderStatsArray.slice(-7).reduce((sum, day) => sum + day.count, 0);
            const change = firstWeekOrders > 0 ? ((lastWeekOrders - firstWeekOrders) / firstWeekOrders) * 100 : 0;

            setPercentChange(Math.round(change * 10) / 10);
            setOrderStats(orderStatsArray);
            setTotalOrders(total);
        } catch (error) {
            console.error("Error fetching order stats:", error);
        } finally {
            setLoading(false);
        }
    }

    // Chart data preparation
    const prepareChartData = () => {
        // Get last 6 days
        const last6Days = [...Array(6)].map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (5 - i));
            return {
                label: date.getDate().toString().padStart(2, '0'),
                dateKey: date.toISOString().split('T')[0]
            };
        });

        const labels = last6Days.map(day => day.label);
        const data = last6Days.map(day => {
            const found = orderStats.find(stat => stat.date === day.dateKey);
            return found ? found.count : 0;
        });

        // Target data (average * 1.1)
        const avgOrders = data.reduce((sum, count) => sum + count, 0) / data.length;
        const targetData = last6Days.map(() => Math.round(avgOrders * 1.1));

        return {
            labels,
            datasets: [
                {
                    label: 'Actual Orders',
                    data,
                    fill: false,
                    borderColor: '#bc5a3c',
                    backgroundColor: '#bc5a3c',
                    tension: 0.4,
                },
                {
                    label: 'Target',
                    data: targetData,
                    fill: false,
                    borderColor: '#e0e0e0',
                    backgroundColor: '#e0e0e0',
                    borderDash: [5, 5],
                    tension: 0.4,
                },
            ],
        };
    };

    const chartData = prepareChartData();

    return (
        <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1">Orders</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h5" fontWeight="bold">
                            {loading ? 'Loading...' : totalOrders}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                            {percentChange > 0 ? (
                                <>
                                    <TrendingUpIcon color="success" fontSize="small" />
                                    <Typography variant="caption" color="success.main">
                                        {percentChange}% vs previous period
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <TrendingDownIcon color="error" fontSize="small" />
                                    <Typography variant="caption" color="error">
                                        {Math.abs(percentChange)}% vs previous period
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        Orders from last 30 days
                    </Typography>
                </Box>
                <Box>
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
            </Box>
            <Box sx={{ height: 260 }}>
                {isClient && !loading && (
                    <Line data={chartData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                            },
                        },
                    }} />
                )}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography>Loading...</Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}