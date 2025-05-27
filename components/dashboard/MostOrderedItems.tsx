'use client';

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { db } from '@/lib/firebase/config';
import {
    collection,
    query,
    getDocs,
    doc,
    getDoc,
    Timestamp,
    where,
    orderBy
} from 'firebase/firestore';

type MenuItem = {
    id: string;
    name: string;
    price: number;
    image: string;
    orderCount: number;
};

export default function MostOrderedItems() {
    const [loading, setLoading] = useState(true);
    const [mostOrderedItems, setMostOrderedItems] = useState<MenuItem[]>([]);

    useEffect(() => {
        fetchMostOrderedItems();
    }, []);

    async function fetchMostOrderedItems() {
        try {
            setLoading(true);

            // Get orders from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startTimestamp = Timestamp.fromDate(thirtyDaysAgo);

            const ordersQuery = query(
                collection(db, "orders"),
                where("createdAt", ">=", startTimestamp),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(ordersQuery);

            // Count occurrences of each menu item
            const itemCounts: Record<string, { count: number, name: string, price: number }> = {};

            querySnapshot.forEach((orderDoc) => {
                const orderData = orderDoc.data();
                if (orderData.items && Array.isArray(orderData.items)) {
                    orderData.items.forEach((item: any) => {
                        const menuItemId = item.menuItemId;
                        if (menuItemId) {
                            if (!itemCounts[menuItemId]) {
                                itemCounts[menuItemId] = {
                                    count: 0,
                                    name: item.name || 'Unknown Item',
                                    price: item.price || 0
                                };
                            }
                            itemCounts[menuItemId].count += item.quantity || 1;
                        }
                    });
                }
            });

            // Convert to array and sort by count
            const sortedItemIds = Object.entries(itemCounts)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 4)
                .map(([id, data]) => ({
                    id,
                    name: data.name,
                    price: data.price,
                    count: data.count
                }));

            // Fetch complete menu item details for images and accurate pricing
            const items: MenuItem[] = [];

            for (const item of sortedItemIds) {
                try {
                    const menuItemRef = doc(db, "menu", item.id);
                    const menuItemSnap = await getDoc(menuItemRef);

                    if (menuItemSnap.exists()) {
                        const data = menuItemSnap.data();
                        const name = data.translations?.id?.name || data.translations?.en?.name || item.name;

                        items.push({
                            id: menuItemSnap.id,
                            name: name,
                            price: data.price || item.price,
                            image: data.image || '/images/food-placeholder.jpg',
                            orderCount: item.count
                        });
                    } else {
                        // If menu item doesn't exist in menu collection, use order data
                        items.push({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            image: '/images/food-placeholder.jpg',
                            orderCount: item.count
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching menu item ${item.id}:`, error);
                    // Use fallback data from orders
                    items.push({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: '/images/food-placeholder.jpg',
                        orderCount: item.count
                    });
                }
            }

            setMostOrderedItems(items);
        } catch (error) {
            console.error("Error fetching most ordered items:", error);
            // Fallback to empty array instead of sample data
            setMostOrderedItems([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
                Most Ordered Food
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Top items from last 30 days
            </Typography>

            <Box sx={{ mt: 3 }}>
                {loading ? (
                    <Typography>Loading...</Typography>
                ) : mostOrderedItems.length > 0 ? (
                    mostOrderedItems.map((item, index) => (
                        <Box
                            key={item.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                py: 1.5,
                                borderBottom: '1px solid #f0f0f0',
                                '&:last-child': {
                                    borderBottom: 'none',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        bgcolor: '#f5f5f5',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        mr: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/images/food-placeholder.jpg';
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                        {item.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {item.orderCount} orders
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="body2" fontWeight="medium" color="primary">
                                IDR {item.price.toLocaleString()}
                            </Typography>
                        </Box>
                    ))
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            No order data available
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}