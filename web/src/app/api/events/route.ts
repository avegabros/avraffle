import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: [{ year: 'desc' }, { id: 'desc' }],
      include: {
        _count: {
          select: {
            guests: true,
            prizes: true,
          },
        },
      },
    });

    const activeEvent = events.find((e) => e.isActive) || null;

    return NextResponse.json({
      events,
      activeEvent,
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action: Set Active Event
    if (action === 'set_active') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
      }

      const target = await prisma.event.findUnique({ where: { id: parseInt(String(id), 10) } });
      if (!target) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.event.updateMany({ data: { isActive: false } }),
        prisma.event.update({ where: { id: target.id }, data: { isActive: true } }),
      ]);

      // Update in-memory wheel settings & system settings
      if (globalThis.__raffleWheelSettings) {
        globalThis.__raffleWheelSettings.activeYear = target.year;
        globalThis.__raffleWheelSettings.activeEventCode = target.code;
        globalThis.__raffleWheelSettings.activeEventName = target.name;
        globalThis.__raffleWheelSettings.updatedAt = Date.now();
      }

      await Promise.all([
        prisma.systemSetting.upsert({
          where: { key: 'activeYear' },
          update: { value: String(target.year) },
          create: { key: 'activeYear', value: String(target.year) },
        }),
        prisma.systemSetting.upsert({
          where: { key: 'activeEventCode' },
          update: { value: target.code },
          create: { key: 'activeEventCode', value: target.code },
        }),
        prisma.systemSetting.upsert({
          where: { key: 'activeEventName' },
          update: { value: target.name },
          create: { key: 'activeEventName', value: target.name },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Activated event "${target.name}" (${target.code})`,
        activeEvent: target,
      });
    }

    // Action: Create Event
    if (action === 'create' || !action) {
      const { name, code, year, description, isActive } = body;
      if (!name || !code) {
        return NextResponse.json({ error: 'Event name and code are required' }, { status: 400 });
      }

      const cleanCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
      const cleanYear = year ? parseInt(String(year), 10) : new Date().getFullYear();

      // If active is true, deactivate others
      if (isActive) {
        await prisma.event.updateMany({ data: { isActive: false } });
      }

      const newEvent = await prisma.event.create({
        data: {
          name: String(name).trim(),
          code: cleanCode,
          year: cleanYear,
          description: description ? String(description).trim() : null,
          isActive: Boolean(isActive),
        },
      });

      if (isActive && globalThis.__raffleWheelSettings) {
        globalThis.__raffleWheelSettings.activeYear = cleanYear;
        globalThis.__raffleWheelSettings.activeEventCode = cleanCode;
        globalThis.__raffleWheelSettings.activeEventName = newEvent.name;
        globalThis.__raffleWheelSettings.updatedAt = Date.now();
      }

      return NextResponse.json({
        success: true,
        event: newEvent,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Event save error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Event code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to process event request' }, { status: 500 });
  }
}

