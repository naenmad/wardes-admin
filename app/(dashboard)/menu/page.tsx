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
    Skeleton,
    Card,
    CardMedia,
    CardContent,
    Pagination,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Star as StarIcon,
    Link as LinkIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import AOS from 'aos';

// Updated MenuItem interface
interface MenuItem {
    id: string;
    category: string;
    image: string;
    price: number;
    rating?: number;
    reviews?: number;
    translations: {
        en?: {
            name: string;
            description: string;
        };
        id?: {
            name: string;
            description: string;
        };
    };
}

interface MenuItemFormData {
    category: string;
    image: string;
    price: string;
    rating: string;
    reviews: string;
    idName: string;
    idDescription: string;
    enName: string;
    enDescription: string;
}

const categories = ['All', 'Minuman', 'Makanan', 'Cemilan', 'Dessert'];

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

    // Form dialog states
    const [openFormDialog, setOpenFormDialog] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [formData, setFormData] = useState<MenuItemFormData>({
        category: '',
        image: '',
        price: '',
        rating: '',
        reviews: '',
        idName: '',
        idDescription: '',
        enName: '',
        enDescription: '',
    });
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

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
                    const data = doc.data();
                    if (data.translations && (data.translations.id || data.translations.en)) {
                        items.push({ id: doc.id, ...data } as MenuItem);
                    } else {
                        console.warn(`Document ${doc.id} is missing required translation fields.`);
                    }
                });
                setMenuItems(items);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching menu items:', error);
                setLoading(false);
            }
        };

        fetchMenuItems();
    }, []);

    // Helper functions
    const getLocalizedName = (item: MenuItem, lang: 'id' | 'en' = 'id') => {
        return item.translations?.[lang]?.name || item.translations?.en?.name || 'No Name';
    };

    const getLocalizedDescription = (item: MenuItem, lang: 'id' | 'en' = 'id') => {
        return item.translations?.[lang]?.description || item.translations?.en?.description || 'No Description';
    };

    const isValidImageUrl = (url: string) => {
        if (!url) return true; // Empty URL is valid (optional)
        try {
            new URL(url);
            return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
        } catch {
            return false;
        }
    };

    // Filter menu items
    useEffect(() => {
        let result = menuItems;

        if (searchTerm) {
            result = result.filter(item =>
                getLocalizedName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
                getLocalizedDescription(item).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedCategory !== 'All') {
            result = result.filter(item => item.category.toLowerCase() === selectedCategory.toLowerCase());
        }

        setFilteredItems(result);
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, menuItems]);

    // Form handlers
    const resetFormData = () => {
        setFormData({
            category: '',
            image: '',
            price: '',
            rating: '',
            reviews: '',
            idName: '',
            idDescription: '',
            enName: '',
            enDescription: '',
        });
        setFormError('');
        setFormSuccess('');
    };

    const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSelectChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddNew = () => {
        setFormMode('add');
        resetFormData();
        setOpenFormDialog(true);
    };

    const handleEdit = async () => {
        if (!selectedItem) return;

        setFormMode('edit');
        try {
            // Fetch fresh data
            const docRef = doc(db, 'menu', selectedItem.id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const itemData = docSnap.data();
                setFormData({
                    category: itemData.category || '',
                    image: itemData.image || '',
                    price: itemData.price?.toString() || '',
                    rating: itemData.rating?.toString() || '',
                    reviews: itemData.reviews?.toString() || '',
                    idName: itemData.translations?.id?.name || '',
                    idDescription: itemData.translations?.id?.description || '',
                    enName: itemData.translations?.en?.name || '',
                    enDescription: itemData.translations?.en?.description || '',
                });
                setOpenFormDialog(true);
            }
        } catch (error) {
            console.error('Error fetching item data:', error);
            setFormError('Gagal mengambil data item');
        }
        handleCloseMenu();
    };

    const handleSubmitForm = async () => {
        setFormSubmitting(true);
        setFormError('');
        setFormSuccess('');

        // Validation
        if (!formData.idName || !formData.category || !formData.price) {
            setFormError('Nama (ID), Kategori, dan Harga wajib diisi.');
            setFormSubmitting(false);
            return;
        }

        const price = parseFloat(formData.price);
        if (isNaN(price) || price < 0) {
            setFormError('Harga harus berupa angka positif.');
            setFormSubmitting(false);
            return;
        }

        if (formData.image && !isValidImageUrl(formData.image)) {
            setFormError('URL gambar tidak valid.');
            setFormSubmitting(false);
            return;
        }

        try {
            const menuItemData: any = {
                category: formData.category.toLowerCase(),
                image: formData.image,
                price: price,
                translations: {
                    id: {
                        name: formData.idName,
                        description: formData.idDescription,
                    },
                    en: {
                        name: formData.enName || formData.idName,
                        description: formData.enDescription || formData.idDescription,
                    },
                },
            };

            if (formData.rating) {
                const ratingValue = parseFloat(formData.rating);
                if (!isNaN(ratingValue) && ratingValue >= 0 && ratingValue <= 5) {
                    menuItemData.rating = ratingValue;
                }
            }

            if (formData.reviews) {
                const reviewsValue = parseInt(formData.reviews, 10);
                if (!isNaN(reviewsValue) && reviewsValue >= 0) {
                    menuItemData.reviews = reviewsValue;
                }
            }

            if (formMode === 'add') {
                menuItemData.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, 'menu'), menuItemData);
                const newItem = { id: docRef.id, ...menuItemData } as MenuItem;
                setMenuItems(prev => [...prev, newItem]);
                setFormSuccess('Item menu berhasil ditambahkan!');
            } else {
                menuItemData.updatedAt = serverTimestamp();
                const docRef = doc(db, 'menu', selectedItem!.id);
                await updateDoc(docRef, menuItemData);

                setMenuItems(prev => prev.map(item =>
                    item.id === selectedItem!.id
                        ? { ...item, ...menuItemData }
                        : item
                ));
                setFormSuccess('Item menu berhasil diperbarui!');
            }

            setTimeout(() => {
                setOpenFormDialog(false);
                resetFormData();
            }, 1500);

        } catch (error) {
            console.error('Error saving menu item:', error);
            setFormError('Gagal menyimpan item menu. Coba lagi.');
        } finally {
            setFormSubmitting(false);
        }
    };

    // Menu item actions
    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, item: MenuItem) => {
        setAnchorEl(event.currentTarget);
        setSelectedItem(item);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
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
                setOpenDeleteDialog(false);
                setSelectedItem(null);
            } catch (error) {
                console.error('Error deleting menu item:', error);
            }
        }
    };

    // Pagination
    const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
        window.scrollTo(0, 0);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
    const pageCount = Math.ceil(filteredItems.length / itemsPerPage);

    // Render loading skeletons
    const renderSkeletons = () => {
        return Array(itemsPerPage).fill(0).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`} data-aos="fade-up">
                <Card sx={{
                    height: 540,
                    width: '100%',
                    maxWidth: 300,
                    minWidth: 280,
                    margin: '0 auto'
                }}>
                    <Skeleton variant="rectangular" height={280} width="100%" />
                    <CardContent sx={{ height: 260, width: '100%' }}>
                        <Skeleton variant="text" height={20} width="30%" sx={{ mb: 1 }} />
                        <Skeleton variant="text" height={30} />
                        <Skeleton variant="text" />
                        <Skeleton variant="text" sx={{ mt: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Skeleton variant="text" width="40%" height={25} />
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
                            <Card
                                sx={{
                                    height: 540,
                                    width: '100%',
                                    maxWidth: 300,
                                    minWidth: 280,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    margin: '0 auto',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3
                                    }
                                }}
                            >
                                {/* Perfect Square Image section - 280x280 */}
                                <Box sx={{
                                    position: 'relative',
                                    height: 280, // Perfect square untuk card width 280px
                                    width: '100%',
                                    flexShrink: 0,
                                    bgcolor: 'grey.100' // Background color untuk fallback
                                }}>
                                    {item.image ? (
                                        <CardMedia
                                            component="img"
                                            height="280"
                                            image={item.image}
                                            alt={getLocalizedName(item)}
                                            sx={{
                                                objectFit: 'cover',
                                                objectPosition: 'center',
                                                width: '100%',
                                                height: '100%',
                                                display: 'block' // Ensure proper display
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                height: '100%',
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'grey.200',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            <Typography color="text.secondary" variant="body2">
                                                No Image
                                            </Typography>
                                            <Typography color="text.secondary" variant="caption">
                                                280x280
                                            </Typography>
                                        </Box>
                                    )}
                                    <IconButton
                                        aria-label="actions"
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                            backdropFilter: 'blur(4px)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255,255,255,1)',
                                            }
                                        }}
                                        onClick={(e) => handleMenuClick(e, item)}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </Box>

                                <CardContent
                                    sx={{
                                        flexGrow: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        p: 2,
                                        height: 260, // Sesuaikan content height
                                        width: '100%',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Category chip - Fixed position */}
                                    <Box sx={{ mb: 1, height: 24, width: '100%', flexShrink: 0 }}>
                                        <Chip
                                            label={item.category}
                                            size="small"
                                            sx={{
                                                bgcolor: '#f0f0f0',
                                                color: 'text.secondary',
                                                fontSize: '0.75rem',
                                                height: 24,
                                                maxWidth: '100%',
                                                textTransform: 'capitalize'
                                            }}
                                        />
                                    </Box>

                                    {/* Title - Fixed height and width */}
                                    <Typography
                                        variant="h6"
                                        fontWeight="medium"
                                        sx={{
                                            height: 32,
                                            width: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: 'vertical',
                                            mb: 1,
                                            flexShrink: 0
                                        }}
                                        title={getLocalizedName(item)}
                                    >
                                        {getLocalizedName(item)}
                                    </Typography>

                                    {/* Description - Fixed height and width */}
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            height: 60,
                                            width: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            mb: 2,
                                            flexShrink: 0,
                                            lineHeight: 1.4
                                        }}
                                        title={getLocalizedDescription(item)}
                                    >
                                        {getLocalizedDescription(item)}
                                    </Typography>

                                    {/* Rating section - Fixed height and width */}
                                    <Box
                                        sx={{
                                            height: 24,
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            mb: 1,
                                            flexShrink: 0
                                        }}
                                    >
                                        {(item.rating !== undefined || item.reviews !== undefined) ? (
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: 'text.secondary',
                                                width: '100%',
                                                overflow: 'hidden'
                                            }}>
                                                {typeof item.rating === 'number' && (
                                                    <>
                                                        <StarIcon sx={{ fontSize: 16, color: 'warning.main', mr: 0.5, flexShrink: 0 }} />
                                                        <Typography variant="body2" sx={{ mr: 1, flexShrink: 0 }}>
                                                            {item.rating.toFixed(1)}
                                                        </Typography>
                                                    </>
                                                )}
                                                {typeof item.reviews === 'number' && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        ({item.reviews} reviews)
                                                    </Typography>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box sx={{ width: '100%' }} /> // Empty box to maintain spacing
                                        )}
                                    </Box>

                                    {/* Spacer untuk push price ke bottom */}
                                    <Box sx={{ flexGrow: 1, width: '100%' }} />

                                    {/* Price section - Fixed at bottom with fixed width */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            height: 40, // Fixed height
                                            width: '100%', // Fixed width
                                            flexShrink: 0
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight="bold"
                                            color="primary.main"
                                            sx={{
                                                fontSize: '1.1rem',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: '60%' // Prevent price from taking too much space
                                            }}
                                        >
                                            IDR {item.price.toLocaleString()}
                                        </Typography>

                                        {/* Status indicator */}
                                        <Chip
                                            label="Available"
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                            sx={{
                                                height: 24,
                                                fontSize: '0.7rem',
                                                flexShrink: 0,
                                                maxWidth: '35%' // Prevent chip from taking too much space
                                            }}
                                        />
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

            {/* ENHANCED FORM DIALOG - SAME STYLE AS PROMOTIONS */}
            <Dialog
                open={openFormDialog}
                onClose={() => setOpenFormDialog(false)}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: '#bc5a3c',
                    color: 'white',
                    py: 3,
                    borderRadius: '8px 8px 0 0'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {formMode === 'add' ? <AddIcon /> : <EditIcon />}
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight="bold">
                                {formMode === 'add' ? 'Tambah Item Menu Baru' : 'Edit Item Menu'}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {formMode === 'add'
                                    ? 'Tambahkan item menu yang lezat untuk restoran Anda'
                                    : 'Perbarui informasi item menu yang sudah ada'
                                }
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {/* Alert Messages */}
                    {(formError || formSuccess) && (
                        <Box sx={{ p: 3, pb: 0 }}>
                            {formError && (
                                <Alert
                                    severity="error"
                                    sx={{ mb: 2, borderRadius: 2 }}
                                    onClose={() => setFormError('')}
                                >
                                    {formError}
                                </Alert>
                            )}
                            {formSuccess && (
                                <Alert
                                    severity="success"
                                    sx={{ mb: 2, borderRadius: 2 }}
                                    onClose={() => setFormSuccess('')}
                                >
                                    {formSuccess}
                                </Alert>
                            )}
                        </Box>
                    )}

                    {/* Form Content with Sections */}
                    <Box sx={{ p: 3 }}>
                        {/* Section 1: Basic Information */}
                        <Paper sx={{ p: 3, mb: 3, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: '#bc5a3c',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 2
                                }}>
                                    1
                                </Box>
                                <Typography variant="h6" fontWeight="medium">
                                    Informasi Dasar
                                </Typography>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        name="idName"
                                        label="Nama Item Menu"
                                        fullWidth
                                        required
                                        value={formData.idName}
                                        onChange={handleFormInputChange}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                            },
                                            '& .MuiInputLabel-root.Mui-focused': {
                                                color: '#bc5a3c',
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Typography sx={{ color: '#bc5a3c', fontWeight: 'bold', fontSize: '14px' }}>
                                                        ID
                                                    </Typography>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        name="enName"
                                        label="Nama (English)"
                                        fullWidth
                                        value={formData.enName}
                                        onChange={handleFormInputChange}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                            },
                                            '& .MuiInputLabel-root.Mui-focused': {
                                                color: '#bc5a3c',
                                            },
                                        }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Typography sx={{ color: '#bc5a3c', fontWeight: 'bold', fontSize: '14px' }}>
                                                        EN
                                                    </Typography>
                                                </InputAdornment>
                                            ),
                                        }}
                                        helperText="Opsional - akan menggunakan nama ID jika kosong"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        name="idDescription"
                                        label="Deskripsi Menu"
                                        fullWidth
                                        multiline
                                        rows={3}
                                        value={formData.idDescription}
                                        onChange={handleFormInputChange}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                            },
                                            '& .MuiInputLabel-root.Mui-focused': {
                                                color: '#bc5a3c',
                                            },
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        name="enDescription"
                                        label="Deskripsi (English)"
                                        fullWidth
                                        multiline
                                        rows={2}
                                        value={formData.enDescription}
                                        onChange={handleFormInputChange}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#bc5a3c',
                                                },
                                            },
                                            '& .MuiInputLabel-root.Mui-focused': {
                                                color: '#bc5a3c',
                                            },
                                        }}
                                        helperText="Opsional - akan menggunakan deskripsi ID jika kosong"
                                    />
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Section 2: Image and Settings */}
                        <Paper sx={{ p: 3, mb: 3, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: '#bc5a3c',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 2
                                }}>
                                    2
                                </Box>
                                <Typography variant="h6" fontWeight="medium">
                                    Gambar & Detail
                                </Typography>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'medium' }}>
                                            URL Gambar Menu
                                        </Typography>
                                        <TextField
                                            name="image"
                                            label="Masukkan URL Gambar"
                                            fullWidth
                                            value={formData.image}
                                            onChange={handleFormInputChange}
                                            placeholder="https://example.com/menu-image.jpg"
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '&:hover fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                },
                                                '& .MuiInputLabel-root.Mui-focused': {
                                                    color: '#bc5a3c',
                                                },
                                            }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LinkIcon sx={{ color: '#bc5a3c' }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            error={formData.image ? !isValidImageUrl(formData.image) : false}
                                            helperText={
                                                formData.image && !isValidImageUrl(formData.image)
                                                    ? "URL gambar tidak valid"
                                                    : "Pastikan URL mengarah langsung ke file gambar"
                                            }
                                        />
                                    </Box>

                                    {/* Enhanced Image Preview */}
                                    {formData.image && isValidImageUrl(formData.image) && (
                                        <Box sx={{
                                            border: '2px dashed #bc5a3c',
                                            borderRadius: 2,
                                            p: 2,
                                            bgcolor: 'rgba(188, 90, 60, 0.05)'
                                        }}>
                                            <Typography variant="caption" color="#bc5a3c" fontWeight="medium" gutterBottom display="block">
                                                ✓ Preview Gambar
                                            </Typography>
                                            <Box sx={{
                                                width: '100%',
                                                height: 200,
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'white',
                                                border: '1px solid #e0e0e0'
                                            }}>
                                                <img
                                                    src={formData.image}
                                                    alt="Preview"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                        objectFit: 'contain'
                                                    }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Image URL Tips */}
                                    <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight="medium" gutterBottom display="block">
                                            💡 Tips Hosting Gambar Gratis:
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                            <Typography component="li" variant="caption" color="text.secondary">
                                                <strong>Imgur.com</strong> - Upload & copy direct link
                                            </Typography>
                                            <Typography component="li" variant="caption" color="text.secondary">
                                                <strong>Firebase Storage</strong> - Professional hosting
                                            </Typography>
                                            <Typography component="li" variant="caption" color="text.secondary">
                                                <strong>Cloudinary.com</strong> - Advanced image management
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <FormControl fullWidth required>
                                            <InputLabel sx={{
                                                '&.Mui-focused': {
                                                    color: '#bc5a3c',
                                                },
                                            }}>Kategori</InputLabel>
                                            <Select
                                                name="category"
                                                value={formData.category}
                                                label="Kategori"
                                                onChange={handleFormSelectChange}
                                                sx={{
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#e0e0e0',
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                }}
                                            >
                                                {categories.filter(cat => cat !== 'All').map((cat) => (
                                                    <MenuItem key={cat} value={cat.toLowerCase()}>
                                                        {cat}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <TextField
                                            name="price"
                                            label="Harga"
                                            type="number"
                                            fullWidth
                                            required
                                            value={formData.price}
                                            onChange={handleFormInputChange}
                                            InputProps={{
                                                inputProps: { min: 0 },
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        IDR
                                                    </InputAdornment>
                                                ),
                                            }}
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '&:hover fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                },
                                                '& .MuiInputLabel-root.Mui-focused': {
                                                    color: '#bc5a3c',
                                                },
                                            }}
                                        />

                                        <TextField
                                            name="rating"
                                            label="Rating (Opsional)"
                                            type="number"
                                            fullWidth
                                            value={formData.rating}
                                            onChange={handleFormInputChange}
                                            InputProps={{
                                                inputProps: { min: 0, max: 5, step: 0.1 },
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <StarIcon sx={{ color: '#bc5a3c', fontSize: 18 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '&:hover fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                },
                                                '& .MuiInputLabel-root.Mui-focused': {
                                                    color: '#bc5a3c',
                                                },
                                            }}
                                            helperText="Rating 0-5 (contoh: 4.5)"
                                        />

                                        <TextField
                                            name="reviews"
                                            label="Jumlah Review (Opsional)"
                                            type="number"
                                            fullWidth
                                            value={formData.reviews}
                                            onChange={handleFormInputChange}
                                            InputProps={{
                                                inputProps: { min: 0 },
                                            }}
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    '&:hover fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#bc5a3c',
                                                    },
                                                },
                                                '& .MuiInputLabel-root.Mui-focused': {
                                                    color: '#bc5a3c',
                                                },
                                            }}
                                            helperText="Jumlah total review pelanggan"
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, bgcolor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
                    <Button
                        onClick={() => setOpenFormDialog(false)}
                        disabled={formSubmitting}
                        variant="outlined"
                        sx={{
                            borderColor: '#bdbdbd',
                            color: '#757575',
                            '&:hover': {
                                borderColor: '#757575',
                                bgcolor: 'rgba(117, 117, 117, 0.04)'
                            }
                        }}
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleSubmitForm}
                        variant="contained"
                        disabled={formSubmitting}
                        sx={{
                            bgcolor: '#bc5a3c',
                            '&:hover': { bgcolor: '#a04e34' },
                            minWidth: 120
                        }}
                    >
                        {formSubmitting ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={20} color="inherit" />
                                <span>Menyimpan...</span>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {formMode === 'add' ? <AddIcon /> : <EditIcon />}
                                <span>{formMode === 'add' ? 'Simpan Item' : 'Update Item'}</span>
                            </Box>
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

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