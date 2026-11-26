import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const systemLocation = globalThis.__raffleWheelSettings?.activeLocation || 'TAYUD';
    const systemYear = globalThis.__raffleWheelSettings?.activeYear || 2026;
    const systemEventCode = globalThis.__raffleWheelSettings?.activeEventCode;

    const queryLocation = searchParams.get('location');
    const location = (queryLocation && queryLocation !== 'ALL') ? queryLocation : undefined;

    const yearStr = searchParams.get('year');
    const eventYear = yearStr ? parseInt(yearStr, 10) : systemYear;
    const eventCode = searchParams.get('eventCode') || systemEventCode;
    const isGrandParam = searchParams.get('isGrand');

    // Determine if the current active draw prize is a Grand Prize
    // Either explicitly passed in query ?isGrand=true or inferred from global stage state
    const isGrandDraw = isGrandParam !== null
      ? isGrandParam === 'true'
      : Boolean(globalThis.__raffleStageState?.isGrand);

    const guestWhere: Record<string, unknown> = {};

    if (isGrandDraw) {
      // GRAND PRIZE ELIGIBILITY (Issue #10):
      // All checked-in / registered participants return to the wheel,
      // including past regular prize winners! Only excluded if they already won a Grand Prize.
      guestWhere.isRegistered = true;
      guestWhere.grandPrizeWon = null;
    } else {
      // REGULAR PRIZE ELIGIBILITY:
      // Must be in wheel and not have won yet
      guestWhere.inWheel = true;
      guestWhere.isWinner = false;
    }

    if (eventCode) {
      guestWhere.OR = [
        { eventCode },
        { eventCode: null, eventYear },
      ];
    } else {
      guestWhere.eventYear = eventYear;
    }

    if (location) {
      const locCondition = [{ location }, { location: 'ALL' }];
      if (guestWhere.OR) {
        guestWhere.AND = [{ OR: locCondition }];
      } else {
        guestWhere.OR = locCondition;
      }
    }

    const prizeWhere: Record<string, unknown> = {
      isWon: false,
      quantity: { gt: 0 },
    };
    if (eventCode) {
      prizeWhere.OR = [
        { eventCode },
        { eventCode: null, eventYear },
      ];
    } else {
      prizeWhere.eventYear = eventYear;
    }

    if (location) {
      const locCondition = [{ location }, { location: 'ALL' }];
      if (prizeWhere.OR) {
        prizeWhere.AND = [{ OR: locCondition }];
      } else {
        prizeWhere.OR = locCondition;
      }
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
      orderBy: [
        { priority: 'desc' },
        { id: 'asc' },
      ],
    });

    const availableRegularPrizes = await prisma.prize.findMany({
      where: {
        ...prizeWhere,
        isGrandPrize: false,
      },
      orderBy: [
        { priority: 'desc' },
        { id: 'asc' },
      ],
    });

    const totalPrizesCount = availableGrandPrizes.length + availableRegularPrizes.length;

    return NextResponse.json({
      segments,
      grandPrizes: availableGrandPrizes,
      regularPrizes: availableRegularPrizes,
      isGrandDraw,
      allPrizesClaimed: totalPrizesCount === 0,
    });
  } catch (error) {
    console.error('Failed to fetch wheel guests:', error);
    return NextResponse.json({ error: 'Failed to load wheel data' }, { status: 500 });
  }
}
