import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { authAPI, userAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  school?: string;
  major?: string;
  bio?: string;
  avatarUrl?: string;
  reputationScore?: number;
  pinsCreated?: number;
  eventsCreated?: number;
  streak?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, username?: string) => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  requestSignupMagicLink: (email: string, name: string, username?: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  toggleAnonymous: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    loadUser();
    loadAnonymousPref();
  }, []);

  const loadAnonymousPref = async () => {
    try {
      const value = await SecureStore.getItemAsync('anonymousMode');
      if (value === 'true') setIsAnonymous(true);
    } catch {
      // ignore
    }
  };

  const toggleAnonymous = async () => {
    const next = !isAnonymous;
    setIsAnonymous(next);
    try {
      await SecureStore.setItemAsync('anonymousMode', next ? 'true' : 'false');
    } catch {
      // ignore
    }
  };

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        const response = await authAPI.getCurrentUser();
        if (response.success) setUser(response.data);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await authAPI.login({ identifier, password });
      if (!response.success) throw new Error(response.error?.message || 'Login failed');
      await SecureStore.setItemAsync('authToken', response.data.token);
      await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
      setUser(response.data.user);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error('Unable to reach the server. Check internet and try again.');
      }
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string, username?: string) => {
    try {
      const response = await authAPI.signup({ email, password, name, username });
      if (!response.success) throw new Error(response.error?.message || 'Signup failed');
      await SecureStore.setItemAsync('authToken', response.data.token);
      await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
      setUser(response.data.user);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error('Unable to reach the server. Check internet and try again.');
      }
      throw error;
    }
  };

  const requestMagicLink = async (_email: string) => {
    throw new Error('Magic link is disabled. Use email and password.');
  };

  const requestSignupMagicLink = async (_email: string, _name: string, _username?: string) => {
    throw new Error('Magic link is disabled. Use email and password.');
  };

  const verifyMagicLink = async (_token: string) => {
    throw new Error('Magic link is disabled.');
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      await SecureStore.deleteItemAsync('authToken').catch(() => {});
      await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
    }
  };

  const deleteAccount = async () => {
    await userAPI.deleteAccount();
    setUser(null);
    await SecureStore.deleteItemAsync('authToken').catch(() => {});
    await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        requestMagicLink,
        requestSignupMagicLink,
        verifyMagicLink,
        logout,
        deleteAccount,
        refreshUser,
        isAuthenticated: !!user,
        isAnonymous,
        toggleAnonymous,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
