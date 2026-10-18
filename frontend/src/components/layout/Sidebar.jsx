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
  Settings,
  ShoppingBag,
  Sparkles
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

  const sections = [
    {
      title: 'Operations',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, show: true },
        { label: 'POS Terminal', path: '/pos', icon: ShoppingCart, show: canOperatePos },
        { label: 'Pending Payments', path: '/pending-payments', icon: QrCode, show: canOperatePos },
        { label: 'Cashier Shifts', path: '/shifts', icon: Clock, show: canOperatePos },
        { label: 'Sales History', path: '/sales', icon: History, show: true }
      ]
    },
    {
      title: 'Inventory & Supply',
      items: [
        { label: 'Products Catalog', path: '/products', icon: Package, show: canManageProducts },
        { label: 'Inventory & Batches', path: '/inventory', icon: Boxes, show: canManageInventory },
        { label: 'Suppliers', path: '/suppliers', icon: Truck, show: canManageInventory },
        { label: 'Purchase Orders', path: '/purchasing', icon: FileText, show: canManageInventory }
      ]
    },
    {
      title: 'Administration',
      items: [
        { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, show: canViewReports },
        { label: 'User Accounts', path: '/users', icon: Users, show: canManageUsers },
        { label: 'Audit Trail', path: '/audit', icon: ShieldAlert, show: canViewAuditLogs },
        { label: 'Store Settings', path: '/settings', icon: Settings, show: canManageSettings }
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <ShoppingBag size={20} />
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-title">Metro POS</div>
          <div className="sidebar-subtitle">Supermarket Retail</div>
        </div>
      </div>

      {/* Categorized Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} style={{ marginBottom: '10px' }}>
              <div className="nav-section-title">{section.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {visibleItems.map((item) => {
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
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer System Status Card */}
      <div className="sidebar-footer">
        <div className="sidebar-status-pill">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="sidebar-status-dot" />
            <span>Cloud Sync Active</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>v1.2</span>
        </div>
      </div>
    </aside>
  );
}
