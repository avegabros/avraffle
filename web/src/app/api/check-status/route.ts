import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { employeeId, lastName } = await req.json();

    if (!employeeId || !lastName) {
      return NextResponse.json(
        { error: 'Employee ID and Last Name are required' },
        { status: 400 }
      );
    }

    const cleanEmpId = employeeId.trim().toLowerCase();
    const cleanLastName = lastName.trim().toLowerCase();

    // Use raw query with LOWER() to guarantee case-insensitive search across SQLite/PostgreSQL
    const guests = await prisma.$queryRaw<
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
    >`
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
      WHERE LOWER(employee_id) = ${cleanEmpId}
        AND LOWER(last_name) = ${cleanLastName}
      LIMIT 1
    `;

    const guest = guests.length > 0 ? guests[0] : null;

    if (!guest) {
      return NextResponse.json(
        { found: false, message: 'No registration record matching the provided Employee ID and Last Name.' },
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
