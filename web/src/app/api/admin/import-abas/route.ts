import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Known sea-based / vessel crew positions to exclude
const SEA_BASED_KEYWORDS = [
  'captain',
  'chief mate',
  'second mate',
  'third mate',
  'master',
  'chief engineer',
  'second engineer',
  'third engineer',
  'fourth engineer',
  'oiler',
  'ordinary seaman',
  'able seaman',
  'seaman',
  'bosun',
  'cook',
  'deckhand',
  'wiper',
  'bargeman',
  'quarter master',
  'helmsman',
  'apprentice mate',
  'cadet',
];

// Resigned / inactive status values to strictly exclude
const INACTIVE_STATUSES = [
  'resigned',
  'retired',
  'terminated',
  'separated',
  'on-leave without pay',
  'suspended',
  'preventive suspension',
  'awol',
  'inactive',
];

export async function POST(req: NextRequest) {
  try {
    const {
      apiUrl = 'https://api.avegabros.org/website/id-employees',
      apiKey = 'tMxLOAEnad9heg7fpIZWQrm2F',
      eventYear = 2026,
    } = await req.json();

    // 1. Load the Tayud / Cebu master land-based roster
    const fs = await import('fs');
    const path = await import('path');
    const masterPath = path.join(process.cwd(), 'src', 'data', 'master-employees.json');
    let masterTayudMap = new Map<string, any>();
    if (fs.existsSync(masterPath)) {
      const masterList = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
      for (const m of masterList) {
        if (m.employeeId) masterTayudMap.set(m.employeeId.trim().toUpperCase(), m);
      }
    }

    let rawEmployees: any[] = [];

    // 2. Fetch all active employees from ABAS-API
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
      console.warn('ABAS-API endpoint error, will fallback to local master list:', e);
    }

    // 3. Fallback to master roster if API unreachable
    if (rawEmployees.length === 0 && masterTayudMap.size > 0) {
      rawEmployees = Array.from(masterTayudMap.values());
    }

    if (rawEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No employee records retrieved from ABAS-API' },
        { status: 400 }
      );
    }

    // 4. Filter and Upsert only Land-Based Active Employees
    let importedCount = 0;
    let tayudCount = 0;
    let makatiCount = 0;
    const validEmployeeIds: string[] = [];

    for (const emp of rawEmployees) {
      const empId = (emp.employee_id || emp.employeeId || '').trim();
      const fName = (emp.first_name || emp.firstName || '').trim();
      const lName = (emp.last_name || emp.lastName || '').trim();
      const mName = (emp.middle_name || emp.middleName || '').trim() || null;
      const pos = (emp.position || '').trim();
      const posLower = pos.toLowerCase();
      const comp = (emp.company || '').trim();
      const statusLower = ((emp.employee_status || emp.status || '') as string).toLowerCase();

      if (!empId || !fName || !lName) continue;

      // Filter: Exclude resigned, terminated, or inactive
      if (INACTIVE_STATUSES.some((s) => statusLower.includes(s))) {
        continue;
      }

      // Check if employee is in the verified Tayud / Cebu master roster
      const inTayudMaster = masterTayudMap.get(empId.toUpperCase());

      // Filter: Exclude Sea-Based / Vessel Crew
      const isSeaBased = SEA_BASED_KEYWORDS.some((kw) => posLower.includes(kw));
      if (isSeaBased && !inTayudMaster) {
        continue;
      }

      // Determine Location:
      // - If in Tayud/Cebu master roster -> TAYUD
      // - Otherwise -> MAKATI (Office based)
      let location: 'TAYUD' | 'MAKATI' = 'MAKATI';
      let dept = comp || 'Administration';

      if (inTayudMaster) {
        location = 'TAYUD';
        dept = inTayudMaster.department || comp || 'Operations';
        tayudCount++;
      } else {
        location = 'MAKATI';
        makatiCount++;
      }

      const pic = emp.picture || null;

      await prisma.guest.upsert({
        where: { employeeId: empId },
        update: {
          firstName: fName,
          lastName: lName,
          middleName: mName,
          department: dept,
          position: pos || inTayudMaster?.position || null,
          assigned: location === 'TAYUD' ? (inTayudMaster?.assigned || 'TAYUD') : 'MAKATI OFFICE',
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
          position: pos || inTayudMaster?.position || null,
          assigned: location === 'TAYUD' ? (inTayudMaster?.assigned || 'TAYUD') : 'MAKATI OFFICE',
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

    // 5. Purge any Sea-Based Crew records previously imported
    if (validEmployeeIds.length > 0) {
      await prisma.guest.deleteMany({
        where: {
          employeeId: {
            notIn: validEmployeeIds,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      importedCount,
      tayudCount,
      makatiCount,
      message: `Clean sync complete! Total land-based: ${importedCount} (Tayud/Cebu: ${tayudCount}, Makati: ${makatiCount}). Purged sea crew.`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to sync employees from ABAS-API' }, { status: 500 });
  }
}
