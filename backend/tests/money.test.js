const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  roundToTwo,
  calculateLineTotal,
  convertUsdToKhr,
  convertKhrToUsd,
  formatCurrency
} = require('../src/utils/money');

describe('Money and Currency Utility Tests', () => {
  test('roundToTwo handles precision without floating-point representation drift', () => {
    assert.equal(roundToTwo(0.1 + 0.2), 0.3);
    assert.equal(roundToTwo(10.555), 10.56);
    assert.equal(roundToTwo(10.554), 10.55);
  });

  test('calculateLineTotal calculates unitPrice * quantity - discount accurately', () => {
    const total = calculateLineTotal(2.5, 3, 0.5);
    // (2.5 * 3) = 7.5 - 0.5 = 7.0
    assert.equal(total, 7.0);

    // Line total never goes negative
    const zeroFloor = calculateLineTotal(1.0, 1, 5.0);
    assert.equal(zeroFloor, 0);
  });

  test('convertUsdToKhr and convertKhrToUsd convert accurately with exchange rate', () => {
    const khr = convertUsdToKhr(10, 4100);
    assert.equal(khr, 41000);

    const usd = convertKhrToUsd(41000, 4100);
    assert.equal(usd, 10.0);
  });

  test('formatCurrency outputs correctly formatted USD and KHR symbols', () => {
    assert.equal(formatCurrency(12.5, 'USD'), '$12.50');
    assert.equal(formatCurrency(41000, 'KHR'), '41,000 ៛');
  });
});
