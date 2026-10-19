const { z } = require('zod');

// Authentication & Users
const setupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric or underscore'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  setupSecret: z.string().min(1, 'Setup secret is required')
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const createUserSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric or underscore'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'INVENTORY_MANAGER'])
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'INVENTORY_MANAGER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional().or(z.literal(''))
});

// Categories
const categorySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(255).optional().or(z.literal('')),
  isActive: z.boolean().optional()
});

// Products
const productSchema = z.object({
  name: z.string().min(2).max(150),
  sku: z.string().min(2).max(50),
  barcode: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')).nullable(),
  categoryId: z.string().uuid().optional().or(z.literal('')).nullable(),
  preferredSupplierId: z.string().uuid().optional().or(z.literal('')).nullable(),
  costPrice: z.number().min(0, 'Cost price must be non-negative'),
  sellingPrice: z.number().min(0.01, 'Selling price must be greater than 0'),
  wholesalePrice: z.number().min(0).optional().nullable(),
  unit: z.string().min(1).max(30).default('piece'),
  reorderLevel: z.number().int().min(0).default(10),
  trackExpiry: z.boolean().default(true),
  isActive: z.boolean().default(true),
  // Optional initial stock or barcode aliases
  initialStock: z.number().min(0).optional(),
  expiryDate: z.string().optional().or(z.literal('')),
  barcodes: z.array(z.string()).optional()
});

// Inventory adjustments & write-offs
const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  batchId: z.string().uuid().optional().or(z.literal('')).nullable(),
  type: z.enum(['ADJUSTMENT_ADD', 'ADJUSTMENT_SUBTRACT']),
  quantity: z.number().positive('Quantity must be greater than 0'),
  reason: z.string().min(3, 'Reason is required for inventory audit'),
  expiryDate: z.string().optional().or(z.literal('')).nullable()
});

const writeOffSchema = z.object({
  batchId: z.string().uuid(),
  type: z.enum(['WRITE_OFF_EXPIRED', 'WRITE_OFF_DAMAGED']),
  quantity: z.number().positive().optional().nullable(),
  reason: z.string().min(3, 'Reason is required')
});

// Suppliers
const supplierSchema = z.object({
  name: z.string().min(2).max(100),
  contactPerson: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().optional()
});

// Purchase Orders
const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantityOrdered: z.number().positive(),
  unitCost: z.number().min(0)
});

const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  expectedDate: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required')
});

// Goods Receiving
const goodsReceiptItemSchema = z.object({
  poItemId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid(),
  quantityReceived: z.number().positive(),
  unitCost: z.number().min(0),
  batchNumber: z.string().min(1, 'Batch number is required for receiving'),
  expiryDate: z.string().optional().or(z.literal(''))
});

const goodsReceiptSchema = z.object({
  poId: z.string().uuid(),
  notes: z.string().max(500).optional().or(z.literal('')),
  items: z.array(goodsReceiptItemSchema).min(1, 'At least one item must be received')
});

// POS Checkout
const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  discount: z.number().min(0).default(0)
});

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  paymentMethod: z.enum(['CASH', 'QR_PAYMENT']),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  cashReceived: z.number().min(0).optional(),
  shiftId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().min(8, 'Idempotency key required to prevent duplicate checkouts'),
  notes: z.string().max(255).optional()
});

// Shifts
const openShiftSchema = z.object({
  openingCash: z.number().min(0, 'Opening cash must be non-negative'),
  notes: z.string().max(255).optional().or(z.literal(''))
});

const closeShiftSchema = z.object({
  actualClosingCash: z.number().min(0, 'Actual closing cash is required'),
  notes: z.string().max(500).optional().or(z.literal(''))
});

const cashMovementSchema = z.object({
  shiftId: z.string().uuid(),
  type: z.enum(['CASH_IN', 'CASH_OUT']),
  amount: z.number().positive('Amount must be greater than 0'),
  reason: z.string().min(3, 'Reason is required for cash tracking')
});

// Refunds
const refundItemSchema = z.object({
  saleItemId: z.string().uuid(),
  quantity: z.number().positive(),
  refundAmount: z.number().positive(),
  restock: z.boolean().default(false),
  condition: z.enum(['GOOD', 'DAMAGED', 'EXPIRED']).optional()
});

const createRefundSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().min(3, 'Reason for refund is required'),
  items: z.array(refundItemSchema).min(1, 'At least one item required for refund')
});

// Settings
const settingUpdateSchema = z.object({
  settings: z.record(z.string(), z.string())
});

module.exports = {
  setupSchema,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  categorySchema,
  productSchema,
  stockAdjustmentSchema,
  writeOffSchema,
  supplierSchema,
  purchaseOrderSchema,
  goodsReceiptSchema,
  checkoutSchema,
  openShiftSchema,
  closeShiftSchema,
  cashMovementSchema,
  createRefundSchema,
  settingUpdateSchema
};
