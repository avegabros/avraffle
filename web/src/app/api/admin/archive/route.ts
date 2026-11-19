import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// POST: Archive an event's winners & prizes to static JSON and mark event archived
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventCode, year, resetAttendees = false, clearPrizes = false } = body;

    // Find the event
    let targetEvent = null;
    if (eventCode) {
      targetEvent = await prisma.event.findUnique({ where: { code: eventCode } });
    }
    if (!targetEvent && year) {
      targetEvent = await prisma.event.findFirst({ where: { year: parseInt(String(year), 10) } });
    }

    const archiveKey = targetEvent ? targetEvent.code : String(year || 2025);
    const archiveYear = targetEvent ? targetEvent.year : parseInt(String(year || 2025), 10);

    // 1. Fetch winners & prizes for this event/year
    const guestWhere: any = { isWinner: true };
    const prizeWhere: any = {};

    if (targetEvent) {
      guestWhere.OR = [
        { eventId: targetEvent.id },
        { eventCode: targetEvent.code },
        { eventCode: null, eventYear: targetEvent.year },
      ];
      prizeWhere.OR = [
        { eventId: targetEvent.id },
        { eventCode: targetEvent.code },
        { eventCode: null, eventYear: targetEvent.year },
      ];
    } else {
      guestWhere.eventYear = archiveYear;
      prizeWhere.eventYear = archiveYear;
    }

    const [winners, currentPrizes] = await Promise.all([
      prisma.guest.findMany({
        where: guestWhere,
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
        },
        orderBy: { winOn: 'desc' },
      }),
      prisma.prize.findMany({
        where: prizeWhere,
        include: {
          wonBy: {
            select: {
              employeeId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    // 2. Export winners & prizes to public static JSON archive
    // Write to both event code folder and year folder for complete compatibility
    const archiveDirs = [
      path.join(process.cwd(), 'public', 'winners', archiveKey),
      path.join(process.cwd(), 'public', 'winners', String(archiveYear)),
    ];

    const archiveData = winners.map((w) => ({
      id: w.id,
      employeeId: w.employeeId,
      fullName: `${w.firstName} ${w.lastName}`,
      department: w.department,
      position: w.position,
      location: w.location,
      prize: w.prizeWon || 'Regular Prize',
      winOn: w.winOn ? w.winOn.toISOString() : new Date().toISOString(),
      avatar: w.thumbPath || w.imagePath || null,
    }));

    for (const dir of archiveDirs) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(archiveData, null, 2));
      fs.writeFileSync(path.join(dir, 'prizes.json'), JSON.stringify(currentPrizes, null, 2));
    }

    // 3. Mark event as archived if matched
    if (targetEvent) {
      await prisma.event.update({
        where: { id: targetEvent.id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          isActive: false,
        },
      });
    }

    // 4. Optionally reset attendees or prizes if explicitly requested
    let resetCount = 0;
    if (resetAttendees) {
      const res = await prisma.guest.updateMany({
        where: targetEvent ? { eventId: targetEvent.id } : { eventYear: archiveYear },
        data: {
          isRegistered: false,
          inWheel: false,
          isWinner: false,
          winOn: null,
          prizeWon: null,
        },
      });
      resetCount = res.count;
    }

    let deletedPrizesCount = 0;
    if (clearPrizes) {
      const res = await prisma.prize.deleteMany({
        where: targetEvent ? { eventId: targetEvent.id } : { eventYear: archiveYear },
      });
      deletedPrizesCount = res.count;
    }

    const eventDisplayName = targetEvent ? `"${targetEvent.name}" (${targetEvent.code})` : `Year ${archiveYear}`;

    return NextResponse.json({
      success: true,
      eventCode: archiveKey,
      year: archiveYear,
      archivedCount: winners.length,
      resetGuestsCount: resetCount,
      deletedPrizesCount,
      archiveUrl: `/winners/${archiveKey}/data.json`,
      message: `Archived ${winners.length} winners for ${eventDisplayName} to static archive.`,
    });
  } catch (error) {
    console.error('Archive error:', error);
    return NextResponse.json({ error: 'Failed to archive event' }, { status: 500 });
  }
}
