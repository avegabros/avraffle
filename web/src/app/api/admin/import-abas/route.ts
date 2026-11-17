import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const {
      source = 'production', // 'production' (api.avegabros.org) | 'v2' (api.avegabros.net) | 'custom'
      apiUrl,
      apiKey = 'tMxLOAEnad9heg7fpIZWQrm2F',
      loginUrl = 'https://api.avegabros.net/v2/auth/login',
      token,
      username = 'admin',
      password = '1234567890',
      eventYear = 2026,
      wipeExisting = false,
    } = await req.json();

    let rawEmployees: any[] = [];

    // ==========================================
    // MODE A: Current Production API (ABAS v3 / api.avegabros.org)
    // ==========================================
    if (source === 'production') {
      const targetEndpoint = apiUrl || 'https://api.avegabros.org/website/id-employees';
      try {
        const urlObj = new URL(targetEndpoint);
        if (apiKey && !urlObj.searchParams.has('key')) {
          urlObj.searchParams.set('key', apiKey);
        }
        if (!urlObj.searchParams.has('status')) {
          urlObj.searchParams.set('status', 'Active');
        }
        if (!urlObj.searchParams.has('limit')) {
          urlObj.searchParams.set('limit', '500');
        }

        // Fetch pages 0 to 4 (covers up to 2500 active employees)
        for (let page = 0; page <= 4; page++) {
          urlObj.searchParams.set('page', String(page));
          const res = await fetch(urlObj.toString(), {
            headers: { 'Content-Type': 'application/json' },
          });

          if (res.ok) {
            const json = await res.json();
            const batch = Array.isArray(json) ? json : (json.data || json.employees || []);
            if (Array.isArray(batch) && batch.length > 0) {
              rawEmployees.push(...batch);
              if (json.count && rawEmployees.length >= json.count) {
                break;
              }
            } else {
              break;
            }
          } else {
            console.warn(`Production API page ${page} returned status ${res.status}`);
            break;
          }
        }
      } catch (e) {
        console.error('Production ABAS API fetch error:', e);
      }
    }

    // ==========================================
    // MODE B: Next Version HRIS V2 (api.avegabros.net) or Custom JWT
    // ==========================================
    else {
      const targetEndpoint = apiUrl || 'https://api.avegabros.net/v2/hris/employees';
      let bearerToken = (token || '').trim();
      let authCookie = '';

      // Authenticate if no bearer token is supplied
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
              { error: `HRIS V2 login failed (${loginRes.status}): ${errJson.message || 'Invalid credentials'}` },
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

      // Fetch with pagination
      try {
        let page = 1;
        const perPage = 100;
        let totalCount = 0;

        while (true) {
          const targetUrl = new URL(targetEndpoint);
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
    }

    if (rawEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No employee records retrieved from the selected API source.' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const validEmployeeIds: string[] = [];

    // If wipeExisting is enabled, clean out old attendees for this eventYear first
    if (wipeExisting) {
      const yearToWipe = parseInt(String(eventYear), 10);
      const guestsToWipe = await prisma.guest.findMany({
        where: { eventYear: yearToWipe },
        select: { id: true },
      });
      const guestIds = guestsToWipe.map((g) => g.id);
      if (guestIds.length > 0) {
        await prisma.prize.updateMany({
          where: { wonByGuestId: { in: guestIds } },
          data: { wonByGuestId: null, isWon: false, wonOn: null },
        });
      }
      await prisma.guest.deleteMany({
        where: { eventYear: yearToWipe },
      });
    }

    // ==========================================
    // Unified Employee Upserting
    // ==========================================
    for (const emp of rawEmployees) {
      const empId = (emp.employee_id || emp.employeeId || '').trim();
      const person = emp.person || {};
      const fName = (emp.first_name || person.first_name || emp.firstName || '').trim();
      const lName = (emp.last_name || person.last_name || emp.lastName || '').trim();
      const mName = (emp.middle_name || person.middle_name || emp.middleName || '').trim() || null;
      const pos = (
        typeof emp.position === 'object'
          ? emp.position?.name || ''
          : emp.position || ''
      ).trim();
      
      const dept = (
        emp.company?.name ||
        emp.company ||
        emp.department?.name ||
        emp.department ||
        emp.division?.name ||
        'Avega Group'
      ).trim();

      // Safe location parsing (string or object)
      const locObj = emp.user_location || emp.location;
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

    const sourceLabel = source === 'production' ? 'Production ABAS API (v3)' : 'HRIS V2 (Development)';

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${importedCount} employees from ${sourceLabel} into ${eventYear} roster.`,
      count: importedCount,
      employeeIds: validEmployeeIds,
    });
  } catch (error) {
    console.error('API Sync error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during employee sync' },
      { status: 500 }
    );
  }
}
