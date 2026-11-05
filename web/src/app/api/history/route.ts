import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location'); // TAYUD, MAKATI, ALL
    const requestedYear = searchParams.get('year') || '2026';
    const isLiveYear = requestedYear === '2026';

    const winnersDir = path.join(process.cwd(), 'public', 'winners');
    const diskYears = fs.existsSync(winnersDir)
      ? fs
          .readdirSync(winnersDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];

    // Ensure 2026 (current live event year) is always in available years
    const availableYears = Array.from(new Set(['2026', ...diskYears])).sort((a, b) => b.localeCompare(a));

    let winners: any[] = [];

    if (isLiveYear) {
      // Query LIVE database winners for 2026
      const whereClause: Record<string, unknown> = {
        isWinner: true,
        eventYear: 2026,
      };
      if (location && location !== 'ALL') {
        whereClause.location = location;
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
        },
      });

      winners = liveWinners.map((w) => ({
        id: w.id,
        employeeId: w.employeeId,
        fullName: `${w.firstName} ${w.lastName}`,
        department: w.department,
        position: w.position,
        location: w.location,
        prize: w.prizeWon || 'Raffle Prize',
        winOn: w.winOn ? w.winOn.toISOString() : new Date().toISOString(),
        avatar: w.imagePath || w.thumbPath || null,
      }));
    } else {
      // Query archived disk records for past years (2025, etc.)
      const jsonPath = path.join(winnersDir, requestedYear, 'data.json');
      if (fs.existsSync(jsonPath)) {
        winners = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (location && location !== 'ALL') {
          winners = winners.filter((w) => !w.location || w.location === location);
        }
      }
    }

    return NextResponse.json({
      year: requestedYear,
      location: location || 'ALL',
      availableYears,
      winners,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
