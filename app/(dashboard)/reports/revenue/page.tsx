'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Chip,
    CircularProgress,
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    Download,
    DateRange,
    AttachMoney,
    ShoppingCart,
    Assessment,
} from '@mui/icons-material';

// Import Chart.js components and register them
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler,
} from 'chart.js';

import { Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, Timestamp, where } from 'firebase/firestore';
import AOS from 'aos';

interface OrderData {
    id: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
    items: any[];
}

interface RevenueStats {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    percentChange: number;
    topProducts: { name: string; count: number; revenue: number }[];
}

export default function RevenueReportPage() {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [stats, setStats] = useState<RevenueStats>({
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        percentChange: 0,
        topProducts: [],
    });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        AOS.init({ duration: 800, once: true });
        initializeDateRange();
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchRevenueData();
        }
    }, [startDate, endDate]);

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const initializeDateRange = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - parseInt(dateRange));

        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
    };

    const handleDateRangeChange = (newRange: string) => {
        setDateRange(newRange);
        const end = new Date();
        const start = new Date();

        if (newRange === 'custom') return;

        start.setDate(start.getDate() - parseInt(newRange));
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
    };

    const fetchRevenueData = async () => {
        try {
            setLoading(true);

            // Convert start and end dates to Firestore Timestamps
            const startTimestamp = Timestamp.fromDate(new Date(startDate));
            const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

            // Fetch orders from Firestore
            const ordersQuery = query(
                collection(db, 'orders'),
                where('createdAt', '>=', startTimestamp),
                where('createdAt', '<=', endTimestamp),
                where('status', 'in', ['completed', 'delivered']),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(ordersQuery);
            const fetchedOrders: OrderData[] = [];
            const productStats: Record<string, { count: number; revenue: number }> = {};

            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Debug: Log the data structure
                console.log('Order data:', data);

                // Try different possible field names for total amount
                let totalAmount = 0;
                if (data.totalAmount) {
                    totalAmount = Number(data.totalAmount);
                } else if (data.total) {
                    totalAmount = Number(data.total);
                } else if (data.amount) {
                    totalAmount = Number(data.amount);
                } else if (data.grandTotal) {
                    totalAmount = Number(data.grandTotal);
                } else if (data.finalAmount) {
                    totalAmount = Number(data.finalAmount);
                } else if (data.items && Array.isArray(data.items)) {
                    // Calculate from items if total not found
                    totalAmount = data.items.reduce((sum: number, item: any) => {
                        const itemPrice = Number(item.price) || 0;
                        const itemQuantity = Number(item.quantity) || 1;
                        return sum + (itemPrice * itemQuantity);
                    }, 0);
                }

                // Try different possible field names for customer
                let customerName = 'Unknown Customer';
                if (data.customer?.name) {
                    customerName = data.customer.name;
                } else if (data.customerName) {
                    customerName = data.customerName;
                } else if (data.customer?.firstName) {
                    customerName = data.customer.firstName + (data.customer.lastName ? ' ' + data.customer.lastName : '');
                } else if (data.user?.name) {
                    customerName = data.user.name;
                } else if (data.orderBy) {
                    customerName = data.orderBy;
                }

                const order: OrderData = {
                    id: doc.id,
                    customerName,
                    totalAmount,
                    status: data.status || 'unknown',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    items: data.items || []
                };

                fetchedOrders.push(order);

                // Calculate product statistics with better error handling
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach((item: any) => {
                        const productName = item.name || item.menuItem?.name || 'Unknown Product';
                        const quantity = Number(item.quantity) || 1;
                        const price = Number(item.price) || Number(item.menuItem?.price) || 0;

                        if (!productStats[productName]) {
                            productStats[productName] = { count: 0, revenue: 0 };
                        }
                        productStats[productName].count += quantity;
                        productStats[productName].revenue += price * quantity;
                    });
                }
            });

            // Calculate current period stats
            const totalRevenue = fetchedOrders.reduce((sum, order) => {
                const amount = Number(order.totalAmount) || 0;
                return sum + amount;
            }, 0);

            const totalOrders = fetchedOrders.length;
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            const percentChange = await calculatePercentageChange(startDate, endDate, totalRevenue);

            // Get top products by revenue
            const topProducts = Object.entries(productStats)
                .map(([name, data]) => ({
                    name,
                    count: Number(data.count) || 0,
                    revenue: Number(data.revenue) || 0
                }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // Debug logs
            console.log('Fetched Orders:', fetchedOrders);
            console.log('Total Revenue:', totalRevenue);
            console.log('Product Stats:', productStats);

            setOrders(fetchedOrders);
            setStats({
                totalRevenue: Number(totalRevenue) || 0,
                totalOrders: Number(totalOrders) || 0,
                averageOrderValue: Number(averageOrderValue) || 0,
                percentChange: Number(percentChange) || 0,
                topProducts,
            });

        } catch (error) {
            console.error("Error fetching revenue data:", error);
            setOrders([]);
            setStats({
                totalRevenue: 0,
                totalOrders: 0,
                averageOrderValue: 0,
                percentChange: 0,
                topProducts: [],
            });
        } finally {
            setLoading(false);
        }
    };

    const calculatePercentageChange = async (currentStart: string, currentEnd: string, currentRevenue: number): Promise<number> => {
        try {
            const currentStartDate = new Date(currentStart);
            const currentEndDate = new Date(currentEnd);
            const periodDays = Math.ceil((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));

            const previousEndDate = new Date(currentStartDate);
            previousEndDate.setDate(previousEndDate.getDate() - 1);
            const previousStartDate = new Date(previousEndDate);
            previousStartDate.setDate(previousStartDate.getDate() - periodDays);

            const previousQuery = query(
                collection(db, 'orders'),
                where('createdAt', '>=', Timestamp.fromDate(previousStartDate)),
                where('createdAt', '<=', Timestamp.fromDate(previousEndDate)),
                where('status', 'in', ['completed', 'delivered'])
            );

            const previousSnapshot = await getDocs(previousQuery);
            let previousRevenue = 0;

            previousSnapshot.forEach((doc) => {
                const data = doc.data();
                previousRevenue += Number(data.totalAmount) || 0;
            });

            if (previousRevenue === 0) {
                return currentRevenue > 0 ? 100 : 0;
            }

            const change = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
            return Number(change.toFixed(1));

        } catch (error) {
            console.error("Error calculating percentage change:", error);
            return 0;
        }
    };

    const prepareChartData = () => {
        if (!orders || orders.length === 0) {
            return {
                labels: [],
                datasets: [{
                    label: 'Daily Revenue',
                    data: [],
                    backgroundColor: 'rgba(188, 90, 60, 0.1)',
                    borderColor: '#bc5a3c',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                }],
            };
        }

        const dailyRevenue: Record<string, number> = {};
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);

        while (current <= end) {
            const dateKey = current.toISOString().split('T')[0];
            dailyRevenue[dateKey] = 0;
            current.setDate(current.getDate() + 1);
        }

        orders.forEach(order => {
            try {
                const orderDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
                const dateKey = orderDate.toISOString().split('T')[0];
                const amount = Number(order.totalAmount) || 0;

                if (dailyRevenue.hasOwnProperty(dateKey)) {
                    dailyRevenue[dateKey] += amount;
                }
            } catch (error) {
                console.error("Error processing order date:", error);
            }
        });

        const sortedDates = Object.keys(dailyRevenue).sort();
        const labels = sortedDates.map(date => {
            try {
                return new Date(date).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short'
                });
            } catch (error) {
                return date;
            }
        });
        const data = sortedDates.map(date => Number(dailyRevenue[date]) || 0);

        return {
            labels,
            datasets: [{
                label: 'Daily Revenue',
                data,
                backgroundColor: 'rgba(188, 90, 60, 0.1)',
                borderColor: '#bc5a3c',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
            }],
        };
    };

    const prepareProductChart = () => {
        if (!stats.topProducts || stats.topProducts.length === 0) {
            return {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0'],
                    borderWidth: 0,
                }],
            };
        }

        const labels = stats.topProducts.map(p => p.name || 'Unknown Product');
        const data = stats.topProducts.map(p => Number(p.revenue) || 0);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#bc5a3c',
                    '#d4692f',
                    '#ec7c3c',
                    '#f39c67',
                    '#fabc92',
                ],
                borderWidth: 0,
            }],
        };
    };

    const exportData = () => {
        if (!orders || orders.length === 0) {
            alert('No data available to export');
            return;
        }

        try {
            const csvHeaders = ['Date', 'Order ID', 'Customer', 'Items', 'Amount', 'Status'];
            const csvRows = orders.map(order => [
                order.createdAt instanceof Date
                    ? order.createdAt.toLocaleDateString('id-ID')
                    : new Date(order.createdAt).toLocaleDateString('id-ID'),
                order.id || '',
                order.customerName || 'Unknown',
                order.items?.length || 0,
                (Number(order.totalAmount) || 0).toLocaleString(),
                order.status || 'unknown',
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `revenue-report-${startDate}-to-${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data. Please try again.');
        }
    };

    // Fixed renderOrdersTable function
    const renderOrdersTable = () => {
        if (!orders || orders.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} align="center">
                        <Box sx={{ py: 4 }}>
                            <Typography color="text.secondary" variant="h6">
                                No orders found for the selected period
                            </Typography>
                            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                                Try adjusting your date range or check if there are any completed orders
                            </Typography>
                        </Box>
                    </TableCell>
                </TableRow>
            );
        }

        return orders.slice(0, 10).map((order) => (
            <TableRow key={order.id} hover>
                <TableCell>
                    {(() => {
                        try {
                            const date = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
                            return date.toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            });
                        } catch (error) {
                            return 'Invalid Date';
                        }
                    })()}
                </TableCell>
                <TableCell>
                    <Box>
                        <Typography variant="body2" fontWeight="medium">
                            {order.customerName || 'Unknown Customer'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            #{order.id}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Box>
                        <Typography variant="body2">
                            {order.items?.length || 0} items
                        </Typography>
                        {order.items && order.items.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                {order.items[0]?.name || order.items[0]?.menuItem?.name || 'Unknown item'}
                                {order.items.length > 1 && ` +${order.items.length - 1} more`}
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                        {order.totalAmount > 0 ? formatCurrency(order.totalAmount) : (
                            <span style={{ color: '#f44336' }}>
                                {formatCurrency(0)}
                                <Typography variant="caption" display="block" color="error">
                                    (Check data structure)
                                </Typography>
                            </span>
                        )}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Chip
                        label={order.status || 'unknown'}
                        color={order.status === 'completed' || order.status === 'delivered' ? 'success' : 'default'}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                    />
                </TableCell>
            </TableRow>
        ));
    };

    // Add a debug function to check one order manually
    const debugOrderStructure = async () => {
        try {
            const ordersQuery = query(
                collection(db, 'orders'),
                orderBy('createdAt', 'desc'),
                // limit(1) // Just get one order to check structure
            );

            const querySnapshot = await getDocs(ordersQuery);
            querySnapshot.forEach((doc) => {
                console.log('=== ORDER STRUCTURE DEBUG ===');
                console.log('Order ID:', doc.id);
                console.log('Full Order Data:', doc.data());
                console.log('Available Fields:', Object.keys(doc.data()));
                console.log('===============================');
                return; // Only check first order
            });
        } catch (error) {
            console.error('Debug error:', error);
        }
    };

    // Call debug function when component mounts (temporary)
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            debugOrderStructure();
        }
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress sx={{ color: '#bc5a3c' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }} data-aos="fade-up">
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Revenue Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Track your restaurant's revenue performance and trends
                </Typography>
            </Box>

            {/* Date Range Controls */}
            <Paper sx={{ p: 3, mb: 4 }} data-aos="fade-up">
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Date Range</InputLabel>
                            <Select
                                value={dateRange}
                                label="Date Range"
                                onChange={(e) => handleDateRangeChange(e.target.value)}
                            >
                                <MenuItem value="7">Last 7 days</MenuItem>
                                <MenuItem value="30">Last 30 days</MenuItem>
                                <MenuItem value="90">Last 3 months</MenuItem>
                                <MenuItem value="365">Last year</MenuItem>
                                <MenuItem value="custom">Custom Range</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Start Date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="End Date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={exportData}
                            sx={{
                                borderColor: '#bc5a3c',
                                color: '#bc5a3c',
                                '&:hover': { borderColor: '#a04e34', bgcolor: 'rgba(188, 90, 60, 0.04)' }
                            }}
                        >
                            Export
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card data-aos="fade-up" data-aos-delay="100">
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AttachMoney sx={{ color: '#bc5a3c', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">Total Revenue</Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="#bc5a3c">
                                {formatCurrency(stats.totalRevenue)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                {stats.percentChange >= 0 ? (
                                    <TrendingUp sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                                ) : (
                                    <TrendingDown sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
                                )}
                                <Typography
                                    variant="body2"
                                    color={stats.percentChange >= 0 ? 'success.main' : 'error.main'}
                                >
                                    {stats.percentChange >= 0 ? '+' : ''}{stats.percentChange}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                                    vs previous period
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card data-aos="fade-up" data-aos-delay="200">
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <ShoppingCart sx={{ color: '#bc5a3c', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">Total Orders</Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.totalOrders}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Completed orders
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card data-aos="fade-up" data-aos-delay="300">
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Assessment sx={{ color: '#bc5a3c', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">Average Order</Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {formatCurrency(stats.averageOrderValue)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Per order value
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card data-aos="fade-up" data-aos-delay="400">
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <DateRange sx={{ color: '#bc5a3c', mr: 1 }} />
                                <Typography variant="h6" color="text.secondary">Period</Typography>
                            </Box>
                            <Typography variant="h6" fontWeight="bold">
                                {new Date(startDate).toLocaleDateString('id-ID')} - {new Date(endDate).toLocaleDateString('id-ID')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Selected range
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }} data-aos="fade-up" data-aos-delay="500">
                        <Typography variant="h6" fontWeight="medium" gutterBottom>
                            Revenue Trend
                        </Typography>
                        <Box sx={{ height: 300 }}>
                            <Line data={prepareChartData()} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: function (value) {
                                                return formatCurrency(Number(value));
                                            }
                                        }
                                    }
                                }
                            }} />
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }} data-aos="fade-up" data-aos-delay="600">
                        <Typography variant="h6" fontWeight="medium" gutterBottom>
                            Top Products
                        </Typography>
                        <Box sx={{ height: 300 }}>
                            <Doughnut data={prepareProductChart()} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            usePointStyle: true,
                                        }
                                    }
                                }
                            }} />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Orders Table */}
            <Paper sx={{ p: 3 }} data-aos="fade-up" data-aos-delay="700">
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                    Recent Orders
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Items</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {renderOrdersTable()}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
