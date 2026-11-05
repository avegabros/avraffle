import fs from 'fs';
import path from 'path';

interface MasterEmployee {
  employeeId: string;
  lastName: string;
  firstName: string;
  middleName: string;
  assigned: string;
  department: string;
  position: string;
  stat: number;
}

async function extractMasterEmployees() {
  const sqlFilePath = 'C:\\code\\WHEEL-RAFFLE\\attendance.sql';
  const sql = fs.readFileSync(sqlFilePath, 'utf-8');

  // Match rows in `info` table:
  // (id, 'employee_id', 'last_name', 'first_name', 'middle_name', 'assigned', 'department', 'position', stat)
  const regex = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(\d+)\)/g;

  const list: MasterEmployee[] = [];
  let match;

  while ((match = regex.exec(sql)) !== null) {
    list.push({
      employeeId: match[2],
      lastName: match[3],
      firstName: match[4],
      middleName: match[5],
      assigned: match[6],
      department: match[7],
      position: match[8],
      stat: parseInt(match[9], 10),
    });
  }

  const outDir = path.join(process.cwd(), 'src', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'master-employees.json'), JSON.stringify(list, null, 2));

  console.log(`✅ Extracted ${list.length} master employee records from attendance.sql!`);
}

extractMasterEmployees();
