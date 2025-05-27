// filepath: d:\Code\wardes\wardes-admin\components\dashboard\RevenueChart.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Line } from 'react-chartjs-2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, Timestamp, where } from 'firebase/firestore';

type RevenueData = {
    date: string;
    amount: number;
};

export default function RevenueChart() {
    const [isClient, setIsClient] = useState(false);
    const [loading, setLoading] = useState(true);
    const [revenue, setRevenue] = useState<RevenueData[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [percentChange, setPercentChange] = useState(0);

    useEffect(() => {
        setIsClient(true);
        fetchRevenueData();
    }, []);

    async function fetchRevenueData() {
        try {
            setLoading(true);

            // Get orders from last 30 days - SIMPLIFIED QUERY (no composite index needed)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startTimestamp = Timestamp.fromDate(thirtyDaysAgo);

            // Simplified query - only filter by date, then filter status in client-side
            const revenueQuery = query(
                collection(db, "orders"),
                where("createdAt", ">=", startTimestamp),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(revenueQuery);
            const revenueByDay: Record<string, number> = {};
            let total = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Filter completed orders on client-side
                if (data.grandTotal && data.createdAt && data.status === "completed") {
                    const orderDate = data.createdAt.toDate();
                    const dayKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format

                    if (!revenueByDay[dayKey]) {
                        revenueByDay[dayKey] = 0;
                    }

                    revenueByDay[dayKey] += data.grandTotal;
                    total += data.grandTotal;
                }
            });

            // Convert to array and sort by date
            const revenueArray: RevenueData[] = Object.entries(revenueByDay)
                .map(([date, amount]) => ({ date, amount }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            console.log("Revenue data:", revenueArray); // Debug log
            console.log("Total revenue:", total); // Debug log

            // Calculate percent change (compare last 7 days vs previous 7 days)
            const today = new Date();
            const last7Days = [...Array(7)].map((_, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                return date.toISOString().split('T')[0];
            });

            const previous7Days = [...Array(7)].map((_, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - (i + 7));
                return date.toISOString().split('T')[0];
            });

            const lastWeekRevenue = last7Days.reduce((sum, dateKey) => {
                const found = revenueArray.find(r => r.date === dateKey);
                return sum + (found ? found.amount : 0);
            }, 0);

            const previousWeekRevenue = previous7Days.reduce((sum, dateKey) => {
                const found = revenueArray.find(r => r.date === dateKey);
                return sum + (found ? found.amount : 0);
            }, 0);

            const change = previousWeekRevenue > 0 ? ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 : 0;

            setPercentChange(Math.round(change * 10) / 10);
            setRevenue(revenueArray);
            setTotalRevenue(total);
        } catch (error) {
            console.error("Error fetching revenue data:", error);
        } finally {
            setLoading(false);
        }
    }

    // Prepare chart data
    const prepareChartData = () => {
        // Get last 12 days
        const last12Days = [...Array(12)].map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (11 - i));
            return {
                label: date.getDate().toString().padStart(2, '0'),
                dateKey: date.toISOString().split('T')[0]
            };
        });

        const labels = last12Days.map(day => day.label);
        const currentData = last12Days.map(day => {
            const found = revenue.find(r => r.date === day.dateKey);
            return found ? found.amount : 0;
        });

        console.log("Chart labels:", labels); // Debug log
        console.log("Chart data:", currentData); // Debug log

        // Mock previous period data for comparison (reduce by 10-20%)
        const previousData = currentData.map(amount => Math.round(amount * (0.8 + Math.random() * 0.2)));

        return {
            labels,
            datasets: [
                {
                    label: 'Current Period',
                    data: currentData,
                    backgroundColor: '#bc5a3c',
                    borderColor: '#bc5a3c',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#bc5a3c',
                    pointBorderColor: '#bc5a3c',
                },
                {
                    label: 'Previous Period',
                    data: previousData,
                    backgroundColor: '#e0e0e0',
                    borderColor: '#e0e0e0',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#e0e0e0',
                    pointBorderColor: '#e0e0e0',
                },
            ],
        };
    };

    const chartData = prepareChartData();

    return (
        <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1">Revenue</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h5" fontWeight="bold">
                            {loading ? 'Loading...' : `IDR ${totalRevenue.toLocaleString()}`}
                        </Typography>
                        {!loading && totalRevenue > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                {percentChange >= 0 ? (
                                    <>
                                        <TrendingUpIcon color="success" fontSize="small" />
                                        <Typography variant="caption" color="success.main">
                                            +{percentChange}%
                                        </Typography>
                                    </>
                                ) : (
                                    <>
                                        <TrendingDownIcon color="error" fontSize="small" />
                                        <Typography variant="caption" color="error">
                                            {percentChange}%
                                        </Typography>
                                    </>
                                )}
                            </Box>
                        )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        {loading ? 'Loading...' : `Sales from last 30 days (${revenue.length} days with sales)`}
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
            <Box sx={{ height: 300 }}>
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
                                ticks: {
                                    callback: function (value) {
                                        return 'IDR ' + Number(value).toLocaleString();
                                    }
                                }
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index',
                        },
                    }} />
                )}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography>Loading revenue data...</Typography>
                    </Box>
                )}
                {!loading && totalRevenue === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography variant="h6" color="text.secondary">No revenue data</Typography>
                        <Typography variant="body2" color="text.secondary">
                            No completed orders found in the last 30 days
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}