import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('pos_token') || null);
  const [activeShift, setActiveShift] = useState(null);
  const [systemInitialized, setSystemInitialized] = useState(true);
  const [loading, setLoading] = useState(true);

  // Check system status and load user profile on app start
  useEffect(() => {
    async function initAuth() {
      try {
        // Check if system has an owner
        const statusRes = await api.get('/auth/status');
        setSystemInitialized(statusRes.data.initialized);

        if (token) {
          const meRes = await api.get('/auth/me');
          setUser(meRes.data.user);
          setActiveShift(meRes.data.activeShift);
          localStorage.setItem('pos_user', JSON.stringify(meRes.data.user));
        }
      } catch (err) {
        console.warn('Auth init failed:', err.message);
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('pos_token', receivedToken);
    localStorage.setItem('pos_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);

    // Fetch active shift
    try {
      const shiftRes = await api.get('/shifts/current');
      setActiveShift(shiftRes.data);
    } catch {
      setActiveShift(null);
    }

    return receivedUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request failed:', e.message);
    } finally {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      setUser(null);
      setToken(null);
      setActiveShift(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setActiveShift(res.data.activeShift);
      localStorage.setItem('pos_user', JSON.stringify(res.data.user));
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  // Permission helpers
  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const isCashier = user?.role === 'CASHIER';
  const isInventoryManager = user?.role === 'INVENTORY_MANAGER';

  const canOperatePos = hasRole('OWNER', 'ADMIN', 'CASHIER');
  const canManageProducts = hasRole('OWNER', 'ADMIN', 'INVENTORY_MANAGER');
  const canManageInventory = hasRole('OWNER', 'ADMIN', 'INVENTORY_MANAGER');
  const canManageUsers = hasRole('OWNER', 'ADMIN');
  const canViewReports = hasRole('OWNER', 'ADMIN');
  const canViewAuditLogs = hasRole('OWNER', 'ADMIN');
  const canManageSettings = isOwner;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeShift,
        setActiveShift,
        systemInitialized,
        setSystemInitialized,
        loading,
        login,
        logout,
        refreshUser,
        hasRole,
        isOwner,
        isAdmin,
        isCashier,
        isInventoryManager,
        canOperatePos,
        canManageProducts,
        canManageInventory,
        canManageUsers,
        canViewReports,
        canViewAuditLogs,
        canManageSettings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
