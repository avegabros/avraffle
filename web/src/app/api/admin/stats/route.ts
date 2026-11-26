import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location') || undefined;
    const yearStr = searchParams.get('year') || undefined;
    const eventYear = yearStr ? parseInt(yearStr, 10) : undefined;
    const eventCode = searchParams.get('eventCode') || globalThis.__raffleWheelSettings?.activeEventCode;

    const guestWhere: Record<string, unknown> = {};
    if (eventCode) {
      guestWhere.OR = [
        { eventCode },
        { eventCode: null, eventYear },
      ];
    } else if (eventYear) {
      guestWhere.eventYear = eventYear;
    }

    if (location && location !== 'ALL') {
      const locCondition = [{ location }, { location: 'ALL' }];
      if (guestWhere.OR) {
        guestWhere.AND = [{ OR: locCondition }];
      } else {
        guestWhere.OR = locCondition;
      }
    }

    const prizeWhere: Record<string, unknown> = {};
    if (eventCode) {
      prizeWhere.OR = [
        { eventCode },
        { eventCode: null, eventYear },
      ];
    } else if (eventYear) {
      prizeWhere.eventYear = eventYear;
    }

    if (location && location !== 'ALL') {
      const locCondition = [{ location }, { location: 'ALL' }];
      if (prizeWhere.OR) {
        prizeWhere.AND = [{ OR: locCondition }];
      } else {
        prizeWhere.OR = locCondition;
      }
    }

    // Active in Wheel eligibility matches /stage wheel:
    // Must be inWheel: true and not already a winner (isWinner: false)
    const activeWheelWhere = {
      ...guestWhere,
      inWheel: true,
      isWinner: false,
    };

    const [totalGuests, checkedInGuests, activeWheelCount, totalPrizes, grandPrizes, wonPrizes, adminCount] =
      await Promise.all([
        prisma.guest.count({ where: guestWhere }),
        prisma.guest.count({ where: { ...guestWhere, isRegistered: true } }),
        prisma.guest.count({ where: activeWheelWhere }),
        prisma.prize.count({ where: prizeWhere }),
        prisma.prize.count({ where: { ...prizeWhere, isGrandPrize: true } }),
        prisma.prize.count({ where: { ...prizeWhere, isWon: true } }),
        prisma.user.count(),
      ]);

    return NextResponse.json({
      stats: {
        totalGuests,
        checkedInGuests,
        activeWheelCount,
        totalPrizes,
        grandPrizes,
        wonPrizes,
        adminCount,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}
