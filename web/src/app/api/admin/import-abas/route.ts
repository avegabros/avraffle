import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Known statuses to strictly exclude (resigned, terminated, separated, awol, inactive, etc.)
const INACTIVE_STATUS_KEYWORDS = [
  'resigned',
  'terminated',
  'separated',
  'retired',
  'awol',
  'on-leave without pay',
  'suspended',
  'preventive suspension',
  'inactive',
];

export async function POST(req: NextRequest) {
  try {
    const {
      source = 'production-live', // 'production-live' | 'production-id' | 'v2'
      apiUrl,
      apiKey = 'tMxLOAEnad9heg7fpIZWQrm2F',
      loginUrl,
      token,
      username,
      password,
      eventYear = 2026,
      wipeExisting = false,
    } = await req.json();

    let rawEmployees: any[] = [];

    // ==========================================
    // MODE 1: ABAS v3 Core HR Master (api.avegabros.org/api/hr-employees)
    // ==========================================
    if (source === 'production-live') {
      const targetEndpoint = apiUrl || 'https://api.avegabros.org/api/hr-employees';
      const authLoginUrl = loginUrl || 'https://api.avegabros.org/api/auth-login';
      let bearerToken = (token || '').trim();

      // If no direct token provided, authenticate via /api/auth-login
      if (!bearerToken && username && password) {
        try {
          const loginRes = await fetch(authLoginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          const loginData = await loginRes.json().catch(() => ({}));
          if (!loginRes.ok || loginData.status === 0) {
            return NextResponse.json(
              {
                error: `ABAS v3 Login failed: ${loginData.message || 'Invalid username or password'}`,
              },
              { status: 401 }
            );
          }

          bearerToken = loginData.token || loginData.data?.token || '';
        } catch (authErr) {
          console.error('ABAS v3 Auth error:', authErr);
          return NextResponse.json(
            { error: 'Failed to connect to ABAS v3 Login endpoint' },
            { status: 500 }
          );
        }
      }

      if (!bearerToken) {
        return NextResponse.json(
          { error: 'ABAS v3 Authorization required. Please provide a Bearer Token or valid Username and Password.' },
          { status: 401 }
        );
      }

      // Fetch active employees with pagination
      try {
        let page = 0;
        const limit = 200;
        let hasMore = true;

        while (hasMore && page <= 25) {
          const urlObj = new URL(targetEndpoint);
          urlObj.searchParams.set('action', 'active');
          urlObj.searchParams.set('page', String(page));
          urlObj.searchParams.set('limit', String(limit));

          const res = await fetch(urlObj.toString(), {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${bearerToken}`,
            },
          });

          if (!res.ok) {
            const errText = await res.text();
            console.warn(`ABAS v3 hr-employees fetch error on page ${page}:`, errText);
            break;
          }

          const json = await res.json();
          const batch = Array.isArray(json) ? json : (json.data || json.employees || []);

          if (Array.isArray(batch) && batch.length > 0) {
            rawEmployees.push(...batch);
            if (json.count && rawEmployees.length >= json.count) {
              break;
            }
            if (batch.length < limit) {
              break;
            }
            page++;
          } else {
            hasMore = false;
          }
        }
      } catch (e) {
        console.error('ABAS v3 hr-employees error:', e);
      }
    }

    // ==========================================
    // MODE 2: Production ID Badges API (api.avegabros.org/website/id-employees)
    // ==========================================
    else if (source === 'production-id' || source === 'production') {
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
    // MODE 3: Next Version HRIS V2 (api.avegabros.net) or Custom JWT
    // ==========================================
    else {
      const targetEndpoint = apiUrl || 'https://api.avegabros.net/v2/hris/employees';
      const authLoginUrl = loginUrl || 'https://api.avegabros.net/v2/auth/login';
      let bearerToken = (token || '').trim();
      let authCookie = '';

      // Authenticate if no bearer token is supplied
      if (!bearerToken && username && password) {
        try {
          const loginRes = await fetch(authLoginUrl, {
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

    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });
    const finalEventId = activeEvent ? activeEvent.id : undefined;
    const finalEventCode = activeEvent ? activeEvent.code : undefined;
    const finalEventYear = activeEvent ? activeEvent.year : parseInt(String(eventYear), 10);

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

      // Determine Location and Group from employee data:
      // In live HR / ABAS core:
      // - group / emp.group: "Land-based" vs "-" or "Sea-based"
      // - assigned_to / designation: e.g. "MAKATI OFFICE (ABISC)", "TAYUD OFFICE", "CEBU OFFICE", "MAINTENANCE", or Vessel name
      const groupRaw = String(emp.group || emp.employee_group || '').trim().toLowerCase();
      const assignedRaw = String(
        emp.assigned_to ||
        emp.assigned ||
        emp.designation ||
        emp.user_location?.location_name ||
        emp.location ||
        ''
      ).trim().toUpperCase();

      // Check if sea-based
      const isSeaBased =
        groupRaw === 'sea-based' ||
        (groupRaw === '-' && !assignedRaw.includes('OFFICE') && !assignedRaw.includes('MAINTENANCE')) ||
        (assignedRaw && !assignedRaw.includes('OFFICE') && !assignedRaw.includes('MAINTENANCE') && !assignedRaw.includes('MAKATI') && !assignedRaw.includes('CEBU') && !assignedRaw.includes('TAYUD') && assignedRaw.length > 2 && groupRaw !== 'land-based');

      // Exclude Sea-Based if group clearly indicates Sea-based
      if (groupRaw === 'sea-based') {
        continue;
      }

      // Determine location: MAKATI vs TAYUD (Cebu) vs ALL
      let location = 'ALL';
      if (
        assignedRaw.includes('CEBU') ||
        assignedRaw.includes('TAYUD') ||
        assignedRaw.includes('MAINTENANCE') ||
        assignedRaw.includes('NRA')
      ) {
        location = 'TAYUD';
      } else if (assignedRaw.includes('MAKATI')) {
        location = 'MAKATI';
      }

      // 1. Actual Employee Status (Active vs Resigned/Terminated/AWOL/etc.)
      // In ABAS v3 API:
      // - emp.status = "Active" | "Inactive"
      // - emp.employee_status contains actual status like "Resigned", "AWOL", "Terminated", "Separated"
      // - OR employment type like "Regular", "Probationary", "Fixed Term"
      const statusField = (emp.status || '').toLowerCase();
      const empStatusField = (emp.employee_status || '').toLowerCase();
      const v2EmploymentStatus = (
        typeof emp.employment_status === 'object'
          ? emp.employment_status?.label || emp.employment_status?.name || ''
          : emp.employment_status || ''
      ).toLowerCase();

      // Combined status string
      const fullStatusStr = `${statusField} ${empStatusField} ${v2EmploymentStatus}`.toLowerCase();

      // Filter: Strictly exclude if marked as resigned, terminated, awol, separated, inactive, etc.
      const isInactive = INACTIVE_STATUS_KEYWORDS.some((kw) => fullStatusStr.includes(kw));
      if (isInactive) {
        continue;
      }

      // 2. Also ensure status is explicitly 'active' if statusField is present
      if (statusField && statusField !== 'active') {
        continue;
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
          assigned: assignedRaw || (location === 'ALL' ? 'ALL LOCATIONS' : location),
          location,
          eventYear: finalEventYear,
          ...(finalEventId ? { eventId: finalEventId, eventCode: finalEventCode } : {}),
          imagePath: pic ? pic : undefined,
        },
        create: {
          employeeId: empId,
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: dept,
          position: pos || null,
          assigned: assignedRaw || (location === 'ALL' ? 'ALL LOCATIONS' : location),
          location,
          eventYear: finalEventYear,
          eventId: finalEventId,
          eventCode: finalEventCode,
          imagePath: pic || null,
          isRegistered: false,
          inWheel: false,
          isWinner: false,
        },
      });

      validEmployeeIds.push(empId);
      importedCount++;
    }

    const sourceLabel =
      source === 'production-live'
        ? 'ABAS v3 Live Master'
        : source === 'production-id' || source === 'production'
        ? 'ABAS v3 ID Badges'
        : 'HRIS V2 (Development)';

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
