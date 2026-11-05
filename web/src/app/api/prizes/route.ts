import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processAndSavePhoto } from '@/lib/sharp';

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
        { isGrandPrize: 'desc' },
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

    const prize = await prisma.prize.create({
      data: {
        name,
        description,
        type: isGrandPrize ? 'GRAND' : 'REGULAR',
        isGrandPrize,
        quantity,
        location,
        eventYear,
        imagePath,
      },
    });

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
        isGrandPrize,
        type: isGrandPrize ? 'GRAND' : 'REGULAR',
        ...(location ? { location } : {}),
        ...(eventYear ? { eventYear } : {}),
        isWon,
        ...(imagePath ? { imagePath } : {}),
      },
    });

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
