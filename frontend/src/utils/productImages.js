/**
 * Product Image Resolver & Audio Feedback for Supermarket POS
 */

// Curated high-resolution supermarket retail product images
const PRODUCT_IMAGE_MAP = {
  'BEV-VIT-500': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80',
  'BEV-COKE-330': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
  'DAI-MILK-1L': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=80',
  'DAI-EGGS-10P': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80',
  'BAK-BAGU-250': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
  'PAN-RICE-5KG': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
  'PAN-NOOD-BOX': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
  'SNK-LAYS-50G': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80'
};

const CATEGORY_IMAGE_MAP = {
  'beverages': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
  'dairy & eggs': 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=80',
  'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
  'pantry & dry goods': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
  'snacks & sweets': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
  'fresh produce': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&auto=format&fit=crop&q=80'
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80';

/**
 * High-quality SVG Graphic Fallback for offline or missing images
 */
export function getProductSvgPlaceholder(product) {
  const catName = (product?.category?.name || '').toLowerCase();
  const name = (product?.name || '').toLowerCase();
  const sku = product?.sku || 'PROD';

  let bgColor1 = '#3b82f6';
  let bgColor2 = '#1d4ed8';
  let iconEmoji = '🛒';
  let label = 'Supermarket Item';

  if (catName.includes('beverage') || name.includes('water') || name.includes('coke') || name.includes('beer')) {
    bgColor1 = '#0284c7';
    bgColor2 = '#0369a1';
    iconEmoji = '🥤';
    label = 'Beverage';
  } else if (catName.includes('dairy') || name.includes('milk') || name.includes('egg')) {
    bgColor1 = '#0ea5e9';
    bgColor2 = '#0284c7';
    iconEmoji = '🥛';
    label = 'Dairy & Eggs';
  } else if (catName.includes('bakery') || name.includes('bread') || name.includes('baguette')) {
    bgColor1 = '#f59e0b';
    bgColor2 = '#b45309';
    iconEmoji = '🥖';
    label = 'Fresh Bakery';
  } else if (catName.includes('pantry') || name.includes('rice') || name.includes('noodle')) {
    bgColor1 = '#ea580c';
    bgColor2 = '#c2410c';
    iconEmoji = '🍚';
    label = 'Pantry & Grains';
  } else if (catName.includes('snack') || name.includes('chip') || name.includes('lay')) {
    bgColor1 = '#ec4899';
    bgColor2 = '#be185d';
    iconEmoji = '🍿';
    label = 'Snacks & Sweets';
  } else if (catName.includes('produce') || name.includes('fruit') || name.includes('veg')) {
    bgColor1 = '#10b981';
    bgColor2 = '#047857';
    iconEmoji = '🍎';
    label = 'Fresh Produce';
  } else if (catName.includes('household') || name.includes('clean')) {
    bgColor1 = '#8b5cf6';
    bgColor2 = '#6d28d9';
    iconEmoji = '🧼';
    label = 'Household Care';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor1}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${bgColor2}" stop-opacity="0.28"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" rx="14" fill="url(#bg)"/>
    <rect x="2" y="2" width="396" height="276" rx="12" fill="none" stroke="${bgColor1}" stroke-opacity="0.35" stroke-width="2"/>
    <text x="50%" y="42%" text-anchor="middle" font-size="56">${iconEmoji}</text>
    <text x="50%" y="68%" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="700" font-size="16" fill="${bgColor2}">${label}</text>
    <text x="50%" y="84%" text-anchor="middle" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="600" font-size="13" fill="#475569">SKU: ${sku}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns a high-res image URL for any product based on SKU, category, or direct URL
 */
export function getProductImageUrl(product) {
  if (!product) return getProductSvgPlaceholder(null);

  // Direct product image property if set
  if (product.imageUrl) return product.imageUrl;

  // SKU match
  if (product.sku && PRODUCT_IMAGE_MAP[product.sku]) {
    return PRODUCT_IMAGE_MAP[product.sku];
  }

  // Name keyword matching
  const name = (product.name || '').toLowerCase();
  if (name.includes('water')) return PRODUCT_IMAGE_MAP['BEV-VIT-500'];
  if (name.includes('coke') || name.includes('cola')) return PRODUCT_IMAGE_MAP['BEV-COKE-330'];
  if (name.includes('sting') || name.includes('energy')) return 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&auto=format&fit=crop&q=80';
  if (name.includes('milk')) return PRODUCT_IMAGE_MAP['DAI-MILK-1L'];
  if (name.includes('egg')) return PRODUCT_IMAGE_MAP['DAI-EGGS-10P'];
  if (name.includes('bread') || name.includes('baguette')) return PRODUCT_IMAGE_MAP['BAK-BAGU-250'];
  if (name.includes('rice')) return PRODUCT_IMAGE_MAP['PAN-RICE-5KG'];
  if (name.includes('noodle')) return PRODUCT_IMAGE_MAP['PAN-NOOD-BOX'];
  if (name.includes('chip') || name.includes('lay')) return PRODUCT_IMAGE_MAP['SNK-LAYS-50G'];
  if (name.includes('beer') || name.includes('angkor')) return 'https://images.unsplash.com/photo-1608270199047-9e7ecba4fc3d?w=500&auto=format&fit=crop&q=80';
  if (name.includes('coffee') || name.includes('nescafe')) return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80';

  // Category match
  const catName = (product.category?.name || '').toLowerCase();
  if (CATEGORY_IMAGE_MAP[catName]) {
    return CATEGORY_IMAGE_MAP[catName];
  }

  return getProductSvgPlaceholder(product);
}

/**
 * Realistic POS Barcode Scanner Beep
 */
export function playScannerBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    // Ignore audio permission/context errors
  }
}

/**
 * Pleasant POS Cash Register Sale Completion Chime
 */
export function playCashChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Two pleasant upward chimes
    const notes = [880, 1174.66]; // A5, D6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (err) {}
}

/**
 * Low Alert / Error Buzz Tone
 */
export function playErrorTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {}
}

