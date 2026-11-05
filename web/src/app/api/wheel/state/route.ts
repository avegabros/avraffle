import { NextRequest, NextResponse } from 'next/server';

// In-memory stage state
declare global {
  // eslint-disable-next-line no-var
  var __raffleStageState: {
    status: 'IDLE' | 'SPINNING';
    spinTriggerCount: number;
    prizeName: string;
    prizeImagePath?: string | null;
    isGrand: boolean;
    grandPrizeId: number | null;
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

if (!globalThis.__raffleStageState) {
  globalThis.__raffleStageState = {
    status: 'IDLE',
    spinTriggerCount: 0,
    prizeName: '1 Sack 5 kl Rice',
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
  return NextResponse.json({ state: globalThis.__raffleStageState });
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
      currentState.timestamp = Date.now();
    }

    return NextResponse.json({ success: true, state: currentState });
  } catch (error) {
    console.error('Spin state error:', error);
    return NextResponse.json({ error: 'Failed to update spin state' }, { status: 500 });
  }
}
