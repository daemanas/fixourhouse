import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'localfix-token';
const USER_KEY = 'localfix-user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);

  const persistAuth = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
    }
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setUser(newUser);
    }
  }, []);

  const login = useCallback(
    async (credentials) => {
      setLoading(true);
      try {
        const response = await authService.login(credentials);
        const { token: newToken, user: newUser } = response.data;
        persistAuth(newToken, newUser);
        return response.data;
      } finally {
        setLoading(false);
      }
    },
    [persistAuth]
  );

  const register = useCallback(
    async (data) => {
      setLoading(true);
      try {
        const response = await authService.register(data);
        return response.data;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (data) => {
      setLoading(true);
      try {
        const response = await authService.verifyOtp(data);
        const { token: newToken, user: newUser } = response.data;
        persistAuth(newToken, newUser);
        return response.data;
      } finally {
        setLoading(false);
      }
    },
    [persistAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await authService.getMe();
      const me = response?.data?.user;
      if (!me) {
        throw new Error('Invalid user payload');
      }
      setUser(me);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    } catch (error) {
      // Token invalid — logout
      logout();
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isCustomer: user?.role === 'customer',
    isProvider: user?.role === 'provider',
    isAdmin: user?.role === 'admin',
    login,
    register,
    verifyOtp,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}