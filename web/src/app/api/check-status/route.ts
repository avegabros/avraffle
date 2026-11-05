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

    const guest = await prisma.guest.findFirst({
      where: {
        employeeId: employeeId.trim(),
        lastName: {
          equals: lastName.trim(),
        },
      },
      select: {
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        location: true,
        eventYear: true,
        isRegistered: true,
        inWheel: true,
        isWinner: true,
        prizeWon: true,
        thumbPath: true,
        imagePath: true,
        registeredOn: true,
      },
    });

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
        fullName: `${guest.firstName} ${guest.lastName}`,
        avatar: guest.thumbPath || guest.imagePath || null,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
