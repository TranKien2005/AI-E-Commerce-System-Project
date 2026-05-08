import { apiClient } from '../api/client';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { AuthContext, type User } from './AuthContextValue';

const hasStoredToken = () => !!localStorage.getItem('access_token');

export { AuthContext } from './AuthContextValue';
export type { AuthContextType, User } from './AuthContextValue';


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasStoredToken);

  const fetchMe = async () => {
    try {
      const userData = await apiClient.get<User>('/users/me');
      // Axios response data is already unwrapped by our interceptor to be the 'data' field
      setUser(userData as unknown as User);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setUser(null);
      // If unauthorized, clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasStoredToken()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchMe();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const login = (token: string, refresh: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refresh);
    setLoading(true);
    fetchMe();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

