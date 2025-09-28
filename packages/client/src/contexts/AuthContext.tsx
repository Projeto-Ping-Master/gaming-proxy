import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse } from '@gaming-proxy/shared';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (email: string, password: string) => Promise<boolean>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await window.electronAPI.store.get('authToken');
      const storedUser = await window.electronAPI.store.get('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      setIsLoading(true);

      const response = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      if (response.data.success && response.data.data) {
        const { jwt, user: userData } = response.data.data;

        setToken(jwt);
        setUser(userData);

        // Store in electron store
        await window.electronAPI.store.set('authToken', jwt);
        await window.electronAPI.store.set('user', userData);

        // Set API auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;

        toast.success('Login realizado com sucesso!');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.error || 'Erro ao fazer login';
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function signup(email: string, password: string): Promise<boolean> {
    try {
      setIsLoading(true);

      const response = await api.post('/auth/signup', {
        email,
        password,
      });

      if (response.data.success) {
        toast.success('Conta criada! Verifique seu email para ativar.');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Signup error:', error);
      const message = error.response?.data?.error || 'Erro ao criar conta';
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);

      // Clear stored data
      await window.electronAPI.store.delete('authToken');
      await window.electronAPI.store.delete('user');

      // Clear API auth header
      delete api.defaults.headers.common['Authorization'];

      toast.success('Logout realizado com sucesso!');
    }
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    signup,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}