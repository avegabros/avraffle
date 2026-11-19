import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
  const info: Record<string, unknown> = {
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    arch: process.arch,
  };

  // Test sharp
  try {
    const sharp = (await import('sharp')).default;
    info.sharpLoaded = true;
    info.sharpVersions = sharp.versions;
    
    // Test generating a sample webp in memory
    const testBuffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    }).webp().toBuffer();
    info.sharpTransformSuccess = true;
    info.sharpTestBytes = testBuffer.length;
  } catch (err: unknown) {
    info.sharpError = String((err as Error)?.message || err);
    info.sharpStack = (err as Error)?.stack;
  }

  // Test directory creation & file writing in public/uploads/prizes
  try {
    const prizesDir = path.join(process.cwd(), 'public', 'uploads', 'prizes');
    info.prizesDir = prizesDir;
    await fs.mkdir(prizesDir, { recursive: true });
    info.mkdirSuccess = true;

    const testFile = path.join(prizesDir, `test_write_${Date.now()}.txt`);
    await fs.writeFile(testFile, 'write_test_ok');
    info.writeSuccess = true;
    await fs.unlink(testFile);
    info.unlinkSuccess = true;
  } catch (err: unknown) {
    info.fsError = String((err as Error)?.message || err);
    info.fsStack = (err as Error)?.stack;
  }

  return NextResponse.json(info);
}
