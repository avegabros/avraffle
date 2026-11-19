import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processAndSavePhoto } from '@/lib/sharp';
import { getNextAvailablePrize } from '@/app/api/wheel/state/route';

async function refreshWheelStageState(location?: string, eventYear?: number, eventCode?: string) {
  if (!globalThis.__raffleStageState) return;
  try {
    const activeLoc = location || globalThis.__raffleStageState.location || globalThis.__raffleWheelSettings?.activeLocation || 'TAYUD';
    const activeYr = eventYear || globalThis.__raffleStageState.eventYear || globalThis.__raffleWheelSettings?.activeYear || 2026;
    const activeCode = eventCode || globalThis.__raffleStageState.eventCode || globalThis.__raffleWheelSettings?.activeEventCode;
    const next = await getNextAvailablePrize(activeLoc, activeYr, activeCode);
    
    // Automatically update stage state to the available prize and clear allPrizesClaimed
    globalThis.__raffleStageState.prizeName = next.prizeName;
    globalThis.__raffleStageState.prizeImagePath = next.prizeImagePath;
    globalThis.__raffleStageState.isGrand = next.isGrand;
    globalThis.__raffleStageState.grandPrizeId = next.grandPrizeId;
    globalThis.__raffleStageState.allPrizesClaimed = next.allPrizesClaimed;
    globalThis.__raffleStageState.reloadGuestsCount = (globalThis.__raffleStageState.reloadGuestsCount || 0) + 1;
    globalThis.__raffleStageState.timestamp = Date.now();
  } catch (err) {
    console.warn('Failed to auto-refresh wheel stage state after prize change:', err);
  }
}

// GET all prizes (with optional ?location=TAYUD&year=2026 filters)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const yearStr = searchParams.get('year');
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    const whereClause: Record<string, unknown> = {};
    if (location && location !== 'ALL') {
      whereClause.OR = [{ location }, { location: 'ALL' }];
    }
    if (year) {
      whereClause.eventYear = year;
    }

    const prizes = await prisma.prize.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { isGrandPrize: 'asc' },
        { id: 'desc' },
      ],
      include: {
        wonBy: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json({ prizes });
  } catch (error) {
    console.error('Failed to fetch prizes:', error);
    return NextResponse.json({ error: 'Failed to fetch prizes' }, { status: 500 });
  }
}

// POST: Add new prize with photo upload
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || null;
    const type = (formData.get('type') as string) || 'REGULAR';
    const isGrandPrize = formData.get('isGrandPrize') === 'true' || type === 'GRAND';
    const quantity = parseInt((formData.get('quantity') as string) || '1', 10);
    const priority = parseInt((formData.get('priority') as string) || '999', 10);
    const location = (formData.get('location') as string) || 'TAYUD';
    const eventYear = parseInt((formData.get('eventYear') as string) || '2026', 10);
    const photoFile = formData.get('photo') as File | null;

    if (!name) {
      return NextResponse.json({ error: 'Prize name is required' }, { status: 400 });
    }

    let imagePath: string | null = null;

    if (photoFile && photoFile.size > 0) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const processed = await processAndSavePhoto(buffer, `prize_${cleanName}`, 'prizes');
      imagePath = processed.imagePath;
    }

    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });
    const finalEventId = activeEvent ? activeEvent.id : undefined;
    const finalEventCode = activeEvent ? activeEvent.code : undefined;
    const finalEventYear = activeEvent ? activeEvent.year : eventYear;

    const prize = await prisma.prize.create({
      data: {
        name,
        description,
        type: isGrandPrize ? 'GRAND' : 'REGULAR',
        isGrandPrize,
        quantity,
        priority,
        location,
        eventYear: finalEventYear,
        eventId: finalEventId,
        eventCode: finalEventCode,
        imagePath,
      },
    });

    // Auto-refresh wheel stage state so newly added prizes wake up the stage immediately
    refreshWheelStageState(location, finalEventYear, finalEventCode);

    return NextResponse.json({ success: true, prize });
  } catch (error) {
    console.error('Failed to create prize:', error);
    return NextResponse.json({ error: 'Failed to create prize' }, { status: 500 });
  }
}

// PUT / PATCH: Update / Edit existing prize
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || null;
    const isGrandPrize = formData.get('isGrandPrize') === 'true';
    const quantity = parseInt((formData.get('quantity') as string) || '1', 10);
    const priority = formData.get('priority') !== null ? parseInt((formData.get('priority') as string) || '0', 10) : undefined;
    const location = (formData.get('location') as string) || undefined;
    const eventYearStr = formData.get('eventYear') as string;
    const eventYear = eventYearStr ? parseInt(eventYearStr, 10) : undefined;
    const isWon = formData.get('isWon') === 'true';
    const photoFile = formData.get('photo') as File | null;

    if (!id || !name) {
      return NextResponse.json({ error: 'Prize ID and name are required' }, { status: 400 });
    }

    let imagePath: string | undefined = undefined;

    if (photoFile && photoFile.size > 0) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const processed = await processAndSavePhoto(buffer, `prize_${cleanName}`, 'prizes');
      imagePath = processed.imagePath;
    }

    const updated = await prisma.prize.update({
      where: { id: parseInt(id, 10) },
      data: {
        name,
        description,
        quantity,
        ...(priority !== undefined ? { priority } : {}),
        isGrandPrize,
        type: isGrandPrize ? 'GRAND' : 'REGULAR',
        ...(location ? { location } : {}),
        ...(eventYear ? { eventYear } : {}),
        isWon,
        // If prize is marked un-won or given stock, detach prior winner records
        ...(!isWon && quantity > 0 ? { wonByGuestId: null, wonOn: null } : {}),
        ...(imagePath ? { imagePath } : {}),
      },
    });

    // Auto-refresh wheel stage state so edited prizes or un-won prizes wake up the stage immediately
    refreshWheelStageState(updated.location, updated.eventYear, updated.eventCode || undefined);

    return NextResponse.json({ success: true, prize: updated });
  } catch (error) {
    console.error('Failed to update prize:', error);
    return NextResponse.json({ error: 'Failed to update prize' }, { status: 500 });
  }
}

// DELETE: Remove prize OR batch clear by location/year
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, clearAll, location, eventYear } = body;

    if (clearAll) {
      // Clear prizes matching specific location and/or year
      const whereClause: Record<string, unknown> = {};
      if (location && location !== 'ALL') {
        whereClause.location = location;
      }
      if (eventYear) {
        whereClause.eventYear = parseInt(eventYear, 10);
      }

      const deleted = await prisma.prize.deleteMany({
        where: whereClause,
      });

      return NextResponse.json({ success: true, count: deleted.count });
    }

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.prize.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prize error:', error);
    return NextResponse.json({ error: 'Failed to delete prize' }, { status: 500 });
  }
}
