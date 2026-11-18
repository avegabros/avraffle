import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('av_admin_session')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: sessionCookie },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        location: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (err) {
    console.error('Session check error:', err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}

