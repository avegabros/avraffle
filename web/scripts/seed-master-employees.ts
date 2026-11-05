import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importEmployees() {
  const jsonPath = path.join(process.cwd(), 'src', 'data', 'master-employees.json');
  const employees = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`📥 Importing ${employees.length} employees into Guest table...`);

  let count = 0;
  for (const emp of employees) {
    await prisma.guest.upsert({
      where: { employeeId: emp.employeeId },
      update: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        middleName: emp.middleName,
        assigned: emp.assigned,
        department: emp.department,
        position: emp.position,
        isRegistered: emp.stat === 1,
        inWheel: emp.stat === 1,
      },
      create: {
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        middleName: emp.middleName,
        assigned: emp.assigned,
        department: emp.department,
        position: emp.position,
        isRegistered: emp.stat === 1,
        inWheel: emp.stat === 1,
      },
    });
    count++;
  }

  console.log(`🎉 Successfully imported/updated ${count} employee records in the database!`);
}

importEmployees()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
