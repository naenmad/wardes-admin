'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    InputAdornment,
    Grid,
    Chip,
    Switch,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Card,
    CardMedia,
    CardContent,
    FormControlLabel,
    Skeleton,
    Alert,
    CircularProgress,
    Autocomplete,
    Pagination,
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Link as LinkIcon,
    SortByAlpha as SortByAlphaIcon,
    Image as ImageIcon,
    CheckCircleOutline as ActiveIcon,
    HighlightOff as InactiveIcon,
    ShoppingCart, // Added missing import
} from '@mui/icons-material';
import { collection, query, getDocs, doc, deleteDoc, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config'; // Removed storage import
import { useRouter } from 'next/navigation';
import AOS from 'aos';

// Interface untuk menu item
interface MenuOption {
    id: string;
    name: string;
    category: string;
    price: number;
    image?: string;
}

// Updated Promotion interface
interface Promotion {
    id: string;
    actionLink?: string;
    active: boolean;
    image?: string;
    order?: number;
    translations: {
        en?: {
            title: string;
            description: string;
        };
        id?: {
            title: string;
            description: string;
        };
    };
    menuItemIds?: string[];
}

// Simplified FormData for the new structure
interface PromotionFormData {
    idTitle: string;
    idDescription: string;
    enTitle: string;
    enDescription: string;
    actionLink: string;
    imageUrl: string; // Changed from 'image' to 'imageUrl' for clarity
    order: string;
    active: boolean;
    selectedMenuItems: MenuOption[];
}

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openFormDialog, setOpenFormDialog] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [formSubmitting, setFormSubmitting] = useState(false);

    // States untuk menu options
    const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
    const [menuLoading, setMenuLoading] = useState(false);

    const itemsPerPage = 8;
    const router = useRouter();

    const initialFormData: PromotionFormData = {
        idTitle: '',
        idDescription: '',
        enTitle: '',
        enDescription: '',
        actionLink: '',
        imageUrl: '', // Changed from 'image' to 'imageUrl'
        order: '1',
        active: true,
        selectedMenuItems: [],
    };
    const [formData, setFormData] = useState<PromotionFormData>(initialFormData);

    // Initialize AOS
    useEffect(() => {
        AOS.init({
            duration: 800,
            once: true
        });
    }, []);

    // Helper function untuk mendapatkan nama menu yang dilokalkan
    const getLocalizedMenuName = (item: any, lang: 'id' | 'en' = 'id') => {
        return item.translations?.[lang]?.name || item.translations?.en?.name || item.name || 'Unknown Item';
    };

    // Fetch menu options untuk autocomplete
    const fetchMenuOptions = useCallback(async () => {
        setMenuLoading(true);
        try {
            const q = query(collection(db, 'menu'), orderBy('category', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetchedMenus: MenuOption[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const menuOption: MenuOption = {
                    id: doc.id,
                    name: getLocalizedMenuName(data, 'id'),
                    category: data.category || 'Uncategorized',
                    price: data.price || 0,
                    image: data.image,
                };
                fetchedMenus.push(menuOption);
            });

            setMenuOptions(fetchedMenus);
        } catch (error) {
            console.error('Error fetching menu options:', error);
        } finally {
            setMenuLoading(false);
        }
    }, []);

    // Load menu options saat dialog form dibuka
    useEffect(() => {
        if (openFormDialog) {
            fetchMenuOptions();
        }
    }, [openFormDialog, fetchMenuOptions]);

    const getLocalizedTitle = (promo: Promotion, lang: 'id' | 'en' = 'id') => {
        return promo.translations?.[lang]?.title || promo.translations?.en?.title || 'No Title';
    };

    const getLocalizedDescription = (promo: Promotion, lang: 'id' | 'en' = 'id') => {
        return promo.translations?.[lang]?.description || promo.translations?.en?.description || 'No Description';
    };

    // Fetch promotions
    const fetchPromotions = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'promotions'), orderBy('order', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetchedPromotions: Promotion[] = [];

            querySnapshot.forEach((doc) => {
                fetchedPromotions.push({
                    id: doc.id,
                    ...doc.data()
                } as Promotion);
            });

            setPromotions(fetchedPromotions);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching promotions:', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPromotions();
    }, [fetchPromotions]);

    // Filter promotions
    useEffect(() => {
        let result = promotions;

        if (searchTerm) {
            result = result.filter(promo =>
                getLocalizedTitle(promo, 'id').toLowerCase().includes(searchTerm.toLowerCase()) ||
                getLocalizedTitle(promo, 'en').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredPromotions(result);
        setCurrentPage(1);
    }, [searchTerm, promotions]);

    // Pagination
    const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
        window.scrollTo(0, 0);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPromotions.slice(indexOfFirstItem, indexOfLastItem);
    const pageCount = Math.ceil(filteredPromotions.length / itemsPerPage);

    // Promotion actions
    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, promotion: Promotion) => {
        setAnchorEl(event.currentTarget);
        setSelectedPromotion(promotion);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleAddNew = () => {
        setFormMode('add');
        setFormData(initialFormData);
        setFormError('');
        setFormSuccess('');
        setOpenFormDialog(true);
    };

    const handleEdit = () => {
        if (selectedPromotion) {
            setFormMode('edit');

            // Convert menuItemIds ke selectedMenuItems
            const selectedMenuItems: MenuOption[] = [];
            if (selectedPromotion.menuItemIds) {
                selectedPromotion.menuItemIds.forEach(menuId => {
                    const foundMenu = menuOptions.find(menu => menu.id === menuId);
                    if (foundMenu) {
                        selectedMenuItems.push(foundMenu);
                    }
                });
            }

            setFormData({
                idTitle: selectedPromotion.translations?.id?.title || '',
                idDescription: selectedPromotion.translations?.id?.description || '',
                enTitle: selectedPromotion.translations?.en?.title || '',
                enDescription: selectedPromotion.translations?.en?.description || '',
                actionLink: selectedPromotion.actionLink || '',
                imageUrl: selectedPromotion.image || '', // Changed from 'image' to 'imageUrl'
                order: selectedPromotion.order?.toString() || '1',
                active: selectedPromotion.active,
                selectedMenuItems: selectedMenuItems,
            });
            setFormError('');
            setFormSuccess('');
            setOpenFormDialog(true);
        }
        handleCloseMenu();
    };

    const handleDeleteConfirm = () => {
        setOpenDeleteDialog(true);
        handleCloseMenu();
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
        setSelectedPromotion(null);
    };

    const handleDelete = async () => {
        if (selectedPromotion) {
            try {
                setLoading(true);
                // No need to delete from storage since we're using URLs
                await deleteDoc(doc(db, 'promotions', selectedPromotion.id));
                setFormSuccess(`Promotion "${getLocalizedTitle(selectedPromotion)}" deleted.`);
                fetchPromotions();
                setOpenDeleteDialog(false);
                setSelectedPromotion(null);
            } catch (error) {
                console.error('Error deleting promotion:', error);
                setFormError('Failed to delete promotion.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleToggleActive = async (promotion: Promotion) => {
        try {
            const promotionRef = doc(db, 'promotions', promotion.id);
            await updateDoc(promotionRef, {
                active: !promotion.active
            });
            fetchPromotions();
        } catch (error) {
            console.error('Error updating promotion status:', error);
        }
    };

    // Form handlers
    const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // Handler untuk menu selection
    const handleMenuSelectionChange = (event: any, newValue: MenuOption[]) => {
        setFormData(prev => ({
            ...prev,
            selectedMenuItems: newValue
        }));
    };

    // Function to validate image URL
    const isValidImageUrl = (url: string): boolean => {
        if (!url) return true; // Empty URL is allowed
        try {
            new URL(url);
            return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.includes('firebasestorage.googleapis.com') || url.includes('cloudinary.com') || url.includes('imgur.com');
        } catch {
            return false;
        }
    };

    const handleSubmitForm = async () => {
        setFormSubmitting(true);
        setFormError('');
        setFormSuccess('');

        if (!formData.idTitle) {
            setFormError('Judul (ID) wajib diisi.');
            setFormSubmitting(false);
            return;
        }

        if (formData.imageUrl && !isValidImageUrl(formData.imageUrl)) {
            setFormError('URL gambar tidak valid. Pastikan URL mengarah ke file gambar yang valid.');
            setFormSubmitting(false);
            return;
        }

        try {
            const promotionData: Omit<Promotion, 'id'> = {
                translations: {
                    id: {
                        title: formData.idTitle,
                        description: formData.idDescription,
                    },
                    en: {
                        title: formData.enTitle || formData.idTitle,
                        description: formData.enDescription || formData.idDescription,
                    },
                },
                actionLink: formData.actionLink,
                image: formData.imageUrl, // Use the URL directly
                order: parseInt(formData.order, 10) || 1,
                active: formData.active,
                menuItemIds: formData.selectedMenuItems.map(item => item.id),
            };

            if (formMode === 'add') {
                await addDoc(collection(db, 'promotions'), promotionData);
                setFormSuccess('Promosi berhasil ditambahkan!');
            } else if (formMode === 'edit' && selectedPromotion) {
                await updateDoc(doc(db, 'promotions', selectedPromotion.id), promotionData);
                setFormSuccess('Promosi berhasil diperbarui!');
            }

            fetchPromotions();
            setOpenFormDialog(false);
        } catch (error) {
            console.error('Error saving promotion:', error);
            setFormError('Gagal menyimpan promosi. Coba lagi.');
        } finally {
            setFormSubmitting(false);
        }
    };

    // Render loading skeletons
    const renderSkeletons = () => {
        return Array(itemsPerPage).fill(0).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`} data-aos="fade-up">
                <Card sx={{
                    height: 540, // Same as menu - tingkatkan skeleton height
                    width: '100%',
                    maxWidth: 300,
                    minWidth: 280,
                    margin: '0 auto'
                }}>
                    <Skeleton variant="rectangular" height={280} width="100%" /> {/* Perfect square skeleton */}
                    <CardContent sx={{ height: 260, width: '100%' }}>
                        <Skeleton variant="text" height={30} width="90%" sx={{ mb: 1 }} />
                        <Skeleton variant="text" height={20} width="100%" />
                        <Skeleton variant="text" width="85%" sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
                        <Box sx={{ flexGrow: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Skeleton variant="text" width="30%" />
                            <Skeleton variant="circular" width={30} height={30} />
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
                    Kelola Promosi
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Buat dan atur promosi untuk ditampilkan.
                </Typography>
            </Box>

            <Paper sx={{ p: 2, mb: 4 }} data-aos="fade-up">
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={9}>
                        <TextField
                            fullWidth
                            placeholder="Cari berdasarkan judul promosi..."
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
                    <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddNew}
                            sx={{ bgcolor: '#bc5a3c', '&:hover': { bgcolor: '#a04e34' } }}
                        >
                            Promosi Baru
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Update bagian Grid container untuk promotion cards */}
            <Grid container spacing={3}>
                {loading ? (
                    renderSkeletons()
                ) : currentItems.length > 0 ? (
                    currentItems.map((promo) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={promo.id} data-aos="fade-up">
                            <Card
                                sx={{
                                    height: 540, // Same as menu - tingkatkan total height card
                                    width: '100%',
                                    maxWidth: 300,
                                    minWidth: 280,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    margin: '0 auto',
                                    position: 'relative',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
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
                                    {promo.image ? (
                                        <CardMedia
                                            component="img"
                                            height="280"
                                            image={promo.image}
                                            alt={getLocalizedTitle(promo)}
                                            sx={{
                                                objectFit: 'cover',
                                                objectPosition: 'center',
                                                width: '100%',
                                                height: '100%',
                                                display: 'block' // Ensure proper display
                                            }}
                                            onError={(e) => {
                                                // Handle broken image URLs
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <Box sx={{
                                            height: '100%',
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'grey.200',
                                            flexDirection: 'column'
                                        }}>
                                            <ImageIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                                            <Typography color="text.secondary" variant="caption" sx={{ mt: 1 }}>
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
                                                bgcolor: 'rgba(255,255,255,1)'
                                            }
                                        }}
                                        onClick={(e) => handleMenuClick(e, promo)}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>

                                    <Chip
                                        icon={promo.active ? <ActiveIcon /> : <InactiveIcon />}
                                        label={promo.active ? 'Aktif' : 'Nonaktif'}
                                        size="small"
                                        color={promo.active ? 'success' : 'default'}
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                            height: 24,
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                </Box>

                                {/* Content section - Fixed height */}
                                <CardContent
                                    sx={{
                                        flexGrow: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        p: 2,
                                        height: 260, // Same as menu - sesuaikan content height
                                        width: '100%',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Title - Fixed height */}
                                    <Typography
                                        variant="h6"
                                        fontWeight="medium"
                                        sx={{
                                            height: 32, // Fixed height untuk title
                                            width: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 1,
                                            WebkitBoxOrient: 'vertical',
                                            mb: 1,
                                            flexShrink: 0
                                        }}
                                        title={getLocalizedTitle(promo)}
                                    >
                                        {getLocalizedTitle(promo)}
                                    </Typography>

                                    {/* Description - Fixed height */}
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            height: 60, // Fixed height untuk description (3 lines)
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
                                        title={getLocalizedDescription(promo)}
                                    >
                                        {getLocalizedDescription(promo)}
                                    </Typography>

                                    {/* Action Link - Fixed height */}
                                    <Box sx={{ height: 24, width: '100%', mb: 1, flexShrink: 0 }}>
                                        {promo.actionLink ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <LinkIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', flexShrink: 0 }} />
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {promo.actionLink}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box /> // Empty box to maintain spacing
                                        )}
                                    </Box>

                                    {/* Order info - Fixed height */}
                                    <Box sx={{
                                        height: 20,
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: 'text.secondary',
                                        mb: 1,
                                        flexShrink: 0
                                    }}>
                                        <SortByAlphaIcon fontSize="small" sx={{ mr: 0.5, flexShrink: 0 }} />
                                        <Typography variant="caption">
                                            Urutan: {promo.order || 'N/A'}
                                        </Typography>
                                    </Box>

                                    {/* Menu items info - Fixed height */}
                                    <Box sx={{ height: 20, width: '100%', mb: 1, flexShrink: 0 }}>
                                        {promo.menuItemIds && promo.menuItemIds.length > 0 && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                Item Terkait: {promo.menuItemIds.length}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Spacer untuk push toggle ke bottom */}
                                    <Box sx={{ flexGrow: 1, width: '100%' }} />

                                    {/* Toggle switch - Fixed at bottom */}
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        height: 40, // Fixed height - sama seperti menu price section
                                        width: '100%',
                                        flexShrink: 0,
                                        alignItems: 'center'
                                    }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={promo.active}
                                                    onChange={() => handleToggleActive(promo)}
                                                    size="small"
                                                />
                                            }
                                            labelPlacement="start"
                                            label={
                                                <Typography variant="caption">
                                                    {promo.active ? "Aktif" : "Nonaktif"}
                                                </Typography>
                                            }
                                            sx={{
                                                mr: 0,
                                                '& .MuiFormControlLabel-label': {
                                                    fontSize: '0.75rem'
                                                }
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
                            <Typography variant="h6">Tidak ada promosi ditemukan</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Coba ubah kriteria pencarian atau tambahkan promosi baru.
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={() => setSearchTerm('')}
                                sx={{ mr: 1 }}
                            >
                                Clear Filter
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleAddNew}
                                sx={{ bgcolor: '#bc5a3c', '&:hover': { bgcolor: '#a04e34' } }}
                            >
                                Promosi Baru
                            </Button>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {filteredPromotions.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                    <Pagination
                        count={pageCount}
                        page={currentPage}
                        onChange={handleChangePage}
                        color="primary"
                    />
                </Box>
            )}

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
                <MenuItem onClick={handleEdit}><EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit</MenuItem>
                <MenuItem onClick={handleDeleteConfirm} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Hapus</MenuItem>
            </Menu>

            <Dialog open={openDeleteDialog} onClose={handleCancelDelete}>
                <DialogTitle>Konfirmasi Hapus</DialogTitle>
                <DialogContent>
                    <Typography>
                        Anda yakin ingin menghapus promosi "{selectedPromotion ? getLocalizedTitle(selectedPromotion) : ''}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete}>Batal</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={20} color="inherit" /> : "Hapus"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ENHANCED FORM DIALOG - COMPLETELY REDESIGNED */}
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
                                {formMode === 'add' ? 'Buat Promosi Baru' : 'Edit Promosi'}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {formMode === 'add'
                                    ? 'Tambahkan promosi menarik untuk pelanggan Anda'
                                    : 'Perbarui informasi promosi yang sudah ada'
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
                                        name="idTitle"
                                        label="Judul Promosi"
                                        fullWidth
                                        required
                                        value={formData.idTitle}
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
                                        name="enTitle"
                                        label="Judul (English)"
                                        fullWidth
                                        value={formData.enTitle}
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
                                        helperText="Opsional - akan menggunakan judul ID jika kosong"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        name="idDescription"
                                        label="Deskripsi Promosi"
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
                                    Gambar & Pengaturan
                                </Typography>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'medium' }}>
                                            URL Gambar Promosi
                                        </Typography>
                                        <TextField
                                            name="imageUrl"
                                            label="Masukkan URL Gambar"
                                            fullWidth
                                            value={formData.imageUrl}
                                            onChange={handleFormInputChange}
                                            placeholder="https://example.com/promo-image.jpg"
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
                                            error={formData.imageUrl ? !isValidImageUrl(formData.imageUrl) : false}
                                            helperText={
                                                formData.imageUrl && !isValidImageUrl(formData.imageUrl)
                                                    ? "URL gambar tidak valid"
                                                    : "Pastikan URL mengarah langsung ke file gambar"
                                            }
                                        />
                                    </Box>

                                    {/* Enhanced Image Preview */}
                                    {formData.imageUrl && isValidImageUrl(formData.imageUrl) && (
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
                                                    src={formData.imageUrl}
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
                                        <TextField
                                            name="actionLink"
                                            label="Link Aksi"
                                            fullWidth
                                            value={formData.actionLink}
                                            onChange={handleFormInputChange}
                                            placeholder="/promo/detail-promo"
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
                                            helperText="URL yang akan dibuka saat promosi diklik"
                                        />

                                        <TextField
                                            name="order"
                                            label="Urutan Tampilan"
                                            type="number"
                                            fullWidth
                                            value={formData.order}
                                            onChange={handleFormInputChange}
                                            InputProps={{
                                                inputProps: { min: 1 },
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SortByAlphaIcon sx={{ color: '#bc5a3c' }} />
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
                                            helperText="Nomor urut untuk mengurutkan promosi"
                                        />

                                        <Paper sx={{ p: 2, bgcolor: 'rgba(188, 90, 60, 0.05)', border: '1px solid rgba(188, 90, 60, 0.2)' }}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        name="active"
                                                        checked={formData.active}
                                                        onChange={handleFormInputChange}
                                                        sx={{
                                                            '& .MuiSwitch-switchBase.Mui-checked': {
                                                                color: '#bc5a3c',
                                                            },
                                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                                backgroundColor: '#bc5a3c',
                                                            },
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            Status Promosi
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formData.active ? 'Promosi akan ditampilkan' : 'Promosi tidak akan ditampilkan'}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </Paper>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Section 3: Related Menu Items */}
                        <Paper sx={{ p: 3, bgcolor: '#fafafa', border: '1px solid #e0e0e0' }}>
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
                                    3
                                </Box>
                                <Typography variant="h6" fontWeight="medium">
                                    Item Menu Terkait
                                </Typography>
                            </Box>

                            <Autocomplete
                                multiple
                                options={menuOptions}
                                value={formData.selectedMenuItems}
                                onChange={handleMenuSelectionChange}
                                loading={menuLoading}
                                getOptionLabel={(option) => option.name}
                                groupBy={(option) => option.category}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Pilih item menu untuk promosi ini..."
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
                                        helperText="Pilih satu atau lebih item menu yang termasuk dalam promosi ini (opsional)"
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <>
                                                    <InputAdornment position="start">
                                                        <ShoppingCart sx={{ color: '#bc5a3c' }} />
                                                    </InputAdornment>
                                                    {params.InputProps.startAdornment}
                                                </>
                                            ),
                                            endAdornment: (
                                                <>
                                                    {menuLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} key={option.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
                                            {option.image ? (
                                                <Box
                                                    component="img"
                                                    src={option.image}
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: 1,
                                                        mr: 2,
                                                        objectFit: 'cover',
                                                        border: '1px solid #e0e0e0'
                                                    }}
                                                />
                                            ) : (
                                                <Box sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 1,
                                                    mr: 2,
                                                    bgcolor: '#f5f5f5',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '1px solid #e0e0e0'
                                                }}>
                                                    <ImageIcon sx={{ color: '#bdbdbd' }} />
                                                </Box>
                                            )}
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {option.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip
                                                        label={option.category}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                                    />
                                                    <Typography variant="caption" color="#bc5a3c" fontWeight="medium">
                                                        IDR {option.price.toLocaleString()}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            variant="filled"
                                            label={`${option.name}`}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(188, 90, 60, 0.1)',
                                                color: '#bc5a3c',
                                                '& .MuiChip-deleteIcon': {
                                                    color: '#bc5a3c'
                                                }
                                            }}
                                            {...getTagProps({ index })}
                                            key={option.id}
                                        />
                                    ))
                                }
                                sx={{ width: '100%' }}
                            />

                            {/* Selected items preview */}
                            {formData.selectedMenuItems.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                        Item Terpilih ({formData.selectedMenuItems.length}):
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {formData.selectedMenuItems.map((item) => (
                                            <Paper key={item.id} sx={{ p: 1, bgcolor: 'white', border: '1px solid #e0e0e0' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {item.image && (
                                                        <Box
                                                            component="img"
                                                            src={item.image}
                                                            sx={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 0.5,
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                    )}
                                                    <Typography variant="caption" fontWeight="medium">
                                                        {item.name}
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        ))}
                                    </Box>
                                </Box>
                            )}
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
                                <span>{formMode === 'add' ? 'Simpan Promosi' : 'Update Promosi'}</span>
                            </Box>
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}