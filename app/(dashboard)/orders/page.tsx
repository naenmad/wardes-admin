'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    InputAdornment,
    Grid,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    Skeleton,
    Tabs,
    Tab,
    Badge,
    Card,
    CardContent,
    Divider,
    List,
    ListItem,
    ListItemText,
    TableSortLabel
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    MoreVert as MoreVertIcon,
    Receipt as ReceiptIcon,
    CalendarToday as CalendarIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    LocalShipping as LocalShippingIcon,
    AttachMoney as AttachMoneyIcon,
    CreditCard as CreditCardIcon,
    Circle as CircleIcon,
    AccountBalance as BankIcon,
    AccountBalanceWallet as WalletIcon,
    QrCode as QrIcon,
    Money as CashIcon
} from '@mui/icons-material';
import { collection, query, getDocs, doc, updateDoc, orderBy as firebaseOrderBy, where, Timestamp } from 'firebase/firestore'; // Alias for orderBy
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import AOS from 'aos';

// Order status colors
const statusColors: Record<string, { color: string, bgColor: string }> = {
    'pending': { color: '#FF9800', bgColor: '#FFF3E0' },
    'processing': { color: '#2196F3', bgColor: '#E3F2FD' },
    'completed': { color: '#4CAF50', bgColor: '#E8F5E9' },
    'cancelled': { color: '#F44336', bgColor: '#FFEBEE' }
};

// Updated interfaces
interface OrderItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    iceLevel?: string | null;
    spicyLevel?: string | null;
    image?: string; // Tambahkan properti image
}

interface Customer {
    name: string;
    phone: string;
    address: string;
    tableNumber?: string;
}

interface Order {
    id: string; // This will be the document ID (order ID)
    orderNumber: string; // We'll use the document ID as order number
    items: OrderItem[];
    customer: Customer; // Mapped from customerDetails
    status: 'pending_payment' | 'pending' | 'processing' | 'completed' | 'cancelled';
    totalAmount: number; // Mapped from grandTotal
    paymentMethod: string;
    paymentStatus: string; // We'll derive this from status
    orderType: string; // Derived from customerDetails.address
    notes?: string;
    createdAt: Timestamp;
    serviceFee?: number;
    tax?: number;
    subtotal?: number;
    paymentToken?: string;
    languageUsed?: string;
    userId?: string | null;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
    const [orderSortKey, setOrderSortKey] = useState<'date' | 'amount'>('date'); // Renamed from orderBy
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Renamed from order to avoid confusion
    const itemsPerPage = 10;
    const router = useRouter();

    // Status counts for badges
    const [statusCounts, setStatusCounts] = useState({
        all: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0
    });

    // Initialize AOS
    useEffect(() => {
        AOS.init({
            duration: 800,
            once: true
        });
    }, []);

    // Helper function to determine order type from address
    const getOrderType = (address: string): string => {
        if (address.toLowerCase().includes('dine') || address.toLowerCase().includes('tempat')) {
            return 'Makan di Tempat';
        } else if (address.toLowerCase().includes('delivery') || address.toLowerCase().includes('antar')) {
            return 'Delivery';
        } else if (address.toLowerCase().includes('pickup') || address.toLowerCase().includes('ambil')) {
            return 'Pickup';
        }
        return address; // Return as-is if can't determine
    };

    // Helper function to determine payment status from status
    const getPaymentStatus = (status: string): string => {
        if (status === 'pending_payment') return 'unpaid';
        if (status === 'completed') return 'paid';
        return 'processing';
    };

    // Fetch orders
    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const ordersRef = collection(db, 'orders');
                const q = query(ordersRef, firebaseOrderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);

                const fetchedOrders: Order[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    // Map the new structure to our Order interface
                    const mappedOrder: Order = {
                        id: doc.id, // Document ID is the order ID
                        orderNumber: doc.id, // Use document ID as order number
                        items: (data.items || []).map((item: any) => ({
                            menuItemId: item.menuItemId || '',
                            name: item.name || '',
                            price: item.price || 0,
                            quantity: item.quantity || 0,
                            subtotal: item.subtotal || 0,
                            iceLevel: item.iceLevel,
                            spicyLevel: item.spicyLevel,
                            image: item.image, // Map image field
                        })),
                        customer: {
                            name: data.customerDetails?.name || 'Guest',
                            phone: data.customerDetails?.phone || '',
                            address: data.customerDetails?.address || '',
                            tableNumber: data.customerDetails?.tableNumber,
                        },
                        status: data.status || 'pending_payment',
                        totalAmount: data.grandTotal || 0,
                        paymentMethod: data.paymentMethod || 'unknown',
                        paymentStatus: getPaymentStatus(data.status || 'pending_payment'),
                        orderType: getOrderType(data.customerDetails?.address || ''),
                        notes: data.notes || '',
                        createdAt: data.createdAt || Timestamp.now(),
                        serviceFee: data.serviceFee,
                        tax: data.tax,
                        subtotal: data.subtotal,
                        paymentToken: data.paymentToken,
                        languageUsed: data.languageUsed,
                        userId: data.userId,
                    };

                    fetchedOrders.push(mappedOrder);
                });

                setOrders(fetchedOrders);

                // Calculate status counts
                const counts = {
                    all: fetchedOrders.length,
                    pending: fetchedOrders.filter(o => o.status === 'pending_payment' || o.status === 'pending').length,
                    processing: fetchedOrders.filter(o => o.status === 'processing').length,
                    completed: fetchedOrders.filter(o => o.status === 'completed').length,
                    cancelled: fetchedOrders.filter(o => o.status === 'cancelled').length,
                };
                setStatusCounts(counts);

            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // Apply filters
    useEffect(() => {
        let result = [...orders];

        // Search filter
        if (searchTerm) {
            result = result.filter(order =>
                order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customer.phone.includes(searchTerm)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending') {
                result = result.filter(order =>
                    order.status === 'pending_payment' || order.status === 'pending'
                );
            } else {
                result = result.filter(order => order.status === statusFilter);
            }
        }

        // Payment filter - Updated logic
        if (paymentFilter !== 'all') {
            result = result.filter(order => {
                // Normalize payment method for comparison
                const orderPaymentMethod = order.paymentMethod.toLowerCase();
                const filterPaymentMethod = paymentFilter.toLowerCase();

                // Direct match or contains logic
                return orderPaymentMethod === filterPaymentMethod ||
                    orderPaymentMethod.includes(filterPaymentMethod);
            });
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            result = result.filter(order => {
                const orderDate = order.createdAt.toDate();
                switch (dateFilter) {
                    case 'today':
                        return orderDate >= startOfToday;
                    case 'week':
                        return orderDate >= startOfWeek;
                    case 'month':
                        return orderDate >= startOfMonth;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        const sortedResult = [...result].sort((a, b) => {
            if (orderSortKey === 'date') {
                const comparison = a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime();
                return sortDirection === 'asc' ? comparison : -comparison;
            } else if (orderSortKey === 'amount') {
                const comparison = a.totalAmount - b.totalAmount;
                return sortDirection === 'asc' ? comparison : -comparison;
            }
            return 0;
        });

        setFilteredOrders(sortedResult);
        setCurrentPage(1);
    }, [searchTerm, statusFilter, paymentFilter, dateFilter, orders, orderSortKey, sortDirection]);

    // Sort orders
    const sortOrders = (ordersToSort: Order[], sortBy: string, direction: 'asc' | 'desc') => { // Parameters renamed for clarity
        return [...ordersToSort].sort((a, b) => {
            if (sortBy === 'date') {
                const aTime = a.createdAt.seconds;
                const bTime = b.createdAt.seconds;
                return direction === 'asc' ? aTime - bTime : bTime - aTime;
            } else { // amount
                return direction === 'asc'
                    ? a.totalAmount - b.totalAmount
                    : b.totalAmount - a.totalAmount;
            }
        });
    };

    // Handle sort request
    const handleRequestSort = (property: 'date' | 'amount') => {
        const isAsc = orderSortKey === property && sortDirection === 'asc';
        setSortDirection(isAsc ? 'desc' : 'asc'); // Use renamed state setter
        setOrderSortKey(property); // Use renamed state setter
    };

    // Open order details
    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setOpenDetailDialog(true);
    };

    // Close order details
    const handleCloseDetails = () => {
        setOpenDetailDialog(false);
    };

    // Update order status
    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: Timestamp.now()
            });

            // Update local state
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId
                        ? {
                            ...order,
                            status: newStatus as Order['status'],
                            paymentStatus: getPaymentStatus(newStatus)
                        }
                        : order
                )
            );

            // Close menu and dialog
            setStatusAnchorEl(null);
            if (openDetailDialog) {
                setOpenDetailDialog(false);
            }

        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    // Status menu
    const handleStatusMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setStatusAnchorEl(event.currentTarget);
    };

    const handleStatusMenuClose = () => {
        setStatusAnchorEl(null);
    };

    // Pagination
    const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
        window.scrollTo(0, 0);
    };

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
    const pageCount = Math.ceil(filteredOrders.length / itemsPerPage);

    // Format date
    const formatDate = (timestamp: Timestamp) => {
        return format(timestamp.toDate(), 'MMM dd, yyyy HH:mm');
    };

    // Render loading skeletons
    const renderSkeletons = () => {
        return Array(3).fill(0).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell> {/* For Order Type */}
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell> {/* For Actions */}
            </TableRow>
        ));
    };

    // Update status display function
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_payment':
            case 'pending':
                return 'warning';
            case 'processing':
                return 'info';
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending_payment':
                return 'Pending Payment';
            case 'pending':
                return 'Pending';
            case 'processing':
                return 'Processing';
            case 'completed':
                return 'Completed';
            case 'cancelled':
                return 'Cancelled';
            default:
                return status;
        }
    };

    // Status menu items
    const statusMenuItems = [
        { value: 'pending_payment', label: 'Pending Payment', color: 'warning' },
        { value: 'pending', label: 'Pending', color: 'warning' },
        { value: 'processing', label: 'Processing', color: 'info' },
        { value: 'completed', label: 'Completed', color: 'success' },
        { value: 'cancelled', label: 'Cancelled', color: 'error' },
    ];

    // Enhanced payment method display function
    const getPaymentMethodIcon = (method: string) => {
        const lowerMethod = method.toLowerCase();
        if (lowerMethod.includes('tunai') || lowerMethod.includes('cash')) {
            return <CashIcon fontSize="small" />;
        } else if (lowerMethod.includes('bni') || lowerMethod.includes('bri') ||
            lowerMethod.includes('mandiri') || lowerMethod.includes('cimb') ||
            lowerMethod.includes('permata')) {
            return <BankIcon fontSize="small" />;
        } else if (lowerMethod.includes('gopay')) {
            return <WalletIcon fontSize="small" />;
        } else if (lowerMethod.includes('qris')) {
            return <QrIcon fontSize="small" />;
        }
        return <CreditCardIcon fontSize="small" />;
    };

    return (
        <>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Orders
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    View and manage all customer orders
                </Typography>
            </Box>

            {/* Status tabs */}
            <Box sx={{ mb: 3 }} data-aos="fade-up">
                <Tabs
                    value={statusFilter}
                    onChange={(e, newValue) => setStatusFilter(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        '& .MuiBadge-root': {
                            marginLeft: 1
                        }
                    }}
                >
                    <Tab
                        value="all"
                        label={
                            <Badge badgeContent={statusCounts.all} color="primary">
                                <Box sx={{ pr: 1 }}>All Orders</Box>
                            </Badge>
                        }
                    />
                    <Tab
                        value="pending"
                        label={
                            <Badge badgeContent={statusCounts.pending} color="warning">
                                <Box sx={{ pr: 1 }}>Pending</Box>
                            </Badge>
                        }
                    />
                    <Tab
                        value="processing"
                        label={
                            <Badge badgeContent={statusCounts.processing} color="info">
                                <Box sx={{ pr: 1 }}>Processing</Box>
                            </Badge>
                        }
                    />
                    <Tab
                        value="completed"
                        label={
                            <Badge badgeContent={statusCounts.completed} color="success">
                                <Box sx={{ pr: 1 }}>Completed</Box>
                            </Badge>
                        }
                    />
                    <Tab
                        value="cancelled"
                        label={
                            <Badge badgeContent={statusCounts.cancelled} color="error">
                                <Box sx={{ pr: 1 }}>Cancelled</Box>
                            </Badge>
                        }
                    />
                </Tabs>
            </Box>

            {/* Filters and search */}
            <Paper sx={{ p: 2, mb: 4 }} data-aos="fade-up">
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search by order #, name or phone..."
                            variant="outlined"
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel id="date-filter-label">Date</InputLabel>
                                <Select
                                    labelId="date-filter-label"
                                    value={dateFilter}
                                    label="Date"
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    startAdornment={<CalendarIcon fontSize="small" sx={{ mr: 1, ml: -0.5 }} />}
                                >
                                    <MenuItem value="all">All Time</MenuItem>
                                    <MenuItem value="today">Today</MenuItem>
                                    <MenuItem value="week">This Week</MenuItem>
                                    <MenuItem value="month">This Month</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel id="payment-filter-label">Payment Method</InputLabel>
                                <Select
                                    labelId="payment-filter-label"
                                    value={paymentFilter}
                                    label="Payment Method"
                                    onChange={(e) => setPaymentFilter(e.target.value)}
                                    startAdornment={<AttachMoneyIcon fontSize="small" sx={{ mr: 1, ml: -0.5 }} />}
                                >
                                    <MenuItem value="all">All Methods</MenuItem>
                                    <MenuItem value="tunai">Tunai</MenuItem>
                                    <MenuItem value="bni">Bank BNI</MenuItem>
                                    <MenuItem value="bri">Bank BRI</MenuItem>
                                    <MenuItem value="mandiri">Bank Mandiri</MenuItem>
                                    <MenuItem value="cimb_niaga">CIMB Niaga</MenuItem>
                                    <MenuItem value="permata">PermataBank</MenuItem>
                                    <MenuItem value="gopay">GoPay</MenuItem>
                                    <MenuItem value="qris">QRIS</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Orders table */}
            <TableContainer component={Paper} sx={{ mb: 4 }} data-aos="fade-up">
                <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Order ID</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderSortKey === 'date'} // Use renamed state variable
                                    direction={orderSortKey === 'date' ? sortDirection : 'asc'} // Use renamed state variables
                                    onClick={() => handleRequestSort('date')}
                                >
                                    Date
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Type</TableCell> {/* <-- TAMBAHKAN KOLOM BARU */}
                            <TableCell>Items</TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={orderSortKey === 'amount'} // Use renamed state variable
                                    direction={orderSortKey === 'amount' ? sortDirection : 'asc'} // Use renamed state variables
                                    onClick={() => handleRequestSort('amount')}
                                >
                                    Amount
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Payment</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            renderSkeletons()
                        ) : currentItems.length > 0 ? (
                            currentItems.map((order) => (
                                <TableRow key={order.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {order.items[0]?.image && (
                                                <Box
                                                    component="img"
                                                    src={order.items[0].image}
                                                    alt={order.items[0].name}
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 1,
                                                        objectFit: 'cover',
                                                        objectPosition: 'center'
                                                    }}
                                                />
                                            )}
                                            <Box>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {order.orderNumber}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {order.items.length} item(s)
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{order.customer.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {order.customer.phone}
                                            {order.orderType === 'Makan di Tempat' && order.customer.tableNumber && ` (Table: ${order.customer.tableNumber})`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(order.createdAt)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell> {/* <-- ISI KOLOM BARU */}
                                        <Typography variant="body2">
                                            {order.orderType}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            IDR {order.totalAmount.toLocaleString()}
                                        </Typography>
                                        {order.serviceFee && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                +Service: IDR {order.serviceFee.toLocaleString()}
                                            </Typography>
                                        )}
                                        {order.tax && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                +Tax: IDR {order.tax.toLocaleString()}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {getPaymentMethodIcon(order.paymentMethod)}
                                            <Chip
                                                label={order.paymentMethod}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mb: 0.5 }}
                                            />
                                        </Box>
                                        <Typography variant="caption" display="block">
                                            {order.paymentStatus}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusLabel(order.status)}
                                            size="small"
                                            color={getStatusColor(order.status) as any}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleViewDetails(order)}
                                            sx={{
                                                borderColor: 'rgba(0,0,0,0.12)',
                                                color: 'text.primary',
                                                '&:hover': {
                                                    bgcolor: 'rgba(0,0,0,0.04)',
                                                }
                                            }}
                                        >
                                            Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3 }}> {/* Adjusted colSpan */}
                                    <Typography variant="subtitle1">No orders found</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Try changing your search or filter criteria
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {filteredOrders.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                    <Pagination
                        count={pageCount}
                        page={currentPage}
                        onChange={handleChangePage}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}

            {/* Order details dialog */}
            <Dialog
                open={openDetailDialog}
                onClose={handleCloseDetails}
                fullWidth
                maxWidth="md"
            >
                {selectedOrder && (
                    <>
                        <DialogTitle sx={{ pb: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h6">
                                        Order {selectedOrder.orderNumber}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDate(selectedOrder.createdAt)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Button
                                        variant="outlined"
                                        onClick={handleStatusMenuOpen}
                                        endIcon={<KeyboardArrowDownIcon />}
                                        startIcon={<CircleIcon sx={{ color: statusColors[selectedOrder.status].color, fontSize: 12 }} />}
                                        sx={{
                                            borderColor: 'rgba(0,0,0,0.12)',
                                            color: statusColors[selectedOrder.status].color,
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {selectedOrder.status}
                                    </Button>
                                    <Menu
                                        anchorEl={statusAnchorEl}
                                        open={Boolean(statusAnchorEl)}
                                        onClose={handleStatusMenuClose}
                                    >
                                        {statusMenuItems.map((statusItem) => (
                                            <MenuItem
                                                key={statusItem.value}
                                                onClick={() => selectedOrder && handleStatusChange(selectedOrder.id, statusItem.value)}
                                            >
                                                <Chip
                                                    label={statusItem.label}
                                                    size="small"
                                                    color={statusItem.color as any}
                                                    sx={{ mr: 1 }}
                                                />
                                                {statusItem.label}
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </Box>
                            </Box>
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={3}>
                                {/* Customer info */}
                                <Grid item xs={12} md={6}>
                                    <Card variant="outlined" sx={{ height: '100%' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                CUSTOMER INFORMATION
                                            </Typography>
                                            <Typography variant="body1" fontWeight="medium">
                                                {selectedOrder.customer.name}
                                            </Typography>
                                            <Typography variant="body2">
                                                {selectedOrder.customer.phone}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mb: 1 }}> {/* Adjusted margin */}
                                                {selectedOrder.customer.address || 'No address provided'}
                                            </Typography>

                                            {/* Display Order Type */}
                                            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1.5 }}>
                                                ORDER TYPE
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {selectedOrder.orderType || 'N/A'}
                                            </Typography>

                                            {selectedOrder.customer.tableNumber && selectedOrder.orderType === 'Makan di Tempat' && (
                                                <Box sx={{ mt: 1.5 }}>
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        TABLE NUMBER
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {selectedOrder.customer.tableNumber}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Payment info */}
                                <Grid item xs={12} md={6}>
                                    <Card variant="outlined" sx={{ height: '100%' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                PAYMENT INFORMATION
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Subtotal:</Typography>
                                                <Typography variant="body2">
                                                    IDR {selectedOrder.subtotal?.toLocaleString() || selectedOrder.totalAmount.toLocaleString()}
                                                </Typography>
                                            </Box>
                                            {selectedOrder.serviceFee && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2">Service Fee:</Typography>
                                                    <Typography variant="body2">
                                                        IDR {selectedOrder.serviceFee.toLocaleString()}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {selectedOrder.tax && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2">Tax:</Typography>
                                                    <Typography variant="body2">
                                                        IDR {selectedOrder.tax.toLocaleString()}
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Divider sx={{ my: 1 }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body1" fontWeight="medium">Total:</Typography>
                                                <Typography variant="body1" fontWeight="medium">
                                                    IDR {selectedOrder.totalAmount.toLocaleString()}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="body2">
                                                    Method: {selectedOrder.paymentMethod}
                                                </Typography>
                                                <Typography variant="body2">
                                                    Status: {selectedOrder.paymentStatus}
                                                </Typography>
                                                {selectedOrder.paymentToken && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Token: {selectedOrder.paymentToken}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Order items */}
                                <Grid item xs={12}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                ORDER ITEMS
                                            </Typography>
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Item</TableCell>
                                                            <TableCell align="center">Qty</TableCell>
                                                            <TableCell align="right">Price</TableCell>
                                                            <TableCell align="right">Subtotal</TableCell>
                                                            <TableCell>Notes</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {selectedOrder.items.map((item, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>
                                                                    <Typography variant="body2" fontWeight="medium">
                                                                        {item.name}
                                                                    </Typography>
                                                                    {(item.spicyLevel || item.iceLevel) && (
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {item.spicyLevel && `Spicy: ${item.spicyLevel}`}
                                                                            {item.spicyLevel && item.iceLevel && ' | '}
                                                                            {item.iceLevel && `Ice: ${item.iceLevel}`}
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="center">{item.quantity}</TableCell>
                                                                <TableCell align="right">
                                                                    IDR {item.price.toLocaleString()}
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    IDR {item.subtotal.toLocaleString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="caption">
                                                                        {/* Item-specific notes would go here if available */}
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDetails}>Close</Button>
                            <Button
                                onClick={(e) => {
                                    setStatusAnchorEl(e.currentTarget);
                                }}
                                variant="contained"
                                color="primary"
                            >
                                Change Status
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
}