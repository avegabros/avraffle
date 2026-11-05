import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

declare global {
  // eslint-disable-next-line no-var
  var __raffleWheelSettings: {
    duration: number;
    power: 'low' | 'medium' | 'high';
    fontSize: number;
    wheelSize: number;
    activeLocation: 'TAYUD' | 'MAKATI';
    activeYear: number;
    updatedAt: number;
  } | undefined;
}

if (!globalThis.__raffleWheelSettings) {
  globalThis.__raffleWheelSettings = {
    duration: 8,
    power: 'high',
    fontSize: 13,
    wheelSize: 900,
    activeLocation: 'TAYUD',
    activeYear: 2026,
    updatedAt: Date.now(),
  };
}

export async function GET() {
  return NextResponse.json(globalThis.__raffleWheelSettings);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = globalThis.__raffleWheelSettings!;

    if (body.duration !== undefined) current.duration = parseInt(body.duration, 10);
    if (body.power !== undefined) current.power = body.power;
    if (body.fontSize !== undefined) current.fontSize = parseInt(body.fontSize, 10);
    if (body.wheelSize !== undefined) current.wheelSize = parseInt(body.wheelSize, 10);
    if (body.activeLocation !== undefined) current.activeLocation = body.activeLocation;
    if (body.activeYear !== undefined) current.activeYear = parseInt(body.activeYear, 10);
    current.updatedAt = Date.now();

    // Persist asynchronously in background so response is sub-5ms instant
    const updates = [
      { key: 'duration', value: String(current.duration) },
      { key: 'power', value: String(current.power) },
      { key: 'fontSize', value: String(current.fontSize) },
      { key: 'wheelSize', value: String(current.wheelSize) },
      { key: 'activeLocation', value: current.activeLocation },
      { key: 'activeYear', value: String(current.activeYear) },
    ];

    Promise.all(
      updates.map((item) =>
        prisma.systemSetting.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: { key: item.key, value: item.value },
        })
      )
    ).catch(console.error);

    return NextResponse.json({ success: true, settings: current });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
