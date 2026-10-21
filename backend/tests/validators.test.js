const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  setupSchema,
  loginSchema,
  checkoutSchema,
  createRefundSchema,
  addStockSchema
} = require('../src/validators');

describe('Input Validation & Security Schemas Tests', () => {
  test('setupSchema rejects weak passwords and invalid usernames', () => {
    // Password too short (< 8 chars)
    assert.throws(() => {
      setupSchema.parse({
        username: 'admin',
        password: '123',
        fullName: 'Admin User',
        setupSecret: 'pos-setup-secret-key'
      });
    });

    // Valid setup payload
    const valid = setupSchema.parse({
      username: 'owner_metro',
      password: 'StrongPassword2026!',
      fullName: 'Store Owner',
      setupSecret: 'pos-setup-secret-key'
    });
    assert.equal(valid.username, 'owner_metro');
  });

  test('loginSchema enforces required credentials', () => {
    assert.throws(() => {
      loginSchema.parse({ username: '' });
    });
  });

  test('checkoutSchema requires idempotencyKey, paymentMethod, and cart items', () => {
    // Missing items
    assert.throws(() => {
      checkoutSchema.parse({
        items: [],
        paymentMethod: 'CASH',
        idempotencyKey: 'idemp-12345678'
      });
    });

    // Valid checkout payload
    const valid = checkoutSchema.parse({
      items: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 2,
          discount: 0
        }
      ],
      paymentMethod: 'CASH',
      currency: 'USD',
      cashReceived: 20,
      idempotencyKey: 'checkout-uuid-unique-1234'
    });

    assert.equal(valid.paymentMethod, 'CASH');
    assert.equal(valid.items.length, 1);
  });

  test('createRefundSchema enforces reason and refund items', () => {
    assert.throws(() => {
      createRefundSchema.parse({
        saleId: '550e8400-e29b-41d4-a716-446655440000',
        reason: '',
        items: []
      });
    });
  });

  test('addStockSchema validates stock intake parameters correctly', () => {
    // Non-positive quantity throws
    assert.throws(() => {
      addStockSchema.parse({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 0
      });
    });

    // Valid direct stock intake payload
    const valid = addStockSchema.parse({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 50,
      batchNumber: 'LOT-2026-X',
      costPrice: 2.75,
      expiryDate: '2027-01-01',
      movementType: 'RECEIPT',
      reason: 'Direct supplier shipment'
    });

    assert.equal(valid.quantity, 50);
    assert.equal(valid.movementType, 'RECEIPT');
    assert.equal(valid.costPrice, 2.75);
  });
});
