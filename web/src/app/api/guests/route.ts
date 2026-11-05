import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processAndSavePhoto } from '@/lib/sharp';

// GET all guests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const yearStr = searchParams.get('year') || '';

    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { employeeId: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      });
    }

    if (location && location !== 'ALL') {
      conditions.push({
        OR: [{ location }, { location: 'ALL' }],
      });
    }

    if (yearStr) {
      conditions.push({ eventYear: parseInt(yearStr, 10) });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 1000,
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}

// POST: Register or Check-in a guest with photo upload
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const employeeId = formData.get('employeeId') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const department = (formData.get('department') as string) || null;
    const assigned = (formData.get('assigned') as string) || null;
    const location = (formData.get('location') as string) || 'TAYUD';
    const eventYear = parseInt((formData.get('eventYear') as string) || '2026', 10);
    const photoFile = formData.get('photo') as File | null;

    if (!employeeId || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Employee ID, First Name, and Last Name are required' },
        { status: 400 }
      );
    }

    let imagePath: string | null = null;
    let thumbPath: string | null = null;

    if (photoFile && photoFile.size > 0) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const processed = await processAndSavePhoto(buffer, employeeId, String(eventYear));
      imagePath = processed.imagePath;
      thumbPath = processed.thumbPath;
    }

    const guest = await prisma.guest.upsert({
      where: { employeeId },
      update: {
        firstName,
        lastName,
        department,
        assigned,
        location,
        eventYear,
        isRegistered: true,
        inWheel: true,
        ...(imagePath ? { imagePath, thumbPath } : {}),
      },
      create: {
        employeeId,
        firstName,
        lastName,
        department,
        assigned,
        location,
        eventYear,
        isRegistered: true,
        inWheel: true,
        imagePath,
        thumbPath,
      },
    });

    return NextResponse.json({ success: true, guest });
  } catch (error) {
    console.error('Registration/Check-in error:', error);
    return NextResponse.json({ error: 'Failed to register guest' }, { status: 500 });
  }
}
