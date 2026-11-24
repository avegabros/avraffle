import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getNextAvailablePrize } from '@/app/api/wheel/state/route';

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

    const activeLoc = globalThis.__raffleWheelSettings?.activeLocation || updatedGuest.location || 'TAYUD';
    const activeYr = globalThis.__raffleWheelSettings?.activeYear || updatedGuest.eventYear || 2026;
    const activeEventCode = globalThis.__raffleWheelSettings?.activeEventCode || updatedGuest.eventCode;

    // 2. Decrement prize quantity or mark as won
    if (grandPrizeId) {
      const grandPrize = await prisma.prize.findUnique({
        where: { id: grandPrizeId },
      });

      if (grandPrize) {
        if (grandPrize.quantity > 1) {
          await prisma.prize.update({
            where: { id: grandPrize.id },
            data: {
              quantity: grandPrize.quantity - 1,
            },
          });
        } else {
          await prisma.prize.update({
            where: { id: grandPrize.id },
            data: {
              quantity: 0,
              isWon: true,
              wonByGuestId: guestId,
              wonOn: now,
            },
          });
        }
      }
    } else if (prizeName) {
      // Find matching regular prize by name for current event/location and mark one unit won
      const prizeWhere: any = {
        name: prizeName,
        isGrandPrize: false,
        isWon: false,
        ...(activeLoc && activeLoc !== 'ALL' ? { OR: [{ location: activeLoc }, { location: 'ALL' }] } : {}),
      };
      if (activeEventCode) {
        prizeWhere.AND = [
          {
            OR: [
              { eventCode: activeEventCode },
              { eventCode: null, eventYear: activeYr },
            ],
          },
        ];
      } else {
        prizeWhere.eventYear = activeYr;
      }

      const regularPrize = await prisma.prize.findFirst({
        where: prizeWhere,
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
              quantity: 0,
              isWon: true,
              wonByGuestId: guestId,
              wonOn: now,
            },
          });
        }
      }
    }

    // 3. Auto-queue next available prize if current prize ran out & trigger stage guest reload
    if (globalThis.__raffleStageState) {
      globalThis.__raffleStageState.winner = null;
      globalThis.__raffleStageState.status = 'IDLE';
      globalThis.__raffleStageState.reloadGuestsCount = (globalThis.__raffleStageState.reloadGuestsCount || 0) + 1;
      
      // Check if current prize still has remaining quantity
      const remWhere: any = {
        name: globalThis.__raffleStageState.prizeName,
        isWon: false,
        quantity: { gt: 0 },
        ...(activeLoc && activeLoc !== 'ALL' ? { OR: [{ location: activeLoc }, { location: 'ALL' }] } : {}),
      };
      if (activeEventCode) {
        remWhere.AND = [
          {
            OR: [
              { eventCode: activeEventCode },
              { eventCode: null, eventYear: activeYr },
            ],
          },
        ];
      } else {
        remWhere.eventYear = activeYr;
      }

      const remainingPrize = await prisma.prize.findFirst({
        where: remWhere,
      });

      if (!remainingPrize) {
        // Auto advance to next prize by priority
        const nextPrize = await getNextAvailablePrize(activeLoc, activeYr, activeEventCode || undefined);
        globalThis.__raffleStageState.prizeName = nextPrize.prizeName;
        globalThis.__raffleStageState.prizeImagePath = nextPrize.prizeImagePath;
        globalThis.__raffleStageState.isGrand = nextPrize.isGrand;
        globalThis.__raffleStageState.grandPrizeId = nextPrize.grandPrizeId;
        globalThis.__raffleStageState.allPrizesClaimed = nextPrize.allPrizesClaimed;
      }
      globalThis.__raffleStageState.timestamp = Date.now();
    }

    return NextResponse.json({ success: true, guest: updatedGuest, nextPrize: globalThis.__raffleStageState?.prizeName });
  } catch (error) {
    console.error('Failed to confirm winner:', error);
    return NextResponse.json({ error: 'Failed to record winner' }, { status: 500 });
  }
}
