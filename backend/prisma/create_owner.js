require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAccounts() {
  console.log('[Account Provisioning] Creating demo accounts in Neon database...');

  const accounts = [
    {
      username: 'owner',
      password: 'password123',
      fullName: 'System Owner',
      role: 'OWNER',
      email: 'owner@supermarket.com',
      phone: '+855 12 000 001'
    },
    {
      username: 'cashier',
      password: 'password123',
      fullName: 'Sokha Cashier',
      role: 'CASHIER',
      email: 'cashier@supermarket.com',
      phone: '+855 12 000 002'
    },
    {
      username: 'inventory',
      password: 'password123',
      fullName: 'Dara Inventory',
      role: 'INVENTORY_MANAGER',
      email: 'inventory@supermarket.com',
      phone: '+855 12 000 003'
    }
  ];

  for (const acc of accounts) {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(acc.password, salt);

    const user = await prisma.user.upsert({
      where: { username: acc.username },
      update: {
        passwordHash,
        fullName: acc.fullName,
        role: acc.role,
        isActive: true
      },
      create: {
        username: acc.username,
        passwordHash,
        fullName: acc.fullName,
        role: acc.role,
        email: acc.email,
        phone: acc.phone,
        isActive: true
      }
    });

    console.log(`[Account Provisioning] Created/Updated: ${user.username} (${user.role})`);
  }

  console.log('[Account Provisioning] All demo accounts ready for login!');
}

createAccounts()
  .catch((err) => {
    console.error('Provisioning failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
