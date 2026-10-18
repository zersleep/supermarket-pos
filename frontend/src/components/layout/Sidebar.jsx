import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  FileText,
  Clock,
  History,
  QrCode,
  BarChart3,
  Users,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const {
    canOperatePos,
    canManageProducts,
    canManageInventory,
    canManageUsers,
    canViewReports,
    canViewAuditLogs,
    canManageSettings
  } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, show: true },
    { label: 'POS Checkout', path: '/pos', icon: ShoppingCart, show: canOperatePos },
    { label: 'Pending Payments', path: '/pending-payments', icon: QrCode, show: canOperatePos },
    { label: 'Cashier Shift', path: '/shifts', icon: Clock, show: canOperatePos },
    { label: 'Sales History', path: '/sales', icon: History, show: true },
    { label: 'Products', path: '/products', icon: Package, show: canManageProducts },
    { label: 'Inventory & Batches', path: '/inventory', icon: Boxes, show: canManageInventory },
    { label: 'Suppliers', path: '/suppliers', icon: Truck, show: canManageInventory },
    { label: 'Purchase Orders', path: '/purchasing', icon: FileText, show: canManageInventory },
    { label: 'Reports', path: '/reports', icon: BarChart3, show: canViewReports },
    { label: 'User Management', path: '/users', icon: Users, show: canManageUsers },
    { label: 'Audit Logs', path: '/audit', icon: ShieldAlert, show: canViewAuditLogs },
    { label: 'Settings', path: '/settings', icon: Settings, show: canManageSettings }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">M</div>
        <div className="sidebar-title">Metro POS</div>
      </div>
      <nav className="sidebar-nav">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span className="nav-text">{item.label}</span>
              </NavLink>
            );
          })}
      </nav>
    </aside>
  );
}
