const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/authRoutes');
const userRoutes = require('../modules/users/userRoutes');
const categoryRoutes = require('../modules/categories/categoryRoutes');
const productRoutes = require('../modules/products/productRoutes');
const inventoryRoutes = require('../modules/inventory/inventoryRoutes');
const supplierRoutes = require('../modules/suppliers/supplierRoutes');
const purchasingRoutes = require('../modules/purchasing/purchasingRoutes');
const posRoutes = require('../modules/pos/posRoutes');
const paymentRoutes = require('../modules/payments/paymentRoutes');
const saleRoutes = require('../modules/sales/saleRoutes');
const shiftRoutes = require('../modules/shifts/shiftRoutes');
const reportRoutes = require('../modules/reports/reportRoutes');
const auditRoutes = require('../modules/audit/auditRoutes');
const settingRoutes = require('../modules/settings/settingRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchasing', purchasingRoutes);
router.use('/pos', posRoutes);
router.use('/payments', paymentRoutes);
router.use('/sales', saleRoutes);
router.use('/shifts', shiftRoutes);
router.use('/reports', reportRoutes);
router.use('/audit', auditRoutes);
router.use('/settings', settingRoutes);

module.exports = router;
