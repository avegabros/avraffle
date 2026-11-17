import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      loginUrl = 'https://api.avegabros.net/v2/auth/login',
      apiUrl = 'https://api.avegabros.net/v2/hris/employees',
      token,
      username = 'admin',
      password = '1234567890',
      eventYear = 2026,
    } = await req.json();

    let rawEmployees: any[] = [];
    let bearerToken = (token || '').trim();
    let authCookie = '';

    // 1. If bearer token is provided, verify/use it directly.
    // If no bearer token is provided (or empty), perform login to get JWT token & session cookie.
    if (!bearerToken && username && password) {
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
        const loginData = await loginRes.json().catch(() => ({}));
        if (loginData.token) {
          bearerToken = loginData.token;
        }
      } catch (authErr) {
        console.error('HRIS Auth error:', authErr);
        return NextResponse.json(
          { error: 'Failed to connect to HRIS Authentication endpoint' },
          { status: 500 }
        );
      }
    }

    if (!bearerToken && !authCookie) {
      return NextResponse.json(
        { error: 'Authentication required. Please provide a Bearer Token or valid API credentials.' },
        { status: 401 }
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

        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authCookie) {
          reqHeaders['Cookie'] = authCookie;
        } else if (bearerToken) {
          reqHeaders['Cookie'] = `accessToken=${bearerToken}`;
          reqHeaders['Authorization'] = `Bearer ${bearerToken}`;
        }

        const res = await fetch(targetUrl.toString(), {
          headers: reqHeaders,
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
      const locObj = emp.user_location;
      const rawLoc = (
        typeof locObj === 'string'
          ? locObj
          : locObj?.location_name || locObj?.name || ''
      ).toUpperCase();
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
