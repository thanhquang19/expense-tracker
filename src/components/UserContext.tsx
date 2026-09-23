'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';

interface User {
    id: number;
    name: string;
    email: string;
    firebaseUid: string;
}

interface UserContextType {
    user: User | null;
    loading: boolean;
    // Sets the profile optimistically right after sign-in/sign-up/profile edit,
    // instead of waiting on the async onAuthStateChanged + DB round trip below.
    setUser: (user: User | null) => void;
    signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Looks up the app's bigint-keyed `user` profile row linked to a Firebase account.
// Requires the caller to already hold a valid Firebase session (RLS restricts this
// to the caller's own row via auth.jwt()->>'sub').
async function fetchProfile(firebaseUid: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('user')
        .select('id, user_name, user_email, firebase_uid')
        .eq('firebase_uid', firebaseUid)
        .single();

    if (error || !data) return null;
    return { id: data.id, name: data.user_name, email: data.user_email, firebaseUid: data.firebase_uid };
}

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUserState] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUserState(null);
                setLoading(false);
                return;
            }
            const profile = await fetchProfile(firebaseUser.uid);
            setUserState(profile);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const setUser = useCallback((newUser: User | null) => {
        setUserState(newUser);
    }, []);

    const signOut = useCallback(async () => {
        await firebaseSignOut(auth);
        setUserState(null);
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, setUser, signOut }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
