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
                <Card sx={{ height: '100%' }}>
                    <Skeleton variant="rectangular" height={160} />
                    <CardContent>
                        <Skeleton variant="text" height={30} />
                        <Skeleton variant="text" />
                        <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            <Grid container spacing={3}>
                {loading ? (
                    renderSkeletons()
                ) : currentItems.length > 0 ? (
                    currentItems.map((promo) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={promo.id} data-aos="fade-up">
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ position: 'relative', height: 160, bgcolor: 'grey.200' }}>
                                    {promo.image ? (
                                        <CardMedia
                                            component="img"
                                            height="160"
                                            image={promo.image}
                                            alt={getLocalizedTitle(promo)}
                                            sx={{ objectFit: 'cover' }}
                                            onError={(e) => {
                                                // Handle broken image URLs
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ImageIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                                        </Box>
                                    )}
                                    <IconButton
                                        aria-label="actions"
                                        sx={{
                                            position: 'absolute', top: 8, right: 8,
                                            bgcolor: 'rgba(255,255,255,0.7)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
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
                                        sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(255,255,255,0.8)' }}
                                    />
                                </Box>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" fontWeight="medium" noWrap title={getLocalizedTitle(promo)}>
                                        {getLocalizedTitle(promo)}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        title={getLocalizedDescription(promo)}
                                        sx={{
                                            mb: 1, height: 40, overflow: 'hidden', textOverflow: 'ellipsis',
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                                        }}
                                    >
                                        {getLocalizedDescription(promo)}
                                    </Typography>
                                    {promo.actionLink && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <LinkIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {promo.actionLink}
                                            </Typography>
                                        </Box>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                        <SortByAlphaIcon fontSize="small" sx={{ mr: 0.5 }} />
                                        <Typography variant="caption">Urutan: {promo.order || 'N/A'}</Typography>
                                    </Box>
                                    {promo.menuItemIds && promo.menuItemIds.length > 0 && (
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Item Terkait: {promo.menuItemIds.length}
                                        </Typography>
                                    )}
                                </CardContent>
                                <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={promo.active}
                                                onChange={() => handleToggleActive(promo)}
                                                size="small"
                                            />
                                        }
                                        labelPlacement="start"
                                        label={<Typography variant="caption">{promo.active ? "Aktif" : "Nonaktif"}</Typography>}
                                        sx={{ mr: 0 }}
                                    />
                                </Box>
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

            {/* FORM DIALOG - BAGIAN YANG BERUBAH SIGNIFIKAN */}
            <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} fullWidth maxWidth="md">
                <DialogTitle>{formMode === 'add' ? 'Buat Promosi Baru' : 'Edit Promosi'}</DialogTitle>
                <DialogContent>
                    {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                    {formSuccess && <Alert severity="success" sx={{ mb: 2 }}>{formSuccess}</Alert>}
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                name="idTitle"
                                label="Judul (Bahasa Indonesia)"
                                fullWidth
                                required
                                value={formData.idTitle}
                                onChange={handleFormInputChange}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                name="enTitle"
                                label="Judul (Bahasa Inggris - Opsional)"
                                fullWidth
                                value={formData.enTitle}
                                onChange={handleFormInputChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="idDescription"
                                label="Deskripsi (Bahasa Indonesia)"
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.idDescription}
                                onChange={handleFormInputChange}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="enDescription"
                                label="Deskripsi (Bahasa Inggris - Opsional)"
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.enDescription}
                                onChange={handleFormInputChange}
                            />
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <TextField
                                name="actionLink"
                                label="Link Aksi (cth: /promo/detail-promo)"
                                fullWidth
                                value={formData.actionLink}
                                onChange={handleFormInputChange}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                name="order"
                                label="Urutan Tampilan"
                                type="number"
                                fullWidth
                                value={formData.order}
                                onChange={handleFormInputChange}
                                InputProps={{ inputProps: { min: 1 } }}
                            />
                        </Grid>

                        {/* BAGIAN GAMBAR - DIUBAH DARI UPLOAD KE URL INPUT */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Gambar Promosi
                            </Typography>
                            <TextField
                                name="imageUrl"
                                label="URL Gambar"
                                fullWidth
                                value={formData.imageUrl}
                                onChange={handleFormInputChange}
                                placeholder="https://example.com/image.jpg"
                                helperText="Masukkan URL langsung ke gambar. Contoh: https://domain.com/gambar.jpg"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LinkIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                error={formData.imageUrl ? !isValidImageUrl(formData.imageUrl) : false}
                            />

                            {/* Preview gambar jika URL valid */}
                            {formData.imageUrl && isValidImageUrl(formData.imageUrl) && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                        Preview:
                                    </Typography>
                                    <Box sx={{
                                        border: '1px dashed grey',
                                        borderRadius: 1,
                                        p: 1,
                                        maxWidth: 300,
                                        height: 150,
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
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

                            {/* Contoh URL yang bisa digunakan */}
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Tips: Anda bisa menggunakan layanan hosting gambar gratis seperti:
                                </Typography>
                                <Box component="ul" sx={{ mt: 0.5, pl: 2 }}>
                                    <Typography component="li" variant="caption" color="text.secondary">
                                        Imgur.com - Upload gambar dan copy direct link
                                    </Typography>
                                    <Typography component="li" variant="caption" color="text.secondary">
                                        Firebase Storage - Gunakan URL dari Firebase Console
                                    </Typography>
                                    <Typography component="li" variant="caption" color="text.secondary">
                                        Cloudinary.com - Service hosting gambar professional
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Item Menu Terkait
                            </Typography>
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
                                        helperText="Pilih satu atau lebih item menu yang termasuk dalam promosi ini"
                                        InputProps={{
                                            ...params.InputProps,
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
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                            {option.image && (
                                                <Box
                                                    component="img"
                                                    src={option.image}
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 1,
                                                        mr: 2,
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                            )}
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {option.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.category} • IDR {option.price.toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            variant="outlined"
                                            label={`${option.name} (IDR ${option.price.toLocaleString()})`}
                                            size="small"
                                            {...getTagProps({ index })}
                                            key={option.id}
                                        />
                                    ))
                                }
                                sx={{ width: '100%' }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        name="active"
                                        checked={formData.active}
                                        onChange={handleFormInputChange}
                                    />
                                }
                                label="Aktifkan Promosi"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenFormDialog(false)} disabled={formSubmitting}>
                        Batal
                    </Button>
                    <Button onClick={handleSubmitForm} variant="contained" color="primary" disabled={formSubmitting}>
                        {formSubmitting ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            formMode === 'add' ? 'Simpan Promosi' : 'Update Promosi'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}