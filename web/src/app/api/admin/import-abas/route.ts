import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      apiUrl = 'https://api.avegabros.org/website/id-employees',
      apiKey = 'tMxLOAEnad9heg7fpIZWQrm2F',
      eventYear = 2026,
    } = await req.json();

    let rawEmployees: any[] = [];

    // 1. Fetch all active employees from ABAS-API
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

      for (let page = 0; page <= 3; page++) {
        urlObj.searchParams.set('page', String(page));
        const res = await fetch(urlObj.toString(), {
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const json = await res.json();
          const batch = Array.isArray(json) ? json : (json.data || json.employees || []);
          if (Array.isArray(batch) && batch.length > 0) {
            rawEmployees.push(...batch);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    } catch (e) {
      console.warn('ABAS-API endpoint error:', e);
    }

    if (rawEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No employee records retrieved from ABAS-API' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const validEmployeeIds: string[] = [];

    // 2. Import employees with location = 'ALL' so they appear in both Tayud and Makati
    for (const emp of rawEmployees) {
      const empId = (emp.employee_id || emp.employeeId || '').trim();
      const fName = (emp.first_name || emp.firstName || '').trim();
      const lName = (emp.last_name || emp.lastName || '').trim();
      const mName = (emp.middle_name || emp.middleName || '').trim() || null;
      const pos = (emp.position || '').trim();
      const comp = (emp.company || '').trim();

      if (!empId || !fName || !lName) continue;

      const pic = emp.picture || null;

      await prisma.guest.upsert({
        where: { employeeId: empId },
        update: {
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: comp || 'Avega Group',
          position: pos || null,
          assigned: 'ALL LOCATIONS',
          location: 'ALL',
          eventYear: parseInt(String(eventYear), 10),
          imagePath: pic ? pic : undefined,
        },
        create: {
          employeeId: empId,
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: comp || 'Avega Group',
          position: pos || null,
          assigned: 'ALL LOCATIONS',
          location: 'ALL',
          eventYear: parseInt(String(eventYear), 10),
          imagePath: pic || null,
          isRegistered: false,
          inWheel: false,
          isWinner: false,
        },
      });

      validEmployeeIds.push(empId);
      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      message: `Successfully imported ${importedCount} employees available for BOTH Tayud & Makati registration desks!`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to sync employees from ABAS-API' }, { status: 500 });
  }
}
