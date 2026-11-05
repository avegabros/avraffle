import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { guestId, prizeName, grandPrizeId } = await req.json();

    if (!guestId) {
      return NextResponse.json({ error: 'guestId is required' }, { status: 400 });
    }

    const now = new Date();

    // 1. Mark guest as winner
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        inWheel: false,
        isWinner: true,
        prizeWon: prizeName || 'Regular Prize',
        winOn: now,
      },
    });

    // 2. If grand prize, mark prize as won
    if (grandPrizeId) {
      await prisma.prize.update({
        where: { id: grandPrizeId },
        data: {
          isWon: true,
          wonByGuestId: guestId,
          wonOn: now,
        },
      });
    } else if (prizeName) {
      // Find matching regular prize by name for current location and mark one unit won
      const activeLoc = globalThis.__raffleWheelSettings?.activeLocation || updatedGuest.location || 'TAYUD';
      const activeYr = globalThis.__raffleWheelSettings?.activeYear || updatedGuest.eventYear || 2026;

      const regularPrize = await prisma.prize.findFirst({
        where: {
          name: prizeName,
          isGrandPrize: false,
          isWon: false,
          eventYear: activeYr,
          OR: [{ location: activeLoc }, { location: 'ALL' }],
        },
      });

      if (regularPrize) {
        if (regularPrize.quantity > 1) {
          await prisma.prize.update({
            where: { id: regularPrize.id },
            data: { quantity: regularPrize.quantity - 1 },
          });
        } else {
          await prisma.prize.update({
            where: { id: regularPrize.id },
            data: {
              isWon: true,
              wonByGuestId: guestId,
              wonOn: now,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, guest: updatedGuest });
  } catch (error) {
    console.error('Failed to confirm winner:', error);
    return NextResponse.json({ error: 'Failed to record winner' }, { status: 500 });
  }
}
