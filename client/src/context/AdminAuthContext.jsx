import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminAuthService } from '../services/adminAuthService';

const AdminAuthContext = createContext(null);
const ADMIN_TOKEN_KEY = 'localfix-admin-token';

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY)));

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setAdmin(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const existingToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!existingToken) return () => { active = false; };

    adminAuthService.getSession()
      .then((payload) => {
        if (!active) return;
        if (payload?.admin?.role !== 'admin') {
          clearSession();
          return;
        }
        setAdmin(payload.admin);
        setToken(existingToken);
        setLoading(false);
      })
      .catch(() => {
        if (active) clearSession();
      });

    return () => { active = false; };
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const payload = await adminAuthService.login(credentials);
    if (!payload?.token || payload.admin?.role !== 'admin') {
      throw new Error('The admin login response was invalid.');
    }
    sessionStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
    setToken(payload.token);
    setAdmin(payload.admin);
    return payload.admin;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (sessionStorage.getItem(ADMIN_TOKEN_KEY)) await adminAuthService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({
    admin,
    token,
    loading,
    isAuthenticated: Boolean(token && admin?.role === 'admin'),
    login,
    logout,
  }), [admin, token, loading, login, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return context;
}
