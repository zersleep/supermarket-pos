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
  BarChart3,
  Users,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

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

  const { t } = useLanguage();

  const sections = [
    {
      title: t('nav.operations', 'Operations'),
      items: [
        { label: t('nav.dashboard', 'Dashboard'), path: '/', icon: LayoutDashboard, show: true },
        { label: t('nav.pos', 'Checkout Register'), path: '/pos', icon: ShoppingCart, show: canOperatePos },
        { label: t('nav.shifts', 'Cashier Shifts'), path: '/shifts', icon: Clock, show: canOperatePos },
        { label: t('nav.sales', 'Sales History'), path: '/sales', icon: History, show: true }
      ]
    },
    {
      title: t('nav.inventory_supply', 'Inventory & Supply'),
      items: [
        { label: t('nav.products', 'Products Catalog'), path: '/products', icon: Package, show: canManageProducts },
        { label: t('nav.categories', 'Categories'), path: '/categories', icon: Folder, show: canManageProducts },
        { label: t('nav.inventory', 'Inventory & Batches'), path: '/inventory', icon: Boxes, show: canManageInventory },
        { label: t('nav.suppliers', 'Suppliers'), path: '/suppliers', icon: Truck, show: canManageInventory },
        { label: t('nav.purchasing', 'Purchase Orders'), path: '/purchasing', icon: FileText, show: canManageInventory }
      ]
    },
    {
      title: t('nav.administration', 'Administration'),
      items: [
        { label: t('nav.reports', 'Reports & Analytics'), path: '/reports', icon: BarChart3, show: canViewReports },
        { label: t('nav.users', 'Staff & Roles'), path: '/users', icon: Users, show: canManageUsers },
        { label: t('nav.audit', 'Audit Trail'), path: '/audit', icon: ShieldAlert, show: canViewAuditLogs },
        { label: t('nav.settings', 'Store Settings'), path: '/settings', icon: Settings, show: canManageSettings }
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <ShoppingCart size={22} />
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-title">{t('brand.title', 'Supermarket POS')}</div>
          <div className="sidebar-subtitle">{t('brand.subtitle', 'Retail & Inventory')}</div>
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
            <span>Neon DB Connected</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>v2.4</span>
        </div>
      </div>
    </aside>
  );
}
