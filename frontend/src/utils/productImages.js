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
 * Returns a high-res image URL for any product based on SKU, category, or direct URL
 */
export function getProductImageUrl(product) {
  if (!product) return DEFAULT_IMAGE;

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
  if (name.includes('milk')) return PRODUCT_IMAGE_MAP['DAI-MILK-1L'];
  if (name.includes('egg')) return PRODUCT_IMAGE_MAP['DAI-EGGS-10P'];
  if (name.includes('bread') || name.includes('baguette')) return PRODUCT_IMAGE_MAP['BAK-BAGU-250'];
  if (name.includes('rice')) return PRODUCT_IMAGE_MAP['PAN-RICE-5KG'];
  if (name.includes('noodle')) return PRODUCT_IMAGE_MAP['PAN-NOOD-BOX'];
  if (name.includes('chip') || name.includes('lay')) return PRODUCT_IMAGE_MAP['SNK-LAYS-50G'];

  // Category match
  const catName = (product.category?.name || '').toLowerCase();
  if (CATEGORY_IMAGE_MAP[catName]) {
    return CATEGORY_IMAGE_MAP[catName];
  }

  return DEFAULT_IMAGE;
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

