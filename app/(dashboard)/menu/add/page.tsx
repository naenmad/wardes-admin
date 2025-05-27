'use client';

import React, { useState } from 'react';
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
    MenuItem as MuiMenuItem, // Renamed to avoid conflict with our MenuItem interface
    CircularProgress,
    Alert
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Re-using categories from the menu list or define them here
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

export default function AddMenuPage() {
    const router = useRouter();
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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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

            const newMenuItem: any = {
                category: formData.category,
                image: formData.image,
                price: price,
                translations: {
                    id: {
                        name: formData.idName,
                        description: formData.idDescription,
                    },
                    en: {
                        name: formData.enName || formData.idName, // Fallback EN name to ID name if empty
                        description: formData.enDescription || formData.idDescription, // Fallback EN desc to ID desc
                    },
                },
                createdAt: serverTimestamp(), // Optional: for tracking
            };

            if (formData.rating) {
                const ratingValue = parseFloat(formData.rating);
                if (!isNaN(ratingValue)) newMenuItem.rating = ratingValue;
            }
            if (formData.reviews) {
                const reviewsValue = parseInt(formData.reviews, 10);
                if (!isNaN(reviewsValue)) newMenuItem.reviews = reviewsValue;
            }

            await addDoc(collection(db, 'menu'), newMenuItem);
            setSuccess('Item menu berhasil ditambahkan!');
            setFormData({ // Reset form
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
            setTimeout(() => router.push('/menu'), 1500);
        } catch (err) {
            console.error("Error adding menu item:", err);
            setError('Gagal menambahkan item menu. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

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
                Tambah Item Menu Baru
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
                                {loading ? 'Menyimpan...' : 'Simpan Item Menu'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Box>
    );
}