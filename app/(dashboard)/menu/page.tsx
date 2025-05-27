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
    FormControl,
    InputLabel,
    Select,
    Switch, // Keep if you plan to re-add availability, otherwise remove
    FormControlLabel, // Keep if you plan to re-add availability, otherwise remove
    Skeleton,
    Card,
    CardMedia,
    CardContent,
    Pagination
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Star as StarIcon // For rating
} from '@mui/icons-material';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
// import Image from 'next/image'; // Using CardMedia which takes a URL directly
import AOS from 'aos';

// Updated MenuItem interface
interface MenuItem {
    id: string;
    category: string;
    image: string;
    price: number;
    rating?: number; // Optional, as it might not be on all items
    reviews?: number; // Optional
    translations: {
        en?: {
            name: string;
            description: string;
        };
        id?: { // Assuming 'id' for Indonesian
            name: string;
            description: string;
        };
        // Add other languages if needed
    };
    // Fields to consider re-adding or managing differently:
    // isAvailable: boolean;
    // special?: boolean;
    // spicyOptions?: boolean;
}

// Assuming categories might come from Firestore or be dynamic in the future
// For now, keeping it simple. You might want to derive this from your items.
const categories = ['All', 'Minuman', 'Makanan']; // Adjust based on your actual categories

export default function MenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const router = useRouter();

    // Initialize AOS
    useEffect(() => {
        AOS.init({
            duration: 800,
            once: true
        });
    }, []);

    // Fetch menu items
    useEffect(() => {
        const fetchMenuItems = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'menu'));
                const items: MenuItem[] = [];
                querySnapshot.forEach((doc) => {
                    // Basic validation for translations
                    const data = doc.data();
                    if (data.translations && (data.translations.id || data.translations.en)) {
                        items.push({ id: doc.id, ...data } as MenuItem);
                    } else {
                        console.warn(`Document ${doc.id} is missing required translation fields.`);
                    }
                });
                setMenuItems(items);
                // setFilteredItems(items); // Will be handled by the filter useEffect
                setLoading(false);
            } catch (error) {
                console.error('Error fetching menu items:', error);
                setLoading(false);
            }
        };

        fetchMenuItems();
    }, []);

    // Helper function to get localized name and description
    const getLocalizedName = (item: MenuItem, lang: 'id' | 'en' = 'id') => {
        return item.translations?.[lang]?.name || item.translations?.en?.name || 'No Name';
    };

    const getLocalizedDescription = (item: MenuItem, lang: 'id' | 'en' = 'id') => {
        return item.translations?.[lang]?.description || item.translations?.en?.description || 'No Description';
    };


    // Filter menu items based on search and category
    useEffect(() => {
        let result = menuItems;

        // Apply search filter (searches in localized name and description)
        if (searchTerm) {
            result = result.filter(item =>
                getLocalizedName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
                getLocalizedDescription(item).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply category filter
        if (selectedCategory !== 'All') {
            // Ensure category names are consistent (e.g., "minuman" vs "Minuman")
            result = result.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());
        }

        setFilteredItems(result);
        setCurrentPage(1); // Reset to first page when filters change
    }, [searchTerm, selectedCategory, menuItems]);

    // Menu item actions
    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, item: MenuItem) => {
        setAnchorEl(event.currentTarget);
        setSelectedItem(item);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleAddNew = () => {
        router.push('/menu/add'); // Ensure this page can handle the new structure
    };

    const handleEdit = () => {
        if (selectedItem) {
            router.push(`/menu/edit/${selectedItem.id}`); // Ensure this page can handle the new structure
        }
        handleCloseMenu();
    };

    const handleDeleteConfirm = () => {
        setOpenDeleteDialog(true);
        handleCloseMenu();
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
        setSelectedItem(null);
    };

    const handleDelete = async () => {
        if (selectedItem) {
            try {
                await deleteDoc(doc(db, 'menu', selectedItem.id));
                setMenuItems(prevItems => prevItems.filter(item => item.id !== selectedItem!.id));
                // No need to update filteredItems directly, useEffect will handle it
                setOpenDeleteDialog(false);
                setSelectedItem(null);
            } catch (error) {
                console.error('Error deleting menu item:', error);
            }
        }
    };

    // handleToggleAvailability would need to be re-thought if 'isAvailable' is not in the new structure
    // If you need it, you'll have to add 'isAvailable' to your Firestore documents and MenuItem interface
    /*
    const handleToggleAvailability = async (item: MenuItem) => {
        try {
            const menuRef = doc(db, 'menu', item.id);
            await updateDoc(menuRef, {
                isAvailable: !item.isAvailable // Assuming isAvailable field exists
            });

            setMenuItems(prevItems =>
                prevItems.map(menuItem =>
                    menuItem.id === item.id
                        ? { ...menuItem, isAvailable: !menuItem.isAvailable }
                        : menuItem
                )
            );
        } catch (error) {
            console.error('Error updating availability:', error);
        }
    };
    */

    // Pagination
    const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
        window.scrollTo(0, 0);
    };

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
    const pageCount = Math.ceil(filteredItems.length / itemsPerPage);

    // Render loading skeletons
    const renderSkeletons = () => {
        return Array(itemsPerPage).fill(0).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`} data-aos="fade-up">
                <Card sx={{ height: '100%' }}>
                    <Skeleton variant="rectangular" height={180} />
                    <CardContent>
                        <Skeleton variant="text" height={20} width="30%" sx={{ mb: 1 }} />
                        <Skeleton variant="text" height={30} />
                        <Skeleton variant="text" />
                        <Skeleton variant="text" sx={{ mt: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Skeleton variant="text" width="40%" height={25} />
                            {/* <Skeleton variant="circular" width={40} height={40} /> */}
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        ));
    };

    return (
        <>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Manage Menu
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Add, edit, and manage your restaurant menu items
                </Typography>
            </Box>

            {/* Filters and actions */}
            <Paper sx={{ p: 2, mb: 4 }} data-aos="fade-up">
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search menu items..."
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
                    <Grid item xs={12} md={5}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {categories.map((category) => (
                                <Chip
                                    key={category}
                                    label={category}
                                    clickable
                                    color={selectedCategory.toLowerCase() === category.toLowerCase() ? "primary" : "default"}
                                    onClick={() => setSelectedCategory(category)}
                                    sx={{ textTransform: 'capitalize' }}
                                />
                            ))}
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddNew}
                            sx={{ bgcolor: '#bc5a3c', '&:hover': { bgcolor: '#a04e34' } }}
                        >
                            Add New Item
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Menu items grid */}
            <Grid container spacing={3}>
                {loading ? (
                    renderSkeletons()
                ) : currentItems.length > 0 ? (
                    currentItems.map((item) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={item.id} data-aos="fade-up">
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <Box sx={{ position: 'relative', height: 180 }}>
                                    {item.image ? (
                                        <CardMedia
                                            component="img"
                                            height="180"
                                            image={item.image}
                                            alt={getLocalizedName(item)}
                                            sx={{ objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'grey.200' // Lighter placeholder background
                                            }}
                                        >
                                            <Typography color="text.secondary">No Image</Typography>
                                        </Box>
                                    )}
                                    <IconButton
                                        aria-label="actions"
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            bgcolor: 'rgba(255,255,255,0.7)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,0.9)',
                                            }
                                        }}
                                        onClick={(e) => handleMenuClick(e, item)}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </Box>
                                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ mb: 1 }}>
                                        <Chip
                                            label={item.category}
                                            size="small"
                                            sx={{
                                                bgcolor: '#f0f0f0',
                                                color: 'text.secondary',
                                                fontSize: '0.75rem',
                                                height: 24,
                                                textTransform: 'capitalize'
                                            }}
                                        />
                                        {/* Removed 'special' chip as it's not in the new structure */}
                                    </Box>
                                    <Typography variant="h6" fontWeight="medium" noWrap title={getLocalizedName(item)}>
                                        {getLocalizedName(item)}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        title={getLocalizedDescription(item)}
                                        sx={{
                                            mb: 2,
                                            height: 40, // Approx 2 lines
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            flexGrow: 1
                                        }}
                                    >
                                        {getLocalizedDescription(item)}
                                    </Typography>

                                    {/* Display Rating and Reviews if available */}
                                    {(item.rating !== undefined || item.reviews !== undefined) && ( // Check if rating or reviews are present
                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 1 }}>
                                            {typeof item.rating === 'number' && ( // Check if rating is a number
                                                <>
                                                    <StarIcon sx={{ fontSize: 16, color: 'warning.main', mr: 0.5 }} />
                                                    <Typography variant="body2" sx={{ mr: 1 }}>{item.rating.toFixed(1)}</Typography>
                                                </>
                                            )}
                                            {typeof item.reviews === 'number' && ( // Optionally, add a similar check for reviews if it's also a number
                                                <Typography variant="caption">({item.reviews} reviews)</Typography>
                                            )}
                                        </Box>
                                    )}

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                                            IDR {item.price.toLocaleString()}
                                        </Typography>
                                        {/* Availability Switch - re-add if needed */}
                                        {/*
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={item.isAvailable} // Assumes isAvailable field
                                                    onChange={() => handleToggleAvailability(item)}
                                                    color="primary"
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Typography variant="caption" color={item.isAvailable ? "success.main" : "error"}>
                                                    {item.isAvailable ? "Available" : "Sold Out"}
                                                </Typography>
                                            }
                                            sx={{ ml: 0 }}
                                        />
                                        */}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                ) : (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center' }} data-aos="fade-up">
                            <Typography variant="h6">No menu items found</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Try changing your search or filter criteria, or add new items.
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategory('All');
                                }}
                                sx={{ mr: 1 }}
                            >
                                Clear Filters
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleAddNew}
                                sx={{ bgcolor: '#bc5a3c', '&:hover': { bgcolor: '#a04e34' } }}
                            >
                                Add New Item
                            </Button>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Pagination */}
            {filteredItems.length > itemsPerPage && (
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

            {/* Item actions menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
            >
                <MenuItem onClick={handleEdit}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit Item
                </MenuItem>
                <MenuItem onClick={handleDeleteConfirm} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete Item
                </MenuItem>
            </Menu>

            {/* Delete confirmation dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCancelDelete}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete "{selectedItem ? getLocalizedName(selectedItem) : ''}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}