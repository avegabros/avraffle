import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const employeeId = (body.employeeId || body.guestTag || body.id || '').toString().trim();
    const lastName = (body.lastName || '').toString().trim();
    const fullName = (body.fullName || body.name || '').toString().trim();

    // Check if searching by Guest Tag / ID or by Employee ID + Last Name, or by Full Name / Guest Name
    if (!employeeId && !lastName && !fullName) {
      return NextResponse.json(
        { error: 'Please enter your Employee ID, Guest Tag, or Name to verify eligibility.' },
        { status: 400 }
      );
    }

    const cleanEmpId = employeeId ? employeeId.toLowerCase() : '';
    const cleanLastName = lastName ? lastName.toLowerCase() : '';
    const cleanFullName = fullName ? fullName.toLowerCase() : '';

    // Search query resolution:
    // If the caller passed fullName (or if employeeId was populated with the same string as fullName, e.g. from Guest Mode input)
    // we should prioritize searching by BOTH employee_id (in case it's a tag like GUEST-001) AND full name / first / last name!
    let whereClause = '';

    if (cleanEmpId && cleanLastName) {
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

    // Use raw query with LOWER() to guarantee case-insensitive search across SQLite/PostgreSQL
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
      LIMIT 1
    `);

    const guest = guests.length > 0 ? guests[0] : null;

    if (!guest) {
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

    return NextResponse.json({
      found: true,
      guest: {
        ...guest,
        isRegistered: Boolean(guest.isRegistered),
        inWheel: Boolean(guest.inWheel),
        isWinner: Boolean(guest.isWinner),
        fullName: `${guest.firstName} ${guest.lastName}`,
        avatar: guest.thumbPath || guest.imagePath || null,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
