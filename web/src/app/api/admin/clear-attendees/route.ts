import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Return current count of attendees in database
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get('year');
    const eventYear = yearStr ? parseInt(yearStr, 10) : undefined;

    const count = await prisma.guest.count({
      where: eventYear ? { eventYear } : undefined,
    });

    return NextResponse.json({ count, eventYear });
  } catch (error) {
    console.error('Error getting guest count:', error);
    return NextResponse.json({ error: 'Failed to retrieve attendee count' }, { status: 500 });
  }
}

// POST: Safely clear/delete all guests (or for a specific year)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventYear = body.year ? parseInt(String(body.year), 10) : undefined;

    // 1. Unlink any prizes that were won by guests being deleted to preserve foreign key integrity
    if (eventYear) {
      const guestIds = (
        await prisma.guest.findMany({
          where: { eventYear },
          select: { id: true },
        })
      ).map((g) => g.id);

      if (guestIds.length > 0) {
        await prisma.prize.updateMany({
          where: { wonByGuestId: { in: guestIds } },
          data: { wonByGuestId: null, isWon: false, wonOn: null },
        });
      }
    } else {
      await prisma.prize.updateMany({
        data: { wonByGuestId: null, isWon: false, wonOn: null },
      });
    }

    // 2. Delete the guests
    const deleted = await prisma.guest.deleteMany({
      where: eventYear ? { eventYear } : undefined,
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
      message: `Successfully deleted ${deleted.count} attendees from database${
        eventYear ? ` for year ${eventYear}` : ''
      }.`,
    });
  } catch (error) {
    console.error('Error clearing attendees:', error);
    return NextResponse.json(
      { error: 'Failed to clear attendees database' },
      { status: 500 }
    );
  }
}
