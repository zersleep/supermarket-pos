import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PosProvider } from './context/PosContext';
import { LoadingSpinner } from './components/common/LoadingSpinner';

import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import PosCheckout from './pages/pos/PosCheckout';
import PendingPayments from './pages/sales/PendingPayments';
import SalesHistory from './pages/sales/SalesHistory';
import CashierShifts from './pages/shifts/CashierShifts';
import ProductList from './pages/products/ProductList';
import CategoryList from './pages/categories/CategoryList';
import InventorySummary from './pages/inventory/InventorySummary';
import Suppliers from './pages/purchasing/Suppliers';
import PurchaseOrders from './pages/purchasing/PurchaseOrders';
import Reports from './pages/reports/Reports';
import UserManagement from './pages/users/UserManagement';
import AuditLogs from './pages/audit/AuditLogs';
import StoreSettings from './pages/settings/StoreSettings';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, systemInitialized } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Authenticating session..." />;
  }

  if (!systemInitialized) {
    return <Navigate to="/setup" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>403 - Access Denied</h2>
        <p style={{ color: '#64748b', marginTop: '8px' }}>
          You do not have permission to access this page with your current role ({user.role}).
        </p>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <PosProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />

        {/* Protected Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="pos"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'CASHIER']}>
                <PosCheckout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pending-payments"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'CASHIER']}>
                <PendingPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="shifts"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'CASHIER']}>
                <CashierShifts />
              </ProtectedRoute>
            }
          />
          <Route path="sales" element={<SalesHistory />} />
          <Route
            path="products"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
                <ProductList />
              </ProtectedRoute>
            }
          />
          <Route
            path="categories"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
                <CategoryList />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
                <InventorySummary />
              </ProtectedRoute>
            }
          />
          <Route
            path="suppliers"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
                <Suppliers />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchasing"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'INVENTORY_MANAGER']}>
                <PurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <StoreSettings />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PosProvider>
  );
}
