import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const employeeId = (body.employeeId || body.guestTag || body.id || '').toString().trim();
    const lastName = (body.lastName || '').toString().trim();
    const fullName = (body.fullName || body.name || '').toString().trim();
    const selectedGuestId = body.guestId ? parseInt(body.guestId, 10) : undefined;

    // Check if searching by Guest Tag / ID or by Employee ID + Last Name, or by Full Name / Guest Name
    if (!selectedGuestId && !employeeId && !lastName && !fullName) {
      return NextResponse.json(
        { error: 'Please enter your Employee ID, Guest Tag, or Name to verify eligibility.' },
        { status: 400 }
      );
    }

    const cleanEmpId = employeeId ? employeeId.toLowerCase() : '';
    const cleanLastName = lastName ? lastName.toLowerCase() : '';
    const cleanFullName = fullName ? fullName.toLowerCase() : '';

    let whereClause = '';

    if (selectedGuestId) {
      // Direct exact profile selection from disambiguation list
      whereClause = `id = ${selectedGuestId}`;
    } else if (cleanEmpId && cleanLastName) {
      // Standard employee lookup: match ID and last name, or exact employee ID
      whereClause = `(LOWER(employee_id) = ${JSON.stringify(cleanEmpId)} AND LOWER(last_name) = ${JSON.stringify(cleanLastName)})
        OR (LOWER(employee_id) = ${JSON.stringify(cleanEmpId)})`;
    } else {
      // Search term can be either ID / Guest Tag OR Full Name / Name
      const searchTerms = Array.from(new Set([cleanEmpId, cleanFullName])).filter(Boolean);
      
      const conditions: string[] = [];
      for (const term of searchTerms) {
        const escapedTerm = JSON.stringify(term);
        const escapedLike = JSON.stringify(`%${term}%`);
        
        // Match exact or substring on employee_id / tag
        conditions.push(`LOWER(employee_id) = ${escapedTerm}`);
        conditions.push(`LOWER(employee_id) LIKE ${escapedLike}`);
        
        // Match full name: "first_name last_name" or "first_name middle_name last_name" or "last_name, first_name"
        conditions.push(`LOWER(first_name || ' ' || last_name) LIKE ${escapedLike}`);
        conditions.push(`LOWER(first_name || ' ' || COALESCE(middle_name, '') || ' ' || last_name) LIKE ${escapedLike}`);
        conditions.push(`LOWER(last_name || ', ' || first_name) LIKE ${escapedLike}`);
        conditions.push(`LOWER(last_name || ' ' || first_name) LIKE ${escapedLike}`);
        
        // Match single first or last name
        conditions.push(`LOWER(last_name) = ${escapedTerm}`);
        conditions.push(`LOWER(first_name) = ${escapedTerm}`);
        conditions.push(`LOWER(last_name) LIKE ${escapedLike}`);
        conditions.push(`LOWER(first_name) LIKE ${escapedLike}`);

        // If multi-word search term (e.g. "John Ondangan"), also split words to match both first and last
        const words = term.split(/\s+/).filter((w: string) => w.length > 1);
        if (words.length >= 2) {
          const wordConditions = words.map((w: string) => {
            const ew = JSON.stringify(`%${w}%`);
            return `(LOWER(first_name) LIKE ${ew} OR LOWER(last_name) LIKE ${ew} OR LOWER(COALESCE(middle_name, '')) LIKE ${ew})`;
          }).join(' AND ');
          conditions.push(`(${wordConditions})`);
        }
      }

      if (cleanLastName) {
        conditions.push(`LOWER(last_name) = ${JSON.stringify(cleanLastName)}`);
      }

      whereClause = conditions.join(' OR ');
    }

    // Query up to 10 matching records to detect duplicates / multiple people with the same name
    const guests = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        employeeId: string;
        firstName: string;
        middleName: string | null;
        lastName: string;
        department: string | null;
        position: string | null;
        location: string;
        eventYear: number;
        isRegistered: number | boolean;
        inWheel: number | boolean;
        isWinner: number | boolean;
        prizeWon: string | null;
        thumbPath: string | null;
        imagePath: string | null;
        registeredOn: string | Date;
      }>
    >(`
      SELECT 
        id,
        employee_id as employeeId,
        first_name as firstName,
        middle_name as middleName,
        last_name as lastName,
        department,
        position,
        location,
        event_year as eventYear,
        stat as isRegistered,
        wheel as inWheel,
        winner as isWinner,
        prize as prizeWon,
        thumb_image as thumbPath,
        image as imagePath,
        registered_on as registeredOn
      FROM guest
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN LOWER(employee_id) = ${JSON.stringify(cleanEmpId)} THEN 0
          WHEN LOWER(first_name || ' ' || last_name) = ${JSON.stringify(cleanFullName || cleanEmpId)} THEN 1
          WHEN LOWER(last_name) = ${JSON.stringify(cleanFullName || cleanEmpId)} THEN 2
          ELSE 3
        END,
        id DESC
      LIMIT 10
    `);

    if (guests.length === 0) {
      return NextResponse.json(
        { 
          found: false, 
          message: employeeId && lastName 
            ? 'No registration record matching the provided ID and Last Name.'
            : 'No attendee or guest record found. Please verify your details or visit the registration desk.' 
        },
        { status: 404 }
      );
    }

    // Format single attendee record
    const formatGuest = (g: (typeof guests)[0]) => ({
      ...g,
      isRegistered: Boolean(g.isRegistered),
      inWheel: Boolean(g.inWheel),
      isWinner: Boolean(g.isWinner),
      fullName: `${g.firstName} ${g.lastName}`,
      avatar: g.thumbPath || g.imagePath || null,
    });

    // Exact ID match check: If user typed their exact employeeId, return it directly
    const exactIdMatch = cleanEmpId ? guests.find(g => g.employeeId.toLowerCase() === cleanEmpId) : null;
    if (exactIdMatch && !cleanFullName) {
      return NextResponse.json({
        found: true,
        multiple: false,
        guest: formatGuest(exactIdMatch),
      });
    }

    // If explicit profile was selected or only 1 match found, return directly
    if (selectedGuestId || guests.length === 1) {
      return NextResponse.json({
        found: true,
        multiple: false,
        guest: formatGuest(guests[0]),
      });
    }

    // MULTIPLE MATCHES DETECTED:
    // If the top 1 result is an EXACT 100% full name match and none of the other results share the exact full name,
    // we can return it. Otherwise, return the disambiguation list!
    const exactFullNameMatches = guests.filter(
      g => `${g.firstName} ${g.lastName}`.toLowerCase() === (cleanFullName || cleanEmpId)
    );

    if (exactFullNameMatches.length === 1) {
      return NextResponse.json({
        found: true,
        multiple: false,
        guest: formatGuest(exactFullNameMatches[0]),
      });
    }

    // Return multiple candidates for user selection
    return NextResponse.json({
      found: true,
      multiple: true,
      matches: guests.map((g) => ({
        id: g.id,
        employeeId: g.employeeId,
        firstName: g.firstName,
        middleName: g.middleName,
        lastName: g.lastName,
        fullName: `${g.firstName} ${g.lastName}`,
        department: g.department,
        position: g.position,
        location: g.location,
        eventYear: g.eventYear,
        avatar: g.thumbPath || g.imagePath || null,
      })),
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
