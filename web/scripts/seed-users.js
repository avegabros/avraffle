const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    const adminCount = await prisma.user.count();
    if (adminCount === 0) {
      console.log('No users found in database. Initializing default admin and staff accounts...');
      const adminHash = await bcrypt.hash('admin123', 10);
      const staffHash = await bcrypt.hash('staff123', 10);

      await prisma.user.create({
        data: {
          username: 'admin',
          name: 'System Administrator',
          passwordHash: adminHash,
          role: 'SUPERADMIN',
          isActive: true,
        },
      });

      await prisma.user.create({
        data: {
          username: 'staff',
          name: 'Registration Staff',
          passwordHash: staffHash,
          role: 'REGISTRATION_STAFF',
          isActive: true,
        },
      });

      console.log('Default accounts initialized: admin / admin123, staff / staff123');
    } else {
      console.log(`Database already has ${adminCount} user(s).`);
    }
  } catch (err) {
    console.error('Error ensuring admin users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
