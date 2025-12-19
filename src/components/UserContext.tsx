'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface UserContextType {
    user: User | null;
    updateUser: (user: User | null) => void;
    loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user from localStorage on mount
        const storedUser = localStorage.getItem('expense_tracker_user');
        if (storedUser) {
            try {
                let parsedUser = JSON.parse(storedUser);

                // Validate user structure (must have id)
                if (!parsedUser || typeof parsedUser.id !== 'number') {
                    console.warn('Invalid user session found. Clearing.');
                    localStorage.removeItem('expense_tracker_user');
                    setUser(null);
                } else {
                    // Normalize Jane Doe -> Jane_doe
                    if (parsedUser.name && parsedUser.name.toLowerCase() === 'jane doe') {
                        parsedUser = { ...parsedUser, name: 'Jane_doe' };
                    }
                    setUser(parsedUser);
                }
            } catch (e) {
                console.error('Failed to parse user from local storage', e);
                localStorage.removeItem('expense_tracker_user');
            }
        }
        setLoading(false);
    }, []);

    const updateUser = useCallback((newUser: User | null) => {
        if (newUser) {
            // Normalize Jane Doe -> Jane_doe
            if (newUser.name && newUser.name.toLowerCase() === 'jane doe') {
                newUser = { ...newUser, name: 'Jane_doe' };
            }
            localStorage.setItem('expense_tracker_user', JSON.stringify(newUser));
        } else {
            localStorage.removeItem('expense_tracker_user');
        }
        setUser(newUser);
    }, []);

    return (
        <UserContext.Provider value={{ user, updateUser, loading }}>
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
