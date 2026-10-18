const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding database...');

  // 1. Seed Settings
  const settings = [
    { key: 'STORE_NAME', value: 'Supermarket POS', description: 'Business display name' },
    { key: 'STORE_ADDRESS', value: '123 Monivong Blvd, Phnom Penh, Cambodia', description: 'Store location address' },
    { key: 'STORE_PHONE', value: '+855 23 888 999', description: 'Store contact phone number' },
    { key: 'RECEIPT_HEADER', value: 'Thank you for shopping at Supermarket POS!', description: 'Receipt header text' },
    { key: 'RECEIPT_FOOTER', value: 'Goods sold are returnable within 7 days with valid receipt.', description: 'Receipt footer text' },
    { key: 'CURRENCY_CODE', value: 'USD', description: 'Primary currency code (USD or KHR)' },
    { key: 'EXCHANGE_RATE_KHR', value: '4100', description: 'Exchange rate: 1 USD to Cambodian Riel (KHR)' },
    { key: 'TAX_PERCENT', value: '0', description: 'Default VAT / Sales tax percentage' },
    { key: 'EXPIRY_WARNING_DAYS', value: '30', description: 'Threshold days before item expiry warning' },
    { key: 'LOW_STOCK_THRESHOLD', value: '10', description: 'Default stock quantity for low-stock warning' }
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s
    });
  }
  console.log('[Seed] Settings configured.');

  // 2. Seed Default Categories
  const categoriesData = [
    { name: 'Beverages', description: 'Soft drinks, juices, mineral water, tea and coffee' },
    { name: 'Dairy & Eggs', description: 'Fresh milk, yogurt, butter, cheese, and farm eggs' },
    { name: 'Bakery', description: 'Freshly baked bread, baguettes, buns, and pastries' },
    { name: 'Pantry & Dry Goods', description: 'Rice, noodles, cooking oil, pasta, and canned foods' },
    { name: 'Fresh Produce', description: 'Fresh fruits and seasonal vegetables' },
    { name: 'Snacks & Sweets', description: 'Chips, biscuits, crackers, nuts, and chocolate' },
    { name: 'Household & Care', description: 'Detergents, tissue paper, soaps, and cleaning supplies' }
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat
    });
    categoryMap[c.name] = c.id;
  }
  console.log('[Seed] Categories seeded.');

  // 3. Seed Suppliers
  const suppliersData = [
    {
      name: 'Cambodia Beverage Distribution Ltd',
      contactPerson: 'Sokha Chan',
      phone: '+855 12 345 678',
      email: 'sokha@cambodiabev.com',
      address: 'Street 2004, Phnom Penh'
    },
    {
      name: 'Phnom Penh Fresh Farms',
      contactPerson: 'Vanna Rath',
      phone: '+855 15 888 777',
      email: 'vanna@freshfarms.kh',
      address: 'National Highway 4, Kandal'
    },
    {
      name: 'Global Consumer Goods Supply',
      contactPerson: 'David Chen',
      phone: '+855 23 111 222',
      email: 'sales@globalgoods.com',
      address: 'Russian Blvd, Phnom Penh'
    }
  ];

  for (const sup of suppliersData) {
    await prisma.supplier.upsert({
      where: { name: sup.name },
      update: sup,
      create: sup
    });
  }
  console.log('[Seed] Suppliers seeded.');

  // 4. Seed Demo Products with barcodes and initial batches
  const productsData = [
    {
      name: 'Vital Premium Mineral Water 500ml',
      sku: 'BEV-VIT-500',
      barcode: '884100100101',
      categoryName: 'Beverages',
      costPrice: 0.20,
      sellingPrice: 0.50,
      unit: 'bottle',
      initialStock: 100,
      expiryDays: 180
    },
    {
      name: 'Coca-Cola Can 330ml',
      sku: 'BEV-COKE-330',
      barcode: '884100100102',
      categoryName: 'Beverages',
      costPrice: 0.35,
      sellingPrice: 0.75,
      unit: 'can',
      initialStock: 80,
      expiryDays: 240
    },
    {
      name: 'Angkor Pure Fresh Milk 1L',
      sku: 'DAI-MILK-1L',
      barcode: '884100100103',
      categoryName: 'Dairy & Eggs',
      costPrice: 1.50,
      sellingPrice: 2.20,
      unit: 'carton',
      initialStock: 40,
      expiryDays: 14 // near expiry demo testing
    },
    {
      name: 'Farm Fresh Brown Eggs (Pack of 10)',
      sku: 'DAI-EGGS-10P',
      barcode: '884100100104',
      categoryName: 'Dairy & Eggs',
      costPrice: 1.20,
      sellingPrice: 1.80,
      unit: 'pack',
      initialStock: 30,
      expiryDays: 21
    },
    {
      name: 'French Baguette Bread 250g',
      sku: 'BAK-BAGU-250',
      barcode: '884100100105',
      categoryName: 'Bakery',
      costPrice: 0.40,
      sellingPrice: 0.90,
      unit: 'piece',
      initialStock: 25,
      expiryDays: 3
    },
    {
      name: 'Jasmine Fragrant Rice 5kg',
      sku: 'PAN-RICE-5KG',
      barcode: '884100100106',
      categoryName: 'Pantry & Dry Goods',
      costPrice: 4.20,
      sellingPrice: 6.50,
      unit: 'bag',
      initialStock: 50,
      expiryDays: 365
    },
    {
      name: 'Mama Instant Noodles Shrimp Tom Yum (Box of 30)',
      sku: 'PAN-NOOD-BOX',
      barcode: '884100100107',
      categoryName: 'Pantry & Dry Goods',
      costPrice: 5.50,
      sellingPrice: 7.80,
      unit: 'box',
      initialStock: 20,
      expiryDays: 180
    },
    {
      name: 'Lay’s Classic Potato Chips 50g',
      sku: 'SNK-LAYS-50G',
      barcode: '884100100108',
      categoryName: 'Snacks & Sweets',
      costPrice: 0.60,
      sellingPrice: 1.10,
      unit: 'pack',
      initialStock: 60,
      expiryDays: 120
    }
  ];

  for (const item of productsData) {
    const categoryId = categoryMap[item.categoryName] || null;

    let product = await prisma.product.findUnique({
      where: { sku: item.sku }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          categoryId,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          unit: item.unit,
          reorderLevel: 10,
          trackExpiry: true,
          isActive: true
        }
      });

      // Create initial batch
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + item.expiryDays);

      const batch = await prisma.inventoryBatch.create({
        data: {
          batchNumber: `BATCH-${item.sku.replace(/-/g, '')}-001`,
          productId: product.id,
          initialQuantity: item.initialStock,
          currentQuantity: item.initialStock,
          costPrice: item.costPrice,
          expiryDate
        }
      });

      // Record opening movement
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          batchId: batch.id,
          movementType: 'OPENING_STOCK',
          quantity: item.initialStock,
          previousStock: 0,
          newStock: item.initialStock,
          reason: 'Initial stock seeding for store opening'
        }
      });
    }
  }
  console.log('[Seed] Demo products and inventory batches seeded.');

  console.log('[Seed] Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
