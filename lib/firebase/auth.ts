import { auth } from './config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

export const adminLogin = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
};

export const adminLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};