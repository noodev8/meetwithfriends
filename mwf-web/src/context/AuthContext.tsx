'use client';

/*
=======================================================================================================================================
Auth Context
=======================================================================================================================================
Manages authentication state across the application.
Stores user and token in localStorage for persistence.
=======================================================================================================================================
*/

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types';
import { getProfile } from '@/lib/api/users';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'mwf_token';
const USER_KEY = 'mwf_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // =======================================================================
    // Helper to clear auth state (used by logout and invalid token handling)
    // =======================================================================
    const clearAuth = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    // =======================================================================
    // Load auth state from localStorage on mount, then refresh from DB
    // =======================================================================
    // This ensures user data is always fresh (e.g., if profile was updated on another device)
    // and also validates that the token is still valid
    useEffect(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedToken) {
            // Fetch fresh profile from DB to ensure data is current
            getProfile(storedToken).then(result => {
                if (result.success && result.data) {
                    // Token is valid, update with fresh user data
                    setToken(storedToken);
                    setUser(result.data);
                    localStorage.setItem(USER_KEY, JSON.stringify(result.data));
                } else {
                    // Token is invalid or expired - clear everything
                    clearAuth();
                }
                setIsLoading(false);
            });
        } else {
            // No token stored
            setIsLoading(false);
        }
    }, [clearAuth]);

    // =======================================================================
    // Login - store token and user
    // =======================================================================
    const login = (newToken: string, newUser: User) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    // =======================================================================
    // Logout - clear token and user (client-side only per our decision)
    // =======================================================================
    const logout = () => {
        clearAuth();
    };

    // =======================================================================
    // Update user data (e.g., after profile edit)
    // =======================================================================
    const updateUser = (updatedUser: User) => {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// =======================================================================
// Hook to use auth context
// =======================================================================
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
