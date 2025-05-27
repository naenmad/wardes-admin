// filepath: contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import { Box, CssBaseline } from '@mui/material';
import ThemeRegistry from '@/components/ThemeRegistry';
import 'aos/dist/aos.css';
import AOS from 'aos';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
});

// Auth provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sign in function
    const signIn = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard');
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    };

    // Sign out function
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook for using auth context
export const useAuth = () => useContext(AuthContext);

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Initialize AOS
    useEffect(() => {
        if (typeof window !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true,
            });
        }
    }, []);

    return (
        <html lang="en">
            <body className={inter.className}>
                <ThemeRegistry>
                    <CssBaseline />
                    <AuthProvider>
                        <Box>{children}</Box>
                    </AuthProvider>
                </ThemeRegistry>
            </body>
        </html>
    );
}