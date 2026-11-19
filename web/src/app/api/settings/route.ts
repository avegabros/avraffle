import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

declare global {
  // eslint-disable-next-line no-var
  var __raffleWheelSettings: {
    duration: number;
    power: 'low' | 'medium' | 'high';
    fontSize: number;
    wheelSize: number;
    activeLocation: 'ALL' | 'TAYUD' | 'MAKATI';
    activeYear: number;
    activeEventCode?: string;
    activeEventName?: string;
    updatedAt: number;
  } | undefined;
}

// Flag to track whether DB settings have been loaded on startup
declare global {
  // eslint-disable-next-line no-var
  var __raffleWheelSettingsLoaded: boolean | undefined;
}

if (!globalThis.__raffleWheelSettings) {
  globalThis.__raffleWheelSettings = {
    duration: 8,
    power: 'high',
    fontSize: 13,
    wheelSize: 900,
    activeLocation: 'ALL',
    activeYear: 2026,
    activeEventCode: 'XMAS-2026',
    activeEventName: 'Christmas Party 2026',
    updatedAt: Date.now(),
  };
}

async function ensureSettingsLoaded() {
  if (globalThis.__raffleWheelSettingsLoaded) return;
  try {
    const dbSettings = await prisma.systemSetting.findMany();
    if (dbSettings && dbSettings.length > 0) {
      const map = new Map(dbSettings.map((s) => [s.key, s.value]));
      const current = globalThis.__raffleWheelSettings!;

      if (map.has('duration')) current.duration = parseInt(map.get('duration')!, 10);
      if (map.has('power')) current.power = map.get('power')! as any;
      if (map.has('fontSize')) current.fontSize = parseInt(map.get('fontSize')!, 10);
      if (map.has('wheelSize')) current.wheelSize = parseInt(map.get('wheelSize')!, 10);
      if (map.has('activeLocation')) current.activeLocation = map.get('activeLocation')! as any;
      if (map.has('activeYear')) current.activeYear = parseInt(map.get('activeYear')!, 10);
      if (map.has('activeEventCode')) current.activeEventCode = map.get('activeEventCode')!;
      if (map.has('activeEventName')) current.activeEventName = map.get('activeEventName')!;

      // Also sync activeLocation to __raffleStageState
      if (globalThis.__raffleStageState && current.activeLocation) {
        globalThis.__raffleStageState.location = current.activeLocation;
        globalThis.__raffleStageState.eventYear = current.activeYear;
        if (current.activeEventCode) globalThis.__raffleStageState.eventCode = current.activeEventCode;
      }
    }
    globalThis.__raffleWheelSettingsLoaded = true;
  } catch (err) {
    console.warn('Could not load settings from database:', err);
  }
}

export async function GET() {
  await ensureSettingsLoaded();

  return NextResponse.json({
    ...globalThis.__raffleWheelSettings,
    latestAppVersion: APP_VERSION.version,
    latestBuildNumber: APP_VERSION.buildNumber,
    latestAppTag: APP_VERSION.tag,
    apkDownloadUrl: `https://github.com/avegabros/avraffle/releases/download/${APP_VERSION.tag}/app-release.apk`,
    playStoreUrl: `https://play.google.com/store/apps/details?id=${APP_VERSION.package}`,
  });
}

export async function POST(req: NextRequest) {
  try {
    await ensureSettingsLoaded();
    const body = await req.json();
    const current = globalThis.__raffleWheelSettings!;

    if (body.duration !== undefined) current.duration = parseInt(body.duration, 10);
    if (body.power !== undefined) current.power = body.power;
    if (body.fontSize !== undefined) current.fontSize = parseInt(body.fontSize, 10);
    if (body.wheelSize !== undefined) current.wheelSize = parseInt(body.wheelSize, 10);
    if (body.activeLocation !== undefined) {
      current.activeLocation = body.activeLocation;
      if (globalThis.__raffleStageState) {
        globalThis.__raffleStageState.location = body.activeLocation;
        globalThis.__raffleStageState.reloadGuestsCount = (globalThis.__raffleStageState.reloadGuestsCount || 0) + 1;
        globalThis.__raffleStageState.timestamp = Date.now();
      }
    }
    if (body.activeYear !== undefined) {
      current.activeYear = parseInt(body.activeYear, 10);
      if (globalThis.__raffleStageState) {
        globalThis.__raffleStageState.eventYear = current.activeYear;
      }
    }
    if (body.activeEventCode !== undefined) {
      current.activeEventCode = body.activeEventCode;
      if (globalThis.__raffleStageState) {
        globalThis.__raffleStageState.eventCode = body.activeEventCode;
      }
    }
    if (body.activeEventName !== undefined) current.activeEventName = body.activeEventName;
    current.updatedAt = Date.now();

    // Persist asynchronously in background so response is sub-5ms instant
    const updates = [
      { key: 'duration', value: String(current.duration) },
      { key: 'power', value: String(current.power) },
      { key: 'fontSize', value: String(current.fontSize) },
      { key: 'wheelSize', value: String(current.wheelSize) },
      { key: 'activeLocation', value: current.activeLocation },
      { key: 'activeYear', value: String(current.activeYear) },
      { key: 'activeEventCode', value: current.activeEventCode || 'XMAS-2026' },
      { key: 'activeEventName', value: current.activeEventName || 'Christmas Party 2026' },
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
