import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      apiUrl = 'http://localhost:8080/api/v1/hr/employees',
      apiKey,
      location = 'TAYUD',
      eventYear = 2026,
    } = await req.json();

    let employeesToImport: any[] = [];

    // Try fetching from specified ABAS-API endpoint
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(apiUrl, { headers });
      if (res.ok) {
        const json = await res.json();
        employeesToImport = json.data || json.employees || json;
      }
    } catch (e) {
      console.warn('ABAS-API endpoint unreachable, checking master seed list fallback...', e);
    }

    // Fallback if local dev or mock
    if (!Array.isArray(employeesToImport) || employeesToImport.length === 0) {
      // Use existing master employee seed data
      const fs = await import('fs');
      const path = await import('path');
      const masterPath = path.join(process.cwd(), 'src', 'data', 'master-employees.json');
      if (fs.existsSync(masterPath)) {
        employeesToImport = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
      }
    }

    if (!Array.isArray(employeesToImport) || employeesToImport.length === 0) {
      return NextResponse.json(
        { error: 'No employee records retrieved from ABAS-API' },
        { status: 400 }
      );
    }

    let importedCount = 0;

    for (const emp of employeesToImport) {
      const empId = emp.employee_id || emp.employeeId;
      const fName = emp.first_name || emp.firstName;
      const lName = emp.last_name || emp.lastName;
      const mName = emp.middle_name || emp.middleName || null;
      const dept = emp.department || null;
      const pos = emp.position || null;
      const assigned = emp.assigned || null;

      if (!empId || !fName || !lName) continue;

      // Determine employee location from record or provided fallback
      const empLoc = emp.location || (assigned && assigned.toUpperCase().includes('MAKATI') ? 'MAKATI' : location);

      await prisma.guest.upsert({
        where: { employeeId: empId },
        update: {
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: dept,
          position: pos,
          assigned: assigned,
          location: empLoc,
          eventYear: parseInt(String(eventYear), 10),
          // Newly imported for 2026 starts un-registered until check-in
          isRegistered: false,
          inWheel: false,
          isWinner: false,
          prizeWon: null,
          winOn: null,
        },
        create: {
          employeeId: empId,
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: dept,
          position: pos,
          assigned: assigned,
          location: empLoc,
          eventYear: parseInt(String(eventYear), 10),
          isRegistered: false,
          inWheel: false,
          isWinner: false,
        },
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      message: `Successfully imported ${importedCount} employees from ABAS-API for 2026 Raffle!`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import employees from ABAS-API' }, { status: 500 });
  }
}
