import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const systemLocation = globalThis.__raffleWheelSettings?.activeLocation || 'TAYUD';
    const systemYear = globalThis.__raffleWheelSettings?.activeYear || 2026;

    const queryLocation = searchParams.get('location');
    const location = (queryLocation && queryLocation !== 'ALL') ? queryLocation : undefined;

    const yearStr = searchParams.get('year');
    const eventYear = yearStr ? parseInt(yearStr, 10) : systemYear;

    const guestWhere: Record<string, unknown> = {
      inWheel: true,
      isWinner: false,
      eventYear,
    };
    if (location) {
      guestWhere.location = location;
    }

    const prizeWhere: Record<string, unknown> = {
      isWon: false,
      eventYear,
    };
    if (location) {
      prizeWhere.OR = [{ location }, { location: 'ALL' }];
    }

    const guests = await prisma.guest.findMany({
      where: guestWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        thumbPath: true,
        imagePath: true,
      },
    });

    const segments = guests.map((g) => ({
      id: g.id,
      employeeId: g.employeeId,
      name: `${g.firstName} ${g.lastName}`,
      department: g.department,
      imagePath: g.imagePath || g.thumbPath,
      thumbPath: g.thumbPath || g.imagePath,
    }));

    const availableGrandPrizes = await prisma.prize.findMany({
      where: {
        ...prizeWhere,
        isGrandPrize: true,
      },
    });

    const availableRegularPrizes = await prisma.prize.findMany({
      where: {
        ...prizeWhere,
        isGrandPrize: false,
      },
    });

    return NextResponse.json({
      segments,
      grandPrizes: availableGrandPrizes,
      regularPrizes: availableRegularPrizes,
    });
  } catch (error) {
    console.error('Failed to fetch wheel guests:', error);
    return NextResponse.json({ error: 'Failed to load wheel data' }, { status: 500 });
  }
}
