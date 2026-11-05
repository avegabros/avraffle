import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// POST: Archive current database state to /data/winners/[year].json and reset for new year
export async function POST(req: NextRequest) {
  try {
    const { year = 2025 } = await req.json();

    // 1. Fetch current winners & prizes to archive
    const [winners, currentPrizes] = await Promise.all([
      prisma.guest.findMany({
        where: { isWinner: true },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          department: true,
          position: true,
          prizeWon: true,
          winOn: true,
          imagePath: true,
          thumbPath: true,
        },
        orderBy: { winOn: 'desc' },
      }),
      prisma.prize.findMany({
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
    const archiveDir = path.join(process.cwd(), 'public', 'winners', String(year));
    fs.mkdirSync(archiveDir, { recursive: true });

    const archiveData = winners.map((w) => ({
      id: w.id,
      employeeId: w.employeeId,
      fullName: `${w.firstName} ${w.lastName}`,
      department: w.department,
      position: w.position,
      prize: w.prizeWon || 'Regular Prize',
      winOn: w.winOn ? w.winOn.toISOString() : new Date().toISOString(),
      avatar: w.thumbPath || w.imagePath || null,
    }));

    fs.writeFileSync(path.join(archiveDir, 'data.json'), JSON.stringify(archiveData, null, 2));

    // Archive 2025 prizes catalog as well
    fs.writeFileSync(path.join(archiveDir, 'prizes.json'), JSON.stringify(currentPrizes, null, 2));

    // 3. Reset the slate for 2026:
    // Reset guest attendance & wheel flags
    await prisma.guest.updateMany({
      data: {
        isRegistered: false,
        inWheel: false,
        isWinner: false,
        winOn: null,
        prizeWon: null,
      },
    });

    // Delete all old prizes so Prizes Team starts with a 100% clean slate for 2026!
    const deletedPrizes = await prisma.prize.deleteMany();

    return NextResponse.json({
      success: true,
      archivedCount: winners.length,
      deletedPrizesCount: deletedPrizes.count,
      year,
      archiveUrl: `/winners/${year}/data.json`,
      message: `Archived ${winners.length} winners to Year ${year}, cleared ${deletedPrizes.count} old prizes, and reset the system for 2026!`,
    });
  } catch (error) {
    console.error('Archive error:', error);
    return NextResponse.json({ error: 'Failed to archive and reset system' }, { status: 500 });
  }
}
