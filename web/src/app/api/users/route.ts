import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        location: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST create new user
export async function POST(req: NextRequest) {
  try {
    const { username, password, name, role, location } = await req.json();

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        name,
        passwordHash,
        role: role || 'ADMIN',
        location: location || 'TAYUD',
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        location: user.location,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT / PATCH: Edit user details, reset password, change role / status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, username, role, location, isActive, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (name) dataToUpdate.name = name;
    if (username) {
      // Check if username taken by another user
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Username is already taken by another account' }, { status: 400 });
      }
      dataToUpdate.username = username;
    }
    if (role) dataToUpdate.role = role;
    if (location) dataToUpdate.location = location;
    if (typeof isActive === 'boolean') dataToUpdate.isActive = isActive;

    if (password && password.trim().length > 0) {
      dataToUpdate.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        location: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Delete user account
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    // Safety: ensure at least one superadmin/admin remains
    const totalUsers = await prisma.user.count();
    if (totalUsers <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last remaining user account' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
