import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      apiUrl = 'https://api.avegabros.org/website/id-employees',
      apiKey = 'tMxLOAEnad9heg7fpIZWQrm2F',
      location = 'TAYUD',
      eventYear = 2026,
    } = await req.json();

    let employeesToImport: any[] = [];

    // Try fetching from specified ABAS-API endpoint
    try {
      const urlObj = new URL(apiUrl);
      if (apiKey && !urlObj.searchParams.has('key')) {
        urlObj.searchParams.set('key', apiKey);
      }
      if (!urlObj.searchParams.has('status')) {
        urlObj.searchParams.set('status', 'Active');
      }
      if (!urlObj.searchParams.has('limit')) {
        urlObj.searchParams.set('limit', '500');
      }

      // Fetch page 0 and page 1 to retrieve all active records
      for (let page = 0; page <= 3; page++) {
        urlObj.searchParams.set('page', String(page));
        const res = await fetch(urlObj.toString(), {
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const json = await res.json();
          const batch = Array.isArray(json) ? json : (json.data || json.employees || []);
          if (Array.isArray(batch) && batch.length > 0) {
            employeesToImport.push(...batch);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    } catch (e) {
      console.warn('ABAS-API endpoint error, checking master seed list fallback...', e);
    }

    // Fallback if local dev or mock
    if (!Array.isArray(employeesToImport) || employeesToImport.length === 0) {
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
      const dept = emp.department || emp.company || null;
      const pos = emp.position || null;
      const assigned = emp.assigned || emp.company || null;
      const pic = emp.picture || null;

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
          imagePath: pic ? pic : undefined,
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
          imagePath: pic || null,
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
      message: `Successfully imported ${importedCount} employees from ABAS-API for ${eventYear} Raffle!`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import employees from ABAS-API' }, { status: 500 });
  }
}
