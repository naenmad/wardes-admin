'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem as MuiMenuItem,
    CircularProgress,
    Alert
} from '@mui/material';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const categories = ['Minuman', 'Makanan', 'Cemilan', 'Dessert']; // Adjust as needed

interface MenuItemFormData {
    category: string;
    image: string;
    price: string;
    rating?: string;
    reviews?: string;
    idName: string;
    idDescription: string;
    enName: string;
    enDescription: string;
}

export default function EditMenuPage() {
    const router = useRouter();
    const params = useParams();
    const itemId = params?.id as string;

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
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchMenuItem = useCallback(async () => {
        if (!itemId) {
            setError("ID Item tidak valid.");
            setPageLoading(false);
            return;
        }
        setPageLoading(true);
        try {
            const itemDocRef = doc(db, 'menu', itemId);
            const itemSnap = await getDoc(itemDocRef);

            if (itemSnap.exists()) {
                const itemData = itemSnap.data();
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
            } else {
                setError('Item menu tidak ditemukan.');
            }
        } catch (err) {
            console.error("Error fetching menu item:", err);
            setError('Gagal mengambil data item menu.');
        } finally {
            setPageLoading(false);
        }
    }, [itemId]);

    useEffect(() => {
        fetchMenuItem();
    }, [fetchMenuItem]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
        const { name, value } = e.target as { name: keyof MenuItemFormData, value: string };
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: any) => { // MUI SelectChangeEvent
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name as string]: value as string }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (!formData.idName || !formData.category || !formData.price) {
            setError("Nama (ID), Kategori, dan Harga wajib diisi.");
            setLoading(false);
            return;
        }

        try {
            const price = parseFloat(formData.price);
            if (isNaN(price)) {
                setError("Harga harus berupa angka.");
                setLoading(false);
                return;
            }

            const updatedMenuItem: any = {
                category: formData.category,
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
                updatedAt: serverTimestamp(), // Optional: for tracking updates
            };

            if (formData.rating) {
                const ratingValue = parseFloat(formData.rating);
                if (!isNaN(ratingValue)) updatedMenuItem.rating = ratingValue;
                else updatedMenuItem.rating = null; // Or remove if you prefer
            } else {
                updatedMenuItem.rating = null; // Or handle as per your logic for empty optional fields
            }

            if (formData.reviews) {
                const reviewsValue = parseInt(formData.reviews, 10);
                if (!isNaN(reviewsValue)) updatedMenuItem.reviews = reviewsValue;
                else updatedMenuItem.reviews = null;
            } else {
                updatedMenuItem.reviews = null;
            }


            const itemDocRef = doc(db, 'menu', itemId);
            await updateDoc(itemDocRef, updatedMenuItem);
            setSuccess('Item menu berhasil diperbarui!');
            setTimeout(() => router.push('/menu'), 1500);

        } catch (err) {
            console.error("Error updating menu item:", err);
            setError('Gagal memperbarui item menu. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Memuat data item...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/menu')}
                sx={{ mb: 2 }}
            >
                Kembali ke Daftar Menu
            </Button>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Edit Item Menu: {formData.idName || 'Memuat...'}
            </Typography>
            <Paper sx={{ p: 3 }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Nama Item (Bahasa Indonesia)"
                                name="idName"
                                value={formData.idName}
                                onChange={handleChange}
                                required
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Nama Item (Bahasa Inggris - Opsional)"
                                name="enName"
                                value={formData.enName}
                                onChange={handleChange}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Deskripsi (Bahasa Indonesia)"
                                name="idDescription"
                                value={formData.idDescription}
                                onChange={handleChange}
                                multiline
                                rows={3}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Deskripsi (Bahasa Inggris - Opsional)"
                                name="enDescription"
                                value={formData.enDescription}
                                onChange={handleChange}
                                multiline
                                rows={3}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth margin="normal" required>
                                <InputLabel id="category-label">Kategori</InputLabel>
                                <Select
                                    labelId="category-label"
                                    name="category"
                                    value={formData.category}
                                    label="Kategori"
                                    onChange={handleSelectChange}
                                >
                                    {categories.map((cat) => (
                                        <MuiMenuItem key={cat} value={cat.toLowerCase()}>
                                            {cat}
                                        </MuiMenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Harga (IDR)"
                                name="price"
                                type="number"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                margin="normal"
                                InputProps={{ inputProps: { min: 0 } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="URL Gambar"
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                margin="normal"
                                helperText="Masukkan URL publik ke gambar item."
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Rating (Opsional, cth: 4.5)"
                                name="rating"
                                type="number"
                                value={formData.rating}
                                onChange={handleChange}
                                margin="normal"
                                InputProps={{ inputProps: { step: 0.1, min: 0, max: 5 } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Jumlah Review (Opsional, cth: 150)"
                                name="reviews"
                                type="number"
                                value={formData.reviews}
                                onChange={handleChange}
                                margin="normal"
                                InputProps={{ inputProps: { min: 0 } }}
                            />
                        </Grid>

                        <Grid item xs={12} sx={{ mt: 2 }}>
                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                                sx={{ bgcolor: '#bc5a3c', '&:hover': { bgcolor: '#a04e34' } }}
                            >
                                {loading ? 'Memperbarui...' : 'Simpan Perubahan'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Box>
    );
}