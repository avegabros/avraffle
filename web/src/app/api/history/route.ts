import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location'); // TAYUD, MAKATI, ALL
    const requestedEvent = searchParams.get('event'); // can be eventCode or year
    const requestedYear = searchParams.get('year') || '2026';

    const activeSettings = globalThis.__raffleWheelSettings;
    const activeCode = activeSettings?.activeEventCode || 'XMAS-2026';
    const activeYear = String(activeSettings?.activeYear || '2026');

    // 1. Fetch all DB events
    const dbEvents = await prisma.event.findMany({
      orderBy: [{ year: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        code: true,
        name: true,
        year: true,
        isActive: true,
        isArchived: true,
      },
    });

    // 2. Discover archive folders from public/winners
    const winnersDir = path.join(process.cwd(), 'public', 'winners');
    const diskFolders = fs.existsSync(winnersDir)
      ? fs
          .readdirSync(winnersDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];

    // Build event options list: prioritize db events, add legacy disk folders
    const eventOptions: Array<{ code: string; label: string; year: number; isActive: boolean }> = [];
    const seenCodes = new Set<string>();

    for (const ev of dbEvents) {
      eventOptions.push({
        code: ev.code,
        label: `${ev.name} (${ev.year})`,
        year: ev.year,
        isActive: ev.isActive,
      });
      seenCodes.add(ev.code);
    }

    for (const folder of diskFolders) {
      if (!seenCodes.has(folder)) {
        const isNumYear = /^\d{4}$/.test(folder);
        eventOptions.push({
          code: folder,
          label: isNumYear ? `Annual Raffle ${folder}` : folder,
          year: isNumYear ? parseInt(folder, 10) : 2026,
          isActive: folder === activeCode || folder === activeYear,
        });
        seenCodes.add(folder);
      }
    }

    // Determine target selection
    const selectedKey = requestedEvent || (requestedYear ? requestedYear : activeCode);

    // Is this the current active live event or active year?
    const isLive = selectedKey === activeCode || selectedKey === activeYear || selectedKey === '2026';

    let winners: any[] = [];

    if (isLive) {
      // Query LIVE database winners
      const whereClause: Record<string, unknown> = {
        isWinner: true,
      };

      // Match either by eventCode or fallback to eventYear
      const matchedDbEvent = dbEvents.find((e) => e.code === selectedKey);
      if (matchedDbEvent) {
        whereClause.OR = [
          { eventId: matchedDbEvent.id },
          { eventCode: matchedDbEvent.code },
          { eventCode: null, eventYear: matchedDbEvent.year },
        ];
      } else {
        whereClause.eventYear = parseInt(selectedKey, 10) || 2026;
      }

      if (location && location !== 'ALL') {
        const locCondition = [{ location }, { location: 'ALL' }];
        if (whereClause.OR) {
          whereClause.AND = [{ OR: locCondition }];
        } else {
          whereClause.OR = locCondition;
        }
      }

      const liveWinners = await prisma.guest.findMany({
        where: whereClause,
        orderBy: { winOn: 'desc' },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          department: true,
          position: true,
          location: true,
          prizeWon: true,
          winOn: true,
          imagePath: true,
          thumbPath: true,
          grandPrizeWon: {
            select: {
              id: true,
              name: true,
              isGrandPrize: true,
              imagePath: true,
            },
          },
        },
      });

      // Also fetch all grand prizes in this event to cross-match by prize name if wonByGuestId was omitted
      const allGrandPrizes = await prisma.prize.findMany({
        where: {
          isGrandPrize: true,
          ...(whereClause.eventYear ? { eventYear: whereClause.eventYear as number } : {}),
        },
        select: { name: true },
      });
      const grandPrizeNames = new Set(allGrandPrizes.map((p) => p.name.toLowerCase().trim()));

      winners = liveWinners.map((w) => {
        const prizeName = w.prizeWon || 'Raffle Prize';
        const isGrand = Boolean(
          (w.grandPrizeWon && w.grandPrizeWon.isGrandPrize) ||
          grandPrizeNames.has(prizeName.toLowerCase().trim()) ||
          prizeName.toLowerCase().includes('grand')
        );

        return {
          id: w.id,
          employeeId: w.employeeId,
          fullName: `${w.firstName} ${w.lastName}`,
          department: w.department,
          position: w.position,
          location: w.location,
          prize: prizeName,
          isGrand,
          winOn: w.winOn ? w.winOn.toISOString() : new Date().toISOString(),
          avatar: w.imagePath || w.thumbPath || null,
        };
      });
    } else {
      // Query archived disk records
      let jsonPath = path.join(winnersDir, selectedKey, 'data.json');
      if (!fs.existsSync(jsonPath)) {
        // Try fallback year folder
        const matchedDbEvent = dbEvents.find((e) => e.code === selectedKey);
        if (matchedDbEvent) {
          jsonPath = path.join(winnersDir, String(matchedDbEvent.year), 'data.json');
        }
      }

      if (fs.existsSync(jsonPath)) {
        winners = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (location && location !== 'ALL') {
          winners = winners.filter((w) => !w.location || w.location === location);
        }
      }
    }

    return NextResponse.json({
      selectedEvent: selectedKey,
      year: requestedYear,
      location: location || 'ALL',
      eventOptions,
      availableYears: Array.from(new Set(eventOptions.map((e) => String(e.year)))).sort((a, b) => b.localeCompare(a)),
      winners,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// POST: Reset winners history for testing or new draw run
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventYear = body.year ? parseInt(String(body.year), 10) : 2026;
    const eventCode = body.eventCode;
    const location = body.location; // optional filter

    const guestWhere: Record<string, unknown> = {
      isWinner: true,
    };
    if (eventCode) {
      guestWhere.OR = [
        { eventCode },
        { eventCode: null, eventYear },
      ];
    } else {
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

    // 1. Reset winning guests back to eligible (inWheel = true if registered)
    const resetGuests = await prisma.guest.updateMany({
      where: guestWhere,
      data: {
        isWinner: false,
        prizeWon: null,
        winOn: null,
        inWheel: true,
      },
    });

    // 2. Reset prize won statuses back to available
    const prizeWhere: Record<string, unknown> = {};
    if (eventCode) {
      prizeWhere.OR = [
        { eventCode },
        { eventCode: null, eventYear },
      ];
    } else {
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

    await prisma.prize.updateMany({
      where: prizeWhere,
      data: {
        isWon: false,
        wonByGuestId: null,
        wonOn: null,
      },
    });

    // 3. Reset in-memory stage state
    if (globalThis.__raffleStageState) {
      globalThis.__raffleStageState.winner = null;
      globalThis.__raffleStageState.status = 'IDLE';
      globalThis.__raffleStageState.reloadGuestsCount = (globalThis.__raffleStageState.reloadGuestsCount || 0) + 1;
      globalThis.__raffleStageState.timestamp = Date.now();
    }

    return NextResponse.json({
      success: true,
      eventYear,
      eventCode,
      resetGuestsCount: resetGuests.count,
      message: `Reset ${resetGuests.count} winners for event ${eventCode || eventYear}. Attendees returned to wheel and prizes restored!`,
    });
  } catch (error) {
    console.error('History reset error:', error);
    return NextResponse.json({ error: 'Failed to reset history' }, { status: 500 });
  }
}
