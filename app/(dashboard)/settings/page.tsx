'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Grid,
    Tabs,
    Tab,
    Divider,
    Switch,
    FormControlLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Snackbar,
    IconButton,
    Avatar,
    Card,
    CardContent,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme
} from '@mui/material';
import {
    Save as SaveIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Restaurant as RestaurantIcon,
    AccessTime as AccessTimeIcon,
    Money as MoneyIcon,
    Notifications as NotificationsIcon,
    Language as LanguageIcon,
    Person as PersonIcon,
    LocalShipping as LocalShippingIcon,
    Settings as SettingsIcon,
    CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AOS from 'aos';
import 'aos/dist/aos.css';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

interface BusinessHours {
    day: string;
    open: boolean;
    openTime: string;
    closeTime: string;
}

interface RestaurantInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
    logo: string;
    businessHours: BusinessHours[];
}

interface PaymentSettings {
    acceptCash: boolean;
    acceptCard: boolean;
    acceptQris: boolean;
    acceptTransfer: boolean;
    taxRate: number;
    serviceCharge: number;
    defaultCurrency: string;
}

interface DeliverySettings {
    offerDelivery: boolean;
    deliveryFee: number;
    minimumOrderDelivery: number;
    deliveryRadius: number;
    deliveryTimeEstimate: string;
    offerPickup: boolean;
    pickupTimeEstimate: string;
}

interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
    photoURL?: string;
    createdAt?: any;
}

interface NotificationSettings {
    emailNotifications: boolean;
    orderNotifications: boolean;
    promotionNotifications: boolean;
    soundAlerts: boolean;
}

export default function SettingsPage() {
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [openUserDialog, setOpenUserDialog] = useState(false);
    const [newUser, setNewUser] = useState<{ email: string, name: string, role: string, password: string }>({
        email: '',
        name: '',
        role: 'staff',
        password: ''
    });
    const { user } = useAuth();
    const theme = useTheme();

    // Form states
    const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>({
        name: 'Wardes Restaurant',
        address: '',
        phone: '',
        email: '',
        description: '',
        logo: '',
        businessHours: [
            { day: 'Monday', open: true, openTime: '08:00', closeTime: '20:00' },
            { day: 'Tuesday', open: true, openTime: '08:00', closeTime: '20:00' },
            { day: 'Wednesday', open: true, openTime: '08:00', closeTime: '20:00' },
            { day: 'Thursday', open: true, openTime: '08:00', closeTime: '20:00' },
            { day: 'Friday', open: true, openTime: '08:00', closeTime: '21:00' },
            { day: 'Saturday', open: true, openTime: '09:00', closeTime: '21:00' },
            { day: 'Sunday', open: true, openTime: '09:00', closeTime: '20:00' },
        ]
    });

    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
        acceptCash: true,
        acceptCard: true,
        acceptQris: true,
        acceptTransfer: true,
        taxRate: 10,
        serviceCharge: 5,
        defaultCurrency: 'IDR'
    });

    const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
        offerDelivery: true,
        deliveryFee: 10000,
        minimumOrderDelivery: 50000,
        deliveryRadius: 5,
        deliveryTimeEstimate: '30-45',
        offerPickup: true,
        pickupTimeEstimate: '15-20'
    });

    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        emailNotifications: true,
        orderNotifications: true,
        promotionNotifications: false,
        soundAlerts: true
    });

    // Initialize AOS
    useEffect(() => {
        AOS.init({
            duration: 800,
            once: true
        });
    }, []);

    // Fetch settings data
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Fetch restaurant info
                const restaurantDoc = await getDoc(doc(db, 'settings', 'restaurant'));
                if (restaurantDoc.exists()) {
                    setRestaurantInfo(restaurantDoc.data() as RestaurantInfo);
                }

                // Fetch payment settings
                const paymentDoc = await getDoc(doc(db, 'settings', 'payment'));
                if (paymentDoc.exists()) {
                    setPaymentSettings(paymentDoc.data() as PaymentSettings);
                }

                // Fetch delivery settings
                const deliveryDoc = await getDoc(doc(db, 'settings', 'delivery'));
                if (deliveryDoc.exists()) {
                    setDeliverySettings(deliveryDoc.data() as DeliverySettings);
                }

                // Fetch notification settings
                const notificationDoc = await getDoc(doc(db, 'settings', 'notifications'));
                if (notificationDoc.exists()) {
                    setNotificationSettings(notificationDoc.data() as NotificationSettings);
                }

                // Fetch admin users
                const usersSnapshot = await getDocs(collection(db, 'adminUsers'));
                const users: AdminUser[] = [];
                usersSnapshot.forEach(doc => {
                    users.push({ id: doc.id, ...doc.data() } as AdminUser);
                });
                setAdminUsers(users);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching settings:', error);
                setLoading(false);
                showSnackbar('Failed to load settings', 'error');
            }
        };

        fetchSettings();
    }, []);

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    // Show snackbar message
    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    // Handle snackbar close
    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    // Handle restaurant info change
    const handleRestaurantInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setRestaurantInfo({
            ...restaurantInfo,
            [e.target.name]: e.target.value
        });
    };

    // Handle business hours change
    const handleBusinessHoursChange = (index: number, field: keyof BusinessHours, value: any) => {
        const updatedHours = [...restaurantInfo.businessHours];
        updatedHours[index] = {
            ...updatedHours[index],
            [field]: value
        };
        setRestaurantInfo({
            ...restaurantInfo,
            businessHours: updatedHours
        });
    };

    // Handle payment settings change
    const handlePaymentSettingsChange = (name: keyof PaymentSettings, value: any) => {
        setPaymentSettings({
            ...paymentSettings,
            [name]: value
        });
    };

    // Handle delivery settings change
    const handleDeliverySettingsChange = (name: keyof DeliverySettings, value: any) => {
        setDeliverySettings({
            ...deliverySettings,
            [name]: value
        });
    };

    // Handle notification settings change
    const handleNotificationSettingsChange = (name: keyof NotificationSettings, value: boolean) => {
        setNotificationSettings({
            ...notificationSettings,
            [name]: value
        });
    };

    // Handle logo upload
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // Save restaurant settings
    const saveRestaurantSettings = async () => {
        setSaving(true);
        try {
            // Upload logo if changed
            if (logoFile) {
                const storageRef = ref(storage, 'settings/restaurant-logo');
                await uploadBytes(storageRef, logoFile);
                const logoUrl = await getDownloadURL(storageRef);
                setRestaurantInfo({
                    ...restaurantInfo,
                    logo: logoUrl
                });
            }

            // Save restaurant info
            await updateDoc(doc(db, 'settings', 'restaurant'), restaurantInfo);
            showSnackbar('Restaurant information saved successfully', 'success');
        } catch (error) {
            console.error('Error saving restaurant settings:', error);
            showSnackbar('Failed to save restaurant information', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Save payment settings
    const savePaymentSettings = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'settings', 'payment'), paymentSettings);
            showSnackbar('Payment settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving payment settings:', error);
            showSnackbar('Failed to save payment settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Save delivery settings
    const saveDeliverySettings = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'settings', 'delivery'), deliverySettings);
            showSnackbar('Delivery settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving delivery settings:', error);
            showSnackbar('Failed to save delivery settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Save notification settings
    const saveNotificationSettings = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'settings', 'notifications'), notificationSettings);
            showSnackbar('Notification settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            showSnackbar('Failed to save notification settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Handle add new user
    const handleAddUser = async () => {
        try {
            // In a real implementation, you would use Firebase Auth to create the user
            // Here we're just adding to Firestore for demonstration
            await addDoc(collection(db, 'adminUsers'), {
                ...newUser,
                createdAt: new Date()
            });

            // Refresh user list
            const usersSnapshot = await getDocs(collection(db, 'adminUsers'));
            const users: AdminUser[] = [];
            usersSnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() } as AdminUser);
            });
            setAdminUsers(users);

            setOpenUserDialog(false);
            setNewUser({
                email: '',
                name: '',
                role: 'staff',
                password: ''
            });
            showSnackbar('User added successfully', 'success');
        } catch (error) {
            console.error('Error adding user:', error);
            showSnackbar('Failed to add user', 'error');
        }
    };

    // Handle delete user
    const handleDeleteUser = async (userId: string) => {
        try {
            await deleteDoc(doc(db, 'adminUsers', userId));
            setAdminUsers(adminUsers.filter(user => user.id !== userId));
            showSnackbar('User deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting user:', error);
            showSnackbar('Failed to delete user', 'error');
        }
    };

    // Handle new user input change
    const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
        const { name, value } = e.target;
        setNewUser({
            ...newUser,
            [name as string]: value
        });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage restaurant settings and preferences
                </Typography>
            </Box>

            <Paper sx={{ width: '100%' }} data-aos="fade-up">
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={currentTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="settings tabs"
                    >
                        <Tab icon={<RestaurantIcon />} label="Restaurant" />
                        <Tab icon={<MoneyIcon />} label="Payment" />
                        <Tab icon={<LocalShippingIcon />} label="Delivery" />
                        <Tab icon={<PersonIcon />} label="Users" />
                        <Tab icon={<NotificationsIcon />} label="Notifications" />
                    </Tabs>
                </Box>

                {/* Restaurant Information Tab */}
                <TabPanel value={currentTab} index={0}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4} data-aos="fade-up" data-aos-delay="100">
                            <Card>
                                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Box sx={{ mb: 2, width: '150px', height: '150px', position: 'relative' }}>
                                        {(logoPreview || restaurantInfo.logo) ? (
                                            <Avatar
                                                src={logoPreview || restaurantInfo.logo}
                                                sx={{ width: '100%', height: '100%' }}
                                            />
                                        ) : (
                                            <Avatar
                                                sx={{ width: '100%', height: '100%', bgcolor: '#bc5a3c' }}
                                            >
                                                <RestaurantIcon sx={{ fontSize: 80 }} />
                                            </Avatar>
                                        )}
                                        <label htmlFor="logo-upload">
                                            <input
                                                id="logo-upload"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                                onChange={handleLogoChange}
                                            />
                                            <IconButton
                                                component="span"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    right: 0,
                                                    bgcolor: 'primary.main',
                                                    color: 'white',
                                                    '&:hover': {
                                                        bgcolor: 'primary.dark',
                                                    }
                                                }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </label>
                                    </Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Restaurant Logo
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" align="center">
                                        Upload your restaurant logo. Recommended size: 200x200px
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={8} data-aos="fade-up" data-aos-delay="200">
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Restaurant Information
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Restaurant Name"
                                                name="name"
                                                value={restaurantInfo.name}
                                                onChange={handleRestaurantInfoChange}
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Address"
                                                name="address"
                                                value={restaurantInfo.address}
                                                onChange={handleRestaurantInfoChange}
                                                variant="outlined"
                                                multiline
                                                rows={2}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Phone Number"
                                                name="phone"
                                                value={restaurantInfo.phone}
                                                onChange={handleRestaurantInfoChange}
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                name="email"
                                                value={restaurantInfo.email}
                                                onChange={handleRestaurantInfoChange}
                                                variant="outlined"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Description"
                                                name="description"
                                                value={restaurantInfo.description}
                                                onChange={handleRestaurantInfoChange}
                                                variant="outlined"
                                                multiline
                                                rows={4}
                                                helperText="Brief description of your restaurant"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} data-aos="fade-up" data-aos-delay="300">
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                                        <Typography variant="h6">
                                            Business Hours
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />

                                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                                        <Grid container spacing={2}>
                                            {restaurantInfo.businessHours.map((hours, index) => (
                                                <Grid item xs={12} key={hours.day} data-aos="fade-up" data-aos-delay={300 + index * 50}>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        p: 2,
                                                        border: 1,
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                        mb: 1
                                                    }}>
                                                        <Grid container spacing={2} alignItems="center">
                                                            <Grid item xs={12} sm={3}>
                                                                <FormControlLabel
                                                                    control={
                                                                        <Switch
                                                                            checked={hours.open}
                                                                            onChange={(e) => handleBusinessHoursChange(index, 'open', e.target.checked)}
                                                                            color="primary"
                                                                        />
                                                                    }
                                                                    label={hours.day}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={9}>
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 2,
                                                                    opacity: hours.open ? 1 : 0.5
                                                                }}>
                                                                    <TimePicker
                                                                        label="Open Time"
                                                                        value={new Date(`2023-01-01T${hours.openTime}`)}
                                                                        onChange={(newValue) => {
                                                                            if (newValue) {
                                                                                const timeStr = newValue.toTimeString().slice(0, 5);
                                                                                handleBusinessHoursChange(index, 'openTime', timeStr);
                                                                            }
                                                                        }}
                                                                        slotProps={{
                                                                            textField: {
                                                                                size: 'small',
                                                                                disabled: !hours.open
                                                                            },
                                                                        }}
                                                                    />
                                                                    <Typography sx={{ mx: 1 }}>to</Typography>
                                                                    <TimePicker
                                                                        label="Close Time"
                                                                        value={new Date(`2023-01-01T${hours.closeTime}`)}
                                                                        onChange={(newValue) => {
                                                                            if (newValue) {
                                                                                const timeStr = newValue.toTimeString().slice(0, 5);
                                                                                handleBusinessHoursChange(index, 'closeTime', timeStr);
                                                                            }
                                                                        }}
                                                                        slotProps={{
                                                                            textField: {
                                                                                size: 'small',
                                                                                disabled: !hours.open
                                                                            },
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </LocalizationProvider>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} data-aos="fade-up" data-aos-delay="400">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={saveRestaurantSettings}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Restaurant Settings'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Payment Tab */}
                <TabPanel value={currentTab} index={1}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6} data-aos="fade-up" data-aos-delay="100">
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Payment Methods
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={paymentSettings.acceptCash}
                                                onChange={(e) => handlePaymentSettingsChange('acceptCash', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Accept Cash Payment"
                                        sx={{ width: '100%', mb: 2 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={paymentSettings.acceptCard}
                                                onChange={(e) => handlePaymentSettingsChange('acceptCard', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Accept Credit/Debit Card Payment"
                                        sx={{ width: '100%', mb: 2 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={paymentSettings.acceptQris}
                                                onChange={(e) => handlePaymentSettingsChange('acceptQris', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Accept QRIS Payment"
                                        sx={{ width: '100%', mb: 2 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={paymentSettings.acceptTransfer}
                                                onChange={(e) => handlePaymentSettingsChange('acceptTransfer', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Accept Bank Transfer"
                                        sx={{ width: '100%', mb: 2 }}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6} data-aos="fade-up" data-aos-delay="200">
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Tax & Currency Settings
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Tax Rate (%)"
                                                type="number"
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                                }}
                                                value={paymentSettings.taxRate}
                                                onChange={(e) => handlePaymentSettingsChange('taxRate', Number(e.target.value))}
                                                variant="outlined"
                                                helperText="Tax rate applied to orders"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Service Charge (%)"
                                                type="number"
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                                }}
                                                value={paymentSettings.serviceCharge}
                                                onChange={(e) => handlePaymentSettingsChange('serviceCharge', Number(e.target.value))}
                                                variant="outlined"
                                                helperText="Service charge applied to orders (0 for no service charge)"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControl fullWidth variant="outlined">
                                                <InputLabel>Default Currency</InputLabel>
                                                <Select
                                                    value={paymentSettings.defaultCurrency}
                                                    onChange={(e) => handlePaymentSettingsChange('defaultCurrency', e.target.value)}
                                                    label="Default Currency"
                                                >
                                                    <MenuItem value="IDR">Indonesian Rupiah (IDR)</MenuItem>
                                                    <MenuItem value="USD">US Dollar (USD)</MenuItem>
                                                    <MenuItem value="EUR">Euro (EUR)</MenuItem>
                                                    <MenuItem value="SGD">Singapore Dollar (SGD)</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} data-aos="fade-up" data-aos-delay="300">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={savePaymentSettings}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Payment Settings'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Delivery Tab */}
                <TabPanel value={currentTab} index={2}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6} data-aos="fade-up" data-aos-delay="100">
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Delivery Options
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={deliverySettings.offerDelivery}
                                                onChange={(e) => handleDeliverySettingsChange('offerDelivery', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Offer Delivery"
                                        sx={{ width: '100%', mb: 2 }}
                                    />

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Delivery Fee"
                                                type="number"
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start">IDR</InputAdornment>,
                                                }}
                                                value={deliverySettings.deliveryFee}
                                                onChange={(e) => handleDeliverySettingsChange('deliveryFee', Number(e.target.value))}
                                                variant="outlined"
                                                disabled={!deliverySettings.offerDelivery}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Minimum Order for Delivery"
                                                type="number"
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start">IDR</InputAdornment>,
                                                }}
                                                value={deliverySettings.minimumOrderDelivery}
                                                onChange={(e) => handleDeliverySettingsChange('minimumOrderDelivery', Number(e.target.value))}
                                                variant="outlined"
                                                disabled={!deliverySettings.offerDelivery}
                                                helperText="Minimum order amount required for delivery"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Delivery Radius"
                                                type="number"
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">km</InputAdornment>,
                                                }}
                                                value={deliverySettings.deliveryRadius}
                                                onChange={(e) => handleDeliverySettingsChange('deliveryRadius', Number(e.target.value))}
                                                variant="outlined"
                                                disabled={!deliverySettings.offerDelivery}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Delivery Time Estimate"
                                                value={deliverySettings.deliveryTimeEstimate}
                                                onChange={(e) => handleDeliverySettingsChange('deliveryTimeEstimate', e.target.value)}
                                                variant="outlined"
                                                disabled={!deliverySettings.offerDelivery}
                                                helperText="e.g., 30-45 minutes"
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6} data-aos="fade-up" data-aos-delay="200">
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Pickup Options
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={deliverySettings.offerPickup}
                                                onChange={(e) => handleDeliverySettingsChange('offerPickup', e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label="Offer Pickup"
                                        sx={{ width: '100%', mb: 2 }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="Pickup Time Estimate"
                                        value={deliverySettings.pickupTimeEstimate}
                                        onChange={(e) => handleDeliverySettingsChange('pickupTimeEstimate', e.target.value)}
                                        variant="outlined"
                                        disabled={!deliverySettings.offerPickup}
                                        helperText="e.g., 15-20 minutes"
                                        sx={{ mb: 2 }}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} data-aos="fade-up" data-aos-delay="300">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={saveDeliverySettings}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Delivery Settings'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Users Tab */}
                <TabPanel value={currentTab} index={3}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} data-aos="fade-up" data-aos-delay="100">
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">
                                    User Management
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setOpenUserDialog(true)}
                                >
                                    Add User
                                </Button>
                            </Box>

                            <Card>
                                <List>
                                    {adminUsers.map((adminUser) => (
                                        <ListItem
                                            key={adminUser.id}
                                            secondaryAction={
                                                <IconButton
                                                    edge="end"
                                                    aria-label="delete"
                                                    onClick={() => handleDeleteUser(adminUser.id)}
                                                    disabled={adminUser.email === user?.email} // Prevent deleting self
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            }
                                            data-aos="fade-up"
                                        >
                                            <ListItemAvatar>
                                                <Avatar
                                                    src={adminUser.photoURL}
                                                    sx={{ bgcolor: theme.palette.primary.main }}
                                                >
                                                    {adminUser.name.charAt(0).toUpperCase()}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={adminUser.name}
                                                secondary={
                                                    <>
                                                        <Typography component="span" variant="body2">
                                                            {adminUser.email}
                                                        </Typography>
                                                        <br />
                                                        <Chip
                                                            label={adminUser.role}
                                                            size="small"
                                                            sx={{
                                                                textTransform: 'capitalize',
                                                                bgcolor: adminUser.role === 'admin' ? 'primary.light' : 'info.light',
                                                                color: adminUser.role === 'admin' ? 'primary.contrastText' : 'info.contrastText',
                                                                mt: 0.5
                                                            }}
                                                        />
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Notifications Tab */}
                <TabPanel value={currentTab} index={4}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} data-aos="fade-up" data-aos-delay="100">
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Notification Settings
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={notificationSettings.emailNotifications}
                                                        onChange={(e) => handleNotificationSettingsChange('emailNotifications', e.target.checked)}
                                                        color="primary"
                                                    />
                                                }
                                                label="Email Notifications"
                                                sx={{ width: '100%', mb: 1 }}
                                            />
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mb: 2 }}>
                                                Receive order and system notifications via email
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={notificationSettings.orderNotifications}
                                                        onChange={(e) => handleNotificationSettingsChange('orderNotifications', e.target.checked)}
                                                        color="primary"
                                                    />
                                                }
                                                label="New Order Notifications"
                                                sx={{ width: '100%', mb: 1 }}
                                            />
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mb: 2 }}>
                                                Get notified when a new order is placed
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={notificationSettings.promotionNotifications}
                                                        onChange={(e) => handleNotificationSettingsChange('promotionNotifications', e.target.checked)}
                                                        color="primary"
                                                    />
                                                }
                                                label="Promotion Notifications"
                                                sx={{ width: '100%', mb: 1 }}
                                            />
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mb: 2 }}>
                                                Get notified about promotion usage and expiration
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={notificationSettings.soundAlerts}
                                                        onChange={(e) => handleNotificationSettingsChange('soundAlerts', e.target.checked)}
                                                        color="primary"
                                                    />
                                                }
                                                label="Sound Alerts"
                                                sx={{ width: '100%', mb: 1 }}
                                            />
                                            <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mb: 2 }}>
                                                Play sound when receiving new notifications
                                            </Typography>
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<SaveIcon />}
                                            onClick={saveNotificationSettings}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save Notification Settings'}
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>
            </Paper>

            {/* Add User Dialog */}
            <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New User</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Name"
                                name="name"
                                value={newUser.name}
                                onChange={handleNewUserChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={newUser.email}
                                onChange={handleNewUserChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Password"
                                name="password"
                                type="password"
                                value={newUser.password}
                                onChange={handleNewUserChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    name="role"
                                    value={newUser.role}
                                    label="Role"
                                    onChange={handleNewUserChange}
                                >
                                    <MenuItem value="admin">Admin</MenuItem>
                                    <MenuItem value="manager">Manager</MenuItem>
                                    <MenuItem value="staff">Staff</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddUser}
                        variant="contained"
                        disabled={!newUser.name || !newUser.email || !newUser.password}
                    >
                        Add User
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
}