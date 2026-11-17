import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      loginUrl = 'https://api.avegabros.net/v2/auth/login',
      apiUrl = 'https://api.avegabros.net/v2/hris/employees',
      username = 'admin',
      password = '1234567890',
      eventYear = 2026,
    } = await req.json();

    let rawEmployees: any[] = [];

    // 1. Authenticate with HRIS V2 to obtain accessToken cookie
    let authCookie = '';
    try {
      const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!loginRes.ok) {
        const errJson = await loginRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: `HRIS login failed (${loginRes.status}): ${errJson.message || 'Invalid credentials'}` },
          { status: 401 }
        );
      }

      authCookie = loginRes.headers.get('set-cookie') || '';
    } catch (authErr) {
      console.error('HRIS Auth error:', authErr);
      return NextResponse.json(
        { error: 'Failed to connect to HRIS Authentication endpoint' },
        { status: 500 }
      );
    }

    // 2. Fetch all active employees with pagination
    try {
      let page = 1;
      const perPage = 100;
      let totalCount = 0;

      while (true) {
        const targetUrl = new URL(apiUrl);
        targetUrl.searchParams.set('page', String(page));
        targetUrl.searchParams.set('perPage', String(perPage));

        const res = await fetch(targetUrl.toString(), {
          headers: {
            'Content-Type': 'application/json',
            ...(authCookie ? { Cookie: authCookie } : {}),
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`HRIS Employees fetch error on page ${page}:`, errText);
          break;
        }

        const json = await res.json();
        totalCount = json.count || 0;
        const batch = json.employees || [];

        if (Array.isArray(batch) && batch.length > 0) {
          rawEmployees.push(...batch);
          if (rawEmployees.length >= totalCount || batch.length < perPage) {
            break;
          }
          page++;
        } else {
          break;
        }
      }
    } catch (e) {
      console.error('HRIS Employees endpoint error:', e);
    }

    if (rawEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No employee records retrieved from HRIS API' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const validEmployeeIds: string[] = [];

    // 3. Upsert into database
    for (const emp of rawEmployees) {
      const empId = (emp.employee_id || emp.employeeId || '').trim();
      const person = emp.person || {};
      const fName = (person.first_name || emp.first_name || emp.firstName || '').trim();
      const lName = (person.last_name || emp.last_name || emp.lastName || '').trim();
      const mName = (person.middle_name || emp.middle_name || emp.middleName || '').trim() || null;
      const pos = (emp.position?.name || emp.position || '').trim();
      const dept = (emp.department?.name || emp.division?.name || emp.company?.name || 'Avega Group').trim();

      // Determine location mapping from user_location or fallback to 'ALL'
      const rawLoc = (emp.user_location?.name || emp.user_location || '').toUpperCase();
      let location = 'ALL';
      if (rawLoc.includes('MAKATI')) {
        location = 'MAKATI';
      } else if (rawLoc.includes('TAYUD') || rawLoc.includes('CEBU')) {
        location = 'TAYUD';
      }

      if (!empId || !fName || !lName) continue;

      const pic = emp.picture || null;

      await prisma.guest.upsert({
        where: { employeeId: empId },
        update: {
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: dept,
          position: pos || null,
          assigned: location === 'ALL' ? 'ALL LOCATIONS' : location,
          location,
          eventYear: parseInt(String(eventYear), 10),
          imagePath: pic ? pic : undefined,
        },
        create: {
          employeeId: empId,
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: dept,
          position: pos || null,
          assigned: location === 'ALL' ? 'ALL LOCATIONS' : location,
          location,
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
      message: `Successfully synced ${importedCount} employees from HRIS V2 into ${eventYear} roster.`,
      count: importedCount,
      employeeIds: validEmployeeIds,
    });
  } catch (error) {
    console.error('HRIS Sync error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during HRIS employee sync' },
      { status: 500 }
    );
  }
}
