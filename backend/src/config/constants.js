const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER'
};

const PERMISSIONS = {
  // User Management
  MANAGE_USERS: [ROLES.OWNER, ROLES.ADMIN],
  
  // Settings & System
  MANAGE_SETTINGS: [ROLES.OWNER],
  VIEW_AUDIT_LOGS: [ROLES.OWNER, ROLES.ADMIN],
  
  // Product & Category Management
  MANAGE_PRODUCTS: [ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
  VIEW_PRODUCTS: [ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.CASHIER],
  
  // Inventory & Purchasing
  MANAGE_INVENTORY: [ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
  MANAGE_SUPPLIERS: [ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
  MANAGE_PURCHASE_ORDERS: [ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
  RECEIVE_GOODS: [ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
  
  // POS & Checkout
  OPERATE_POS: [ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER],
  CONFIRM_PAYMENT: [ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER],
  AUTHORIZE_REFUND: [ROLES.OWNER, ROLES.ADMIN],
  
  // Shifts
  OPERATE_SHIFT: [ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER],
  VIEW_ALL_SHIFTS: [ROLES.OWNER, ROLES.ADMIN],
  
  // Reports
  VIEW_FINANCIAL_REPORTS: [ROLES.OWNER, ROLES.ADMIN],
  VIEW_INVENTORY_REPORTS: [ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
  EXPORT_REPORTS: [ROLES.OWNER, ROLES.ADMIN]
};

const DEFAULT_SETTINGS = [
  { key: 'STORE_NAME', value: 'Supermarket POS', description: 'Business display name' },
  { key: 'STORE_ADDRESS', value: '123 Main Blvd, Phnom Penh, Cambodia', description: 'Store location address' },
  { key: 'STORE_PHONE', value: '+855 23 999 888', description: 'Store contact phone number' },
  { key: 'RECEIPT_HEADER', value: 'Thank you for shopping with us!', description: 'Receipt header text' },
  { key: 'RECEIPT_FOOTER', value: 'Goods sold are returnable within 7 days with valid receipt.', description: 'Receipt footer text' },
  { key: 'CURRENCY_CODE', value: 'USD', description: 'Primary currency code (USD or KHR)' },
  { key: 'EXCHANGE_RATE_KHR', value: '4100', description: 'Exchange rate: 1 USD to Cambodian Riel (KHR)' },
  { key: 'TAX_PERCENT', value: '0', description: 'Default VAT / Sales tax percentage' },
  { key: 'EXPIRY_WARNING_DAYS', value: '30', description: 'Threshold days before item expiry warning' },
  { key: 'LOW_STOCK_THRESHOLD', value: '10', description: 'Default stock quantity for low-stock warning' }
];

module.exports = {
  ROLES,
  PERMISSIONS,
  DEFAULT_SETTINGS
};
