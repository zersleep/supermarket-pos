/**
 * Money and Currency Utilities
 * Avoids JavaScript floating-point representation bugs by rounding to 2 decimal places for USD,
 * or 0 decimal places for KHR (Riel has no cents/fractions in normal circulation).
 */

function roundToTwo(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

function calculateLineTotal(unitPrice, quantity, discount = 0) {
  const price = Number(unitPrice);
  const qty = Number(quantity);
  const disc = Number(discount);
  const rawSubtotal = price * qty;
  const lineTotal = Math.max(0, rawSubtotal - disc);
  return roundToTwo(lineTotal);
}

function convertUsdToKhr(usdAmount, exchangeRate = 4100) {
  return Math.round(Number(usdAmount) * Number(exchangeRate));
}

function convertKhrToUsd(khrAmount, exchangeRate = 4100) {
  return roundToTwo(Number(khrAmount) / Number(exchangeRate));
}

function formatCurrency(amount, currency = 'USD', exchangeRate = 4100) {
  const num = Number(amount) || 0;
  if (currency === 'KHR') {
    return `${Math.round(num).toLocaleString('en-US')} ៛`;
  }
  return `$${num.toFixed(2)}`;
}

module.exports = {
  roundToTwo,
  calculateLineTotal,
  convertUsdToKhr,
  convertKhrToUsd,
  formatCurrency
};
