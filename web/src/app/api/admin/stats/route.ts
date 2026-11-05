import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location') || undefined;
    const yearStr = searchParams.get('year') || undefined;
    const eventYear = yearStr ? parseInt(yearStr, 10) : undefined;

    const guestWhere: Record<string, unknown> = {};
    if (location && location !== 'ALL') guestWhere.location = location;
    if (eventYear) guestWhere.eventYear = eventYear;

    const prizeWhere: Record<string, unknown> = {};
    if (location && location !== 'ALL') prizeWhere.OR = [{ location }, { location: 'ALL' }];
    if (eventYear) prizeWhere.eventYear = eventYear;

    const [totalGuests, checkedInGuests, activeWheelCount, totalPrizes, grandPrizes, wonPrizes, adminCount] =
      await Promise.all([
        prisma.guest.count({ where: guestWhere }),
        prisma.guest.count({ where: { ...guestWhere, isRegistered: true } }),
        prisma.guest.count({ where: { ...guestWhere, inWheel: true } }),
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
