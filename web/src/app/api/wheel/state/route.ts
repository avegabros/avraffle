import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// In-memory stage state
declare global {
  // eslint-disable-next-line no-var
  var __raffleStageState: {
    status: 'IDLE' | 'SPINNING';
    spinTriggerCount: number;
    reloadGuestsCount: number;
    prizeName: string;
    prizeImagePath?: string | null;
    isGrand: boolean;
    grandPrizeId: number | null;
    targetWinnerId?: number | null;
    location: string;
    eventYear: number;
    timestamp: number;
    winner: {
      id: number;
      employeeId: string;
      name: string;
      department?: string | null;
      imagePath?: string | null;
    } | null;
  } | undefined;
}

export async function getNextAvailablePrize(location = 'TAYUD', eventYear = 2026) {
  try {
    const baseWhere = {
      isWon: false,
      quantity: { gt: 0 },
      eventYear,
      OR: [{ location }, { location: 'ALL' }],
    };

    // 1. As long as standard/regular prizes are available, select from regular prizes first
    const regularPrize = await prisma.prize.findFirst({
      where: {
        ...baseWhere,
        isGrandPrize: false,
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority queues first
        { id: 'asc' },
      ],
    });

    if (regularPrize) {
      return {
        prizeName: regularPrize.name,
        prizeImagePath: regularPrize.imagePath,
        isGrand: false,
        grandPrizeId: null,
      };
    }

    // 2. Only when all regular prizes are exhausted, auto-queue the Grand Prize
    const grandPrize = await prisma.prize.findFirst({
      where: {
        ...baseWhere,
        isGrandPrize: true,
      },
      orderBy: [
        { priority: 'desc' },
        { id: 'asc' },
      ],
    });

    if (grandPrize) {
      return {
        prizeName: grandPrize.name,
        prizeImagePath: grandPrize.imagePath,
        isGrand: true,
        grandPrizeId: grandPrize.id,
      };
    }
  } catch (err) {
    console.error('Failed to get next available prize:', err);
  }
  return {
    prizeName: 'All Prizes Claimed!',
    prizeImagePath: null,
    isGrand: false,
    grandPrizeId: null,
  };
}

async function getInitialPrize(location = 'TAYUD', eventYear = 2026) {
  return getNextAvailablePrize(location, eventYear);
}

if (!globalThis.__raffleStageState) {
  globalThis.__raffleStageState = {
    status: 'IDLE',
    spinTriggerCount: 0,
    reloadGuestsCount: 0,
    prizeName: 'General Raffle Prize',
    prizeImagePath: null,
    isGrand: false,
    grandPrizeId: null,
    location: 'TAYUD',
    eventYear: 2026,
    timestamp: Date.now(),
    winner: null,
  };
}

// GET: Stage polls or mobile checks status
export async function GET() {
  const currentState = globalThis.__raffleStageState!;
  // Include settings directly in the state payload to cut polling traffic in half!
  const settings = globalThis.__raffleWheelSettings;
  return NextResponse.json({
    state: currentState,
    settings: settings || null,
  });
}

// POST: Mobile app triggers spin, selects prize, or stage updates winner
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentState = globalThis.__raffleStageState!;

    if (body.action === 'SPIN') {
      currentState.status = 'SPINNING';
      currentState.spinTriggerCount += 1;
      currentState.prizeName = body.prizeName || currentState.prizeName;
      currentState.prizeImagePath = body.prizeImagePath !== undefined ? body.prizeImagePath : currentState.prizeImagePath;
      currentState.isGrand = body.isGrand ?? currentState.isGrand;
      currentState.grandPrizeId = body.grandPrizeId ?? currentState.grandPrizeId;
      currentState.targetWinnerId = body.targetWinnerId ?? null;
      currentState.timestamp = Date.now();
      currentState.winner = null;
    } else if (body.action === 'WINNER_ANNOUNCED') {
      currentState.status = 'IDLE';
      currentState.winner = body.winner || null;
      currentState.timestamp = Date.now();
    } else if (body.action === 'SELECT_PRIZE') {
      currentState.prizeName = body.prizeName;
      currentState.prizeImagePath = body.prizeImagePath !== undefined ? body.prizeImagePath : null;
      currentState.isGrand = body.isGrand ?? false;
      currentState.grandPrizeId = body.grandPrizeId ?? null;
      if (body.location) currentState.location = body.location;
      if (body.eventYear) currentState.eventYear = body.eventYear;
      currentState.timestamp = Date.now();
    } else if (body.action === 'RESET_TO_AUTO_QUEUE') {
      const activeLoc = body.location || currentState.location || 'TAYUD';
      const activeYr = body.eventYear || currentState.eventYear || 2026;
      const next = await getNextAvailablePrize(activeLoc, activeYr);
      currentState.prizeName = next.prizeName;
      currentState.prizeImagePath = next.prizeImagePath;
      currentState.isGrand = next.isGrand;
      currentState.grandPrizeId = next.grandPrizeId;
      currentState.timestamp = Date.now();
    } else if (body.action === 'SET_LOCATION') {
      if (body.location) currentState.location = body.location;
      if (body.eventYear) currentState.eventYear = body.eventYear;
      currentState.timestamp = Date.now();
    } else if (body.action === 'RESPIN') {
      currentState.status = 'IDLE';
      currentState.winner = null;
      currentState.timestamp = Date.now();
    } else if (body.action === 'CLOSE_MODAL') {
      currentState.winner = null;
      currentState.timestamp = Date.now();
    } else if (body.action === 'CONFIRM_CLAIMED') {
      currentState.winner = null;
      currentState.status = 'IDLE';
      currentState.reloadGuestsCount = (currentState.reloadGuestsCount || 0) + 1;
      currentState.timestamp = Date.now();
    }

    return NextResponse.json({ success: true, state: currentState });
  } catch (error) {
    console.error('Spin state error:', error);
    return NextResponse.json({ error: 'Failed to update spin state' }, { status: 500 });
  }
}
