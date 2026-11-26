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

    // Build flexible query matching both employees and non-employee guests:
    // 1. If employeeId + lastName provided: match exactly or prefix
    // 2. If only employeeId provided (e.g. "GUEST-001" or ID badge): match employeeId
    // 3. If fullName or single name provided: match full name or guest entry
    let whereClause = '';
    const params: any[] = [];

    if (cleanEmpId && cleanLastName) {
      // Standard employee lookup OR guest with assigned ID & last name
      whereClause = `(LOWER(employee_id) = ${JSON.stringify(cleanEmpId)} AND LOWER(last_name) = ${JSON.stringify(cleanLastName)})
        OR (LOWER(employee_id) = ${JSON.stringify(cleanEmpId)})`;
    } else if (cleanEmpId) {
      // Direct ID or Guest Tag lookup (e.g. GUEST-001, EMP-101, etc.)
      whereClause = `LOWER(employee_id) = ${JSON.stringify(cleanEmpId)}
        OR LOWER(employee_id) LIKE ${JSON.stringify('%' + cleanEmpId + '%')}`;
    } else if (cleanFullName) {
      whereClause = `LOWER(first_name || ' ' || last_name) LIKE ${JSON.stringify('%' + cleanFullName + '%')}
        OR LOWER(last_name) = ${JSON.stringify(cleanFullName)}
        OR LOWER(first_name) = ${JSON.stringify(cleanFullName)}`;
    } else if (cleanLastName) {
      whereClause = `LOWER(last_name) = ${JSON.stringify(cleanLastName)}`;
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
        CASE WHEN LOWER(employee_id) = ${JSON.stringify(cleanEmpId)} THEN 0 ELSE 1 END,
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
