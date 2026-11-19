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
    eventCode?: string;
    timestamp: number;
    stageActive?: boolean;
    stageHeartbeat?: number;
    masterSessionId?: string | null;
    masterHeartbeat?: number;
    winner: {
      id: number;
      employeeId: string;
      name: string;
      department?: string | null;
      imagePath?: string | null;
    } | null;
  } | undefined;
}

export async function getNextAvailablePrize(location = 'TAYUD', eventYear = 2026, eventCode?: string) {
  try {
    const baseWhere: any = {
      isWon: false,
      quantity: { gt: 0 },
      OR: [{ location }, { location: 'ALL' }],
    };

    if (eventCode) {
      baseWhere.AND = [
        {
          OR: [
            { eventCode },
            { eventCode: null, eventYear },
          ],
        },
      ];
    } else {
      baseWhere.eventYear = eventYear;
    }

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
    stageActive: false,
    stageHeartbeat: 0,
    masterSessionId: null,
    masterHeartbeat: 0,
    winner: null,
  };
}

// GET: Stage polls or mobile checks status
export async function GET(req: NextRequest) {
  const currentState = globalThis.__raffleStageState!;
  const now = Date.now();
  // Check if stage is currently considered alive (heartbeat within 5 seconds)
  const isStageAlive = Boolean(
    currentState.stageHeartbeat && now - currentState.stageHeartbeat < 5000
  );
  currentState.stageActive = isStageAlive;

  // Master lease validity check (5000ms TTL)
  const isMasterAlive = Boolean(
    currentState.masterSessionId &&
    currentState.masterHeartbeat &&
    now - currentState.masterHeartbeat < 5000
  );
  if (!isMasterAlive) {
    currentState.masterSessionId = null;
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  // Include settings directly in the state payload to cut polling traffic in half!
  const settings = globalThis.__raffleWheelSettings;
  return NextResponse.json({
    state: currentState,
    settings: settings || null,
    isMaster: sessionId ? currentState.masterSessionId === sessionId : false,
  });
}

// POST: Mobile app triggers spin, selects prize, or stage updates winner
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentState = globalThis.__raffleStageState!;
    const now = Date.now();

    if (body.action === 'STAGE_HEARTBEAT') {
      currentState.stageActive = true;
      currentState.stageHeartbeat = now;

      const clientSessionId = body.sessionId;
      if (clientSessionId) {
        const isCurrentMasterValid = Boolean(
          currentState.masterSessionId &&
          currentState.masterHeartbeat &&
          now - currentState.masterHeartbeat < 5000
        );

        if (!isCurrentMasterValid || currentState.masterSessionId === clientSessionId) {
          // Claim or renew lock
          currentState.masterSessionId = clientSessionId;
          currentState.masterHeartbeat = now;
        }
      }
    } else if (body.action === 'TAKE_OVER_MASTER') {
      const clientSessionId = body.sessionId;
      if (clientSessionId) {
        currentState.masterSessionId = clientSessionId;
        currentState.masterHeartbeat = now;
        currentState.stageActive = true;
        currentState.stageHeartbeat = now;
      }
    } else if (body.action === 'RELEASE_MASTER') {
      const clientSessionId = body.sessionId;
      if (clientSessionId && currentState.masterSessionId === clientSessionId) {
        currentState.masterSessionId = null;
        currentState.masterHeartbeat = 0;
      }
    } else if (body.action === 'SPIN') {
      // ATOMIC SPIN GUARD: Reject if wheel is already spinning or within minimum lock window
      const isAlreadySpinning = currentState.status === 'SPINNING';
      const timeSinceLastSpin = now - (currentState.timestamp || 0);

      if (isAlreadySpinning && timeSinceLastSpin < 12000) {
        return NextResponse.json(
          {
            success: false,
            error: 'Wheel is already spinning! Please wait for the current draw to finish.',
            state: currentState,
          },
          { status: 409 }
        );
      }

      currentState.status = 'SPINNING';
      currentState.spinTriggerCount += 1;
      currentState.prizeName = body.prizeName || currentState.prizeName;
      currentState.prizeImagePath = body.prizeImagePath !== undefined ? body.prizeImagePath : currentState.prizeImagePath;
      currentState.isGrand = body.isGrand ?? currentState.isGrand;
      currentState.grandPrizeId = body.grandPrizeId ?? currentState.grandPrizeId;
      currentState.targetWinnerId = body.targetWinnerId ?? null;
      currentState.timestamp = now;
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
      if (body.eventCode) currentState.eventCode = body.eventCode;
      currentState.timestamp = Date.now();
    } else if (body.action === 'RESET_TO_AUTO_QUEUE') {
      const activeLoc = body.location || currentState.location || 'TAYUD';
      const activeYr = body.eventYear || currentState.eventYear || 2026;
      const activeCode = body.eventCode || currentState.eventCode;
      const next = await getNextAvailablePrize(activeLoc, activeYr, activeCode);
      currentState.prizeName = next.prizeName;
      currentState.prizeImagePath = next.prizeImagePath;
      currentState.isGrand = next.isGrand;
      currentState.grandPrizeId = next.grandPrizeId;
      currentState.timestamp = Date.now();
    } else if (body.action === 'SET_LOCATION') {
      if (body.location) currentState.location = body.location;
      if (body.eventYear) currentState.eventYear = body.eventYear;
      if (body.eventCode) currentState.eventCode = body.eventCode;
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

    const clientSessionId = body.sessionId;
    return NextResponse.json({
      success: true,
      state: currentState,
      isMaster: clientSessionId ? currentState.masterSessionId === clientSessionId : false,
    });
  } catch (error) {
    console.error('Spin state error:', error);
    return NextResponse.json({ error: 'Failed to update spin state' }, { status: 500 });
  }
}
