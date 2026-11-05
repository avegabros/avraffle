import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AV-Raffle database...');

  // 1. Seed initial admin accounts
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: 'SUPERADMIN',
    },
  });

  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      name: 'Registration Desk',
      passwordHash: staffPasswordHash,
      role: 'REGISTRATION_STAFF',
    },
  });

  console.log(`✅ Admin created: ${admin.username} (password: admin123)`);
  console.log(`✅ Staff created: ${staff.username} (password: staff123)`);

  // 2. Seed initial prizes
  const prizes = [
    { name: 'Smart 4K TV 55"', type: 'GRAND', isGrandPrize: true, quantity: 1 },
    { name: 'Apple iPad 10th Gen', type: 'GRAND', isGrandPrize: true, quantity: 1 },
    { name: 'Microwave Oven', type: 'REGULAR', isGrandPrize: false, quantity: 3 },
    { name: 'Air Fryer 4.5L', type: 'REGULAR', isGrandPrize: false, quantity: 5 },
    { name: 'Grocery Basket ₱2,000', type: 'REGULAR', isGrandPrize: false, quantity: 10 },
  ];

  for (const prize of prizes) {
    await prisma.prize.create({
      data: prize,
    });
  }
  console.log(`✅ Seeded ${prizes.length} prizes.`);

  // 3. Seed sample checked-in attendees for the wheel demo
  const sampleGuests = [
    { employeeId: 'EMP-001', firstName: 'Juan', lastName: 'Dela Cruz', department: 'Engineering', assigned: 'HQ', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-002', firstName: 'Maria', lastName: 'Santos', department: 'HR & Admin', assigned: 'HQ', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-003', firstName: 'Carlo', lastName: 'Reyes', department: 'Operations', assigned: 'Site A', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-004', firstName: 'Ana', lastName: 'Lim', department: 'Finance', assigned: 'HQ', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-005', firstName: 'Robert', lastName: 'Garcia', department: 'Logistics', assigned: 'Warehouse', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-006', firstName: 'Patricia', lastName: 'Tan', department: 'Marketing', assigned: 'HQ', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-007', firstName: 'Mark', lastName: 'Aquino', department: 'IT Support', assigned: 'HQ', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-008', firstName: 'Liza', lastName: 'Villanueva', department: 'Customer Care', assigned: 'Site B', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-009', firstName: 'Dexter', lastName: 'Cruz', department: 'Security', assigned: 'HQ', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-010', firstName: 'Elena', lastName: 'Mendoza', department: 'Legal', assigned: 'HQ', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-011', firstName: 'John', lastName: 'Bautista', department: 'Engineering', assigned: 'Site A', isRegistered: true, inWheel: true },
    { employeeId: 'EMP-012', firstName: 'Grace', lastName: 'Fernandez', department: 'Procurement', assigned: 'HQ', isRegistered: true, inWheel: true },
  ];

  for (const guest of sampleGuests) {
    await prisma.guest.upsert({
      where: { employeeId: guest.employeeId },
      update: {},
      create: guest,
    });
  }
  console.log(`✅ Seeded ${sampleGuests.length} demo guests in active wheel.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
