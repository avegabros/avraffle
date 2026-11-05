import fs from 'fs';
import path from 'path';

interface LegacyWinner {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  prize: string;
  winOn: string;
  image: string;
}

async function migrate() {
  const sqlFilePath = 'C:\\code\\WHEEL-RAFFLE\\attendance.sql';
  const sql = fs.readFileSync(sqlFilePath, 'utf-8');

  // Match rows in `guest` table
  // Pattern: (id, 'employee_id', 'first_name', 'middle_name', 'last_name', 'assigned', 'department', 'position', 'registered_on', 'image', wheel, winner, 'win_on', 'prize')
  const rowRegex = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)'\)/g;

  const winners: LegacyWinner[] = [];
  let match;

  while ((match = rowRegex.exec(sql)) !== null) {
    const id = match[1];
    const employeeId = match[2];
    const firstName = match[3];
    const lastName = match[5];
    const department = match[7];
    const position = match[8];
    const image = match[10];
    const winner = match[12];
    const winOn = match[13];
    const prize = match[14];

    if (winner === '1') {
      winners.push({
        id,
        employeeId,
        firstName,
        lastName,
        department,
        position,
        prize: prize || 'Regular Prize',
        winOn,
        image,
      });
    }
  }

  const outDir = path.join(process.cwd(), 'src', 'data', 'winners');
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, '2025.json');
  fs.writeFileSync(outPath, JSON.stringify(winners, null, 2));

  console.log(`✅ Extracted ${winners.length} legacy 2025 winners to ${outPath}`);
}

migrate();
